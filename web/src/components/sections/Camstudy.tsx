"use client";

import { useEffect, useRef, useState } from "react";
import { SegTabs } from "@/components/ui/SegTabs";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "@/components/camstudy/HandwritingCanvas";

const INTERVALS = [5, 10, 15, 30];
const PEN_COLORS = [
  { c: "#e0362f", label: "빨강" },
  { c: "#161616", label: "검정" },
  { c: "#003ce0", label: "파랑" },
];

function fmtTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface TimelineEntry {
  id: string;
  time: string;
  end: string;
  dur: string | null;
  subject: string | null;
  title: string | null;
  photoUrls: string[];
  hasMemo: boolean;
  memoUrl: string | null;
}

interface TodoOption {
  id: string;
  subject: string;
  title: string;
}

export function Camstudy() {
  const [tab, setTab] = useState<"live" | "timeline">("live");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [interval, setIntervalMin] = useState(10);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [previewOn, setPreviewOn] = useState(false);
  const [todos, setTodos] = useState<TodoOption[]>([]);
  const [currentTodoId, setCurrentTodoId] = useState("");
  const [todaySummary, setTodaySummary] = useState({ sessionsToday: 0, totalSeconds: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const secondsRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCaptureRef = useRef<Date | null>(null);
  const [pipActive, setPipActive] = useState(false);
  const [pipNote, setPipNote] = useState<string | null>(null);
  const runningRef = useRef(false);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipDrawRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    fetch("/api/todos?range=today")
      .then((r) => r.json())
      .then((d) => setTodos(d.todos.map((t: { id: string; subject: string; title: string }) => ({ id: t.id, subject: t.subject, title: t.title }))));
    fetch("/api/camstudy/session")
      .then((r) => r.json())
      .then(setTodaySummary);
  }, []);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (captureRef.current) clearInterval(captureRef.current);
      if (pipDrawRef.current) clearInterval(pipDrawRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      wakeLockRef.current?.release().catch(() => {});
      if (typeof document !== "undefined" && document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    },
    []
  );

  // List available webcams (labels appear only after camera permission is
  // granted) and keep the list fresh as devices are plugged/unplugged.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    const refresh = () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((list) => setVideoDevices(list.filter((d) => d.kind === "videoinput")))
        .catch(() => {});
    };
    refresh();
    navigator.mediaDevices.addEventListener?.("devicechange", refresh);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", refresh);
  }, []);

  function videoConstraints(id: string): MediaStreamConstraints {
    return { video: id ? { deviceId: { exact: id } } : true, audio: false };
  }

  // Open the given camera into the preview <video>, stopping any current stream.
  // Refreshes the device list (labels become available once permission is given)
  // and syncs the selected id to the camera that actually opened.
  async function acquireStream(id: string): Promise<MediaStream> {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const stream = await navigator.mediaDevices.getUserMedia(videoConstraints(id));
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
    const actualId = stream.getVideoTracks()[0]?.getSettings().deviceId;
    if (actualId) setDeviceId(actualId);
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) => setVideoDevices(list.filter((d) => d.kind === "videoinput")))
      .catch(() => {});
    return stream;
  }

  async function startPreview() {
    setCameraError(null);
    try {
      await acquireStream(deviceId);
      setPreviewOn(true);
    } catch {
      setCameraError("웹캠에 접근할 수 없어요. 브라우저 권한을 확인해 주세요.");
    }
  }

  async function changeDevice(id: string) {
    setDeviceId(id);
    if (!running && !previewOn) return;
    setCameraError(null);
    try {
      await acquireStream(id);
    } catch {
      setCameraError("선택한 웹캠을 켤 수 없어요. 다른 카메라를 선택해 주세요.");
    }
  }

  // Picture-in-Picture: composite the live camera + the running timer onto a
  // canvas, stream that into a hidden <video>, and float it as a PiP window so
  // the clock and camera stay visible after the user switches tabs/apps.
  function drawPipFrame() {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#161616";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const video = videoRef.current;
    if (video && video.videoWidth) {
      const cw = canvas.width;
      const ch = canvas.height;
      const vr = video.videoWidth / video.videoHeight;
      let dw = cw;
      let dh = ch;
      if (vr > cw / ch) {
        dh = ch;
        dw = ch * vr;
      } else {
        dw = cw;
        dh = cw / vr;
      }
      ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }
    // Timer bar
    const barH = Math.round(canvas.height * 0.2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(barH * 0.5)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText(fmtTime(secondsRef.current), canvas.width / 2, canvas.height - barH / 2);
  }

  // Set up (once per session) the canvas→hidden-<video> pipeline and start it
  // playing, so the PiP button click can call requestPictureInPicture()
  // immediately — awaiting play() first would consume the click's user
  // activation and the browser would reject PiP.
  function ensurePipStream() {
    const pv = pipVideoRef.current;
    if (!pv) return;
    let canvas = pipCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 360;
      pipCanvasRef.current = canvas;
    }
    drawPipFrame();
    // 500ms when visible; browsers clamp to ~1s while hidden — fine for a clock.
    if (!pipDrawRef.current) pipDrawRef.current = setInterval(drawPipFrame, 500);
    if (!pv.srcObject) {
      pv.srcObject = canvas.captureStream(10);
      pv.play().catch(() => {});
    }
  }

  // iOS/iPadOS uses WebKit's presentation-mode API (not the standard PiP one),
  // shows only a plain <video> (no canvas compositing → no timer overlay), and
  // is blocked entirely inside a Home-Screen web app. Best-effort: PiP the raw
  // camera when the WebKit API is actually available (Safari browser only).
  function iosPipTry(): boolean {
    const v = videoRef.current as (HTMLVideoElement & {
      webkitSupportsPresentationMode?: (m: string) => boolean;
      webkitSetPresentationMode?: (m: string) => void;
    }) | null;
    if (v?.webkitSupportsPresentationMode?.("picture-in-picture")) {
      try {
        v.webkitSetPresentationMode!("picture-in-picture");
        setPipActive(true);
        return true;
      } catch {
        /* fall through */
      }
    }
    return false;
  }

  async function enterPip() {
    setPipNote(null);
    const pv = pipVideoRef.current;
    if (typeof document !== "undefined" && document.pictureInPictureEnabled && pv && !document.pictureInPictureElement) {
      ensurePipStream();
      try {
        // Fast path: stream already playing (set up when the session started) —
        // this is the first await, so the click's user activation is intact.
        await pv.requestPictureInPicture();
        setPipActive(true);
        return;
      } catch {
        try {
          await pv.play();
          await pv.requestPictureInPicture();
          setPipActive(true);
          return;
        } catch {
          /* fall through to platform fallbacks */
        }
      }
    }
    // iOS Safari (browser) fallback — camera only, no timer overlay.
    if (iosPipTry()) return;
    // No PiP available (most commonly an iPad Home-Screen web app).
    setPipActive(false);
    const isIOS =
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints: number }).maxTouchPoints > 1));
    setPipNote(
      isIOS
        ? "아이패드 홈 화면 앱에서는 애플 제약으로 PiP를 쓸 수 없어요. ① Split View로 이 앱을 다른 앱과 나란히 두거나 ② Safari로 열면 카메라 PiP가 됩니다. 화면은 자동으로 꺼지지 않게 해뒀어요."
        : "이 브라우저에서는 PiP를 쓸 수 없어요. (Chrome·Edge·데스크톱 Safari 최신 버전 권장)"
    );
  }

  async function exitPip() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
    } catch {
      /* ignore */
    }
    const v = videoRef.current as (HTMLVideoElement & { webkitSetPresentationMode?: (m: string) => void }) | null;
    try {
      v?.webkitSetPresentationMode?.("inline");
    } catch {
      /* ignore */
    }
    setPipActive(false);
  }

  // Keep the screen awake during a session — the practical stand-in for PiP on
  // iPad Home-Screen apps, where the screen would otherwise dim/lock.
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* not supported / denied — ignore */
    }
  }
  function releaseWakeLock() {
    try {
      wakeLockRef.current?.release();
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null;
  }

  // Keep the PiP pipeline ready while a session runs; tear it down when it ends.
  useEffect(() => {
    if (running) {
      ensurePipStream();
      return;
    }
    if (pipDrawRef.current) {
      clearInterval(pipDrawRef.current);
      pipDrawRef.current = null;
    }
    const pv = pipVideoRef.current;
    if (pv?.srcObject) {
      (pv.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      pv.srcObject = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Reflect the browser's own PiP close button back into our state.
  useEffect(() => {
    const pv = pipVideoRef.current;
    if (!pv) return;
    const onLeave = () => setPipActive(false);
    pv.addEventListener("leavepictureinpicture", onLeave);
    return () => pv.removeEventListener("leavepictureinpicture", onLeave);
  }, []);

  // Best-effort: pop PiP when the page is hidden during a session (some
  // browsers block auto-PiP without a prior click — the PiP button covers that).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (runningRef.current) enterPip();
      } else {
        exitPip();
        // Wake locks are released when the page hides; re-acquire on return.
        if (runningRef.current) requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function capture(sessionId: string) {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const photoUrl = canvas.toDataURL("image/jpeg", 0.7);
    const segmentStart = lastCaptureRef.current || new Date(Date.now() - interval * 60000);
    lastCaptureRef.current = new Date();
    const todo = todos.find((t) => t.id === currentTodoId);
    await fetch("/api/camstudy/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camSessionId: sessionId,
        subject: todo?.subject,
        todoTitle: todo?.title,
        durationLabel: `${interval}분`,
        photoUrls: [photoUrl],
        segmentStart: segmentStart.toISOString(),
      }),
    });
  }

  async function start() {
    setCameraError(null);
    try {
      // Reuse the live preview stream when it's already the selected camera;
      // otherwise open the selected camera now.
      const current = streamRef.current?.getVideoTracks()[0];
      const currentId = current?.getSettings().deviceId;
      if (!streamRef.current || (deviceId && currentId !== deviceId)) {
        await acquireStream(deviceId);
      }
    } catch {
      setCameraError("웹캠에 접근할 수 없어요. 브라우저 권한을 확인해 주세요.");
      return;
    }
    setPreviewOn(false);

    const res = await fetch("/api/camstudy/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervalMinutes: interval }),
    });
    const data = await res.json();
    sessionIdRef.current = data.id;
    lastCaptureRef.current = new Date();

    secondsRef.current = 0;
    setSeconds(0);
    setRunning(true);
    runningRef.current = true;
    requestWakeLock();
    tickRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    captureRef.current = setInterval(() => {
      if (sessionIdRef.current) capture(sessionIdRef.current);
    }, interval * 60000);
  }

  async function stop() {
    if (tickRef.current) clearInterval(tickRef.current);
    if (captureRef.current) clearInterval(captureRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    runningRef.current = false;
    await exitPip();
    releaseWakeLock();
    setPipNote(null);
    setRunning(false);
    setPreviewOn(false);
    if (sessionIdRef.current) {
      await fetch(`/api/camstudy/session/${sessionIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalSeconds: secondsRef.current }),
      });
      sessionIdRef.current = null;
    }
    fetch("/api/camstudy/session")
      .then((r) => r.json())
      .then(setTodaySummary);
  }

  return (
    <div>
      <SegTabs
        tabs={[
          { id: "live" as const, label: "진행" },
          { id: "timeline" as const, label: "학습 타임라인" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "live" ? (
        <div>
          <div className="relative mt-7 flex aspect-video w-full items-center justify-center overflow-hidden border border-[#16161614] bg-[repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4_10px,#efefef_10px,#efefef_20px)]">
            <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{ display: running || previewOn ? "block" : "none" }} />
            {running && (
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 rounded-[2px] bg-[#161616] px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-white" />
                <span className="text-[13px] font-medium text-white">REC</span>
              </div>
            )}
            {running && (
              <button
                onClick={() => (pipActive ? exitPip() : enterPip())}
                className="absolute top-3.5 right-3.5 rounded-[2px] bg-[#161616]/80 px-2.5 py-1 text-[13px] font-medium text-white"
              >
                {pipActive ? "PiP 끄기" : "PiP"}
              </button>
            )}
            {/* Off-screen sink for the composited camera+timer PiP stream.
                Not display:none — some browsers refuse PiP on hidden video. */}
            <video ref={pipVideoRef} muted playsInline autoPlay className="pointer-events-none absolute h-px w-px opacity-0" />
            {previewOn && !running && (
              <div className="absolute top-3.5 left-3.5 rounded-[2px] bg-[#161616]/80 px-2.5 py-1 text-[13px] font-medium text-white">미리보기</div>
            )}
            {!running && !previewOn && <span className="font-mono text-[13px] text-[#161616]/40">웹캠 미리보기</span>}
            <p className="absolute right-0 bottom-4 left-0 m-0 text-center font-mono text-[32px] font-light tracking-[0.04em] text-[#161616] lg:text-[44px]">
              {fmtTime(seconds)}
            </p>
          </div>

          {cameraError && <p className="m-0 py-2 text-center text-[13px] text-[#e0362f]">{cameraError}</p>}
          {pipNote && (
            <div className="mt-3 flex items-start gap-2 rounded-[2px] border border-[#16161614] bg-[#f4f4f4] px-3 py-2.5">
              <p className="m-0 text-[12px] leading-5 text-[#161616]/70">{pipNote}</p>
              <button
                onClick={() => setPipNote(null)}
                aria-label="닫기"
                className="ml-auto flex-none border-none bg-transparent p-0 text-[14px] text-[#161616]/40"
              >
                ×
              </button>
            </div>
          )}
          <p className="m-0 py-3.5 text-center text-[13px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">
            {running ? `녹화 중 · ${interval}분마다 자동 촬영` : "웹캠을 선택하고 학습을 시작하세요"}
          </p>

          {!running && (
            <div className="mb-5">
              <p className="m-0 mb-2.5 text-[14px] leading-6 font-semibold text-[#161616]">웹캠 선택</p>
              <div className="flex gap-2">
                <select
                  value={deviceId}
                  onChange={(e) => changeDevice(e.target.value)}
                  className="min-w-0 flex-1 border border-[#16161614] bg-transparent px-3 py-2.5 text-[15px] text-[#161616] outline-none"
                >
                  {videoDevices.length === 0 && <option value="">기본 웹캠</option>}
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `카메라 ${i + 1}`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={startPreview}
                  className="flex-none rounded-[2px] border border-[#161616] bg-white px-4 py-2.5 text-[14px] font-medium text-[#161616]"
                >
                  {previewOn ? "다시 켜기" : "미리보기"}
                </button>
              </div>
              {videoDevices.every((d) => !d.label) && (
                <p className="m-0 mt-2 text-[12px] leading-5 text-[#161616]/45">
                  카메라 이름이 안 보이면 <span className="font-medium text-[#161616]/70">미리보기</span>를 눌러 권한을 허용해 주세요.
                </p>
              )}
            </div>
          )}

          {!running && todos.length > 0 && (
            <div className="mb-5">
              <p className="m-0 mb-2.5 text-[14px] leading-6 font-semibold text-[#161616]">지금 학습 중인 투두 (선택)</p>
              <select
                value={currentTodoId}
                onChange={(e) => setCurrentTodoId(e.target.value)}
                className="w-full border border-[#16161614] bg-transparent px-3 py-2.5 text-[15px] text-[#161616] outline-none"
              >
                <option value="">선택 안 함</option>
                {todos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.subject} · {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="m-0 mb-2.5 text-[14px] leading-6 font-semibold text-[#161616]">자동 촬영 간격</p>
          <div className="mb-5 flex w-full">
            {INTERVALS.map((n, i) => (
              <button
                key={n}
                disabled={running}
                onClick={() => setIntervalMin(n)}
                className={`flex-1 border border-[#16161614] py-2.5 text-center text-[13px] lg:text-[14px] ${i !== 0 ? "-ml-px" : ""} ${
                  interval === n ? "bg-[#161616] text-white" : "bg-white text-[#161616]/50"
                }`}
              >
                {n}분
              </button>
            ))}
          </div>
          <button
            onClick={running ? stop : start}
            className={`w-full rounded-[2px] py-4 text-[16px] font-semibold ${
              running ? "border border-[#161616] bg-white text-[#161616]" : "border-none bg-[#161616] text-white"
            }`}
          >
            {running ? "캠스터디 종료" : "캠스터디 시작"}
          </button>

          <div className="mt-9 grid grid-cols-2 border-t border-[#16161614]">
            <div className="py-5 pr-5">
              <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">오늘 학습시간</p>
              <p className="m-0 text-[22px] leading-8 font-light text-[#161616] lg:text-[24px]">{fmtTime(todaySummary.totalSeconds)}</p>
            </div>
            <div className="border-l border-[#16161614] py-5 pl-5">
              <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">오늘 세션</p>
              <p className="m-0 text-[22px] leading-8 font-light text-[#161616] lg:text-[24px]">{todaySummary.sessionsToday}회</p>
            </div>
          </div>
        </div>
      ) : (
        <TimelineView todos={todos} />
      )}
    </div>
  );
}

function TimelineView({ todos }: { todos: TodoOption[] }) {
  const [viewDate, setViewDate] = useState(todayIso());
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [memoEntry, setMemoEntry] = useState<TimelineEntry | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  function load() {
    fetch(`/api/camstudy/timeline?date=${viewDate}`)
      .then((r) => r.json())
      .then(setEntries);
  }
  useEffect(load, [viewDate]);

  async function deleteEntry(id: string) {
    if (!window.confirm("이 학습 인증 기록을 삭제할까요?")) return;
    await fetch(`/api/camstudy/timeline/${id}`, { method: "DELETE" });
    load();
  }

  const isToday = viewDate === todayIso();
  const totalLabel = entries.length ? `${entries.length}회` : "0회";

  return (
    <div>
      <div className="flex items-center gap-2.5 pt-8 lg:pt-10">
        <button onClick={() => setViewDate((d) => shiftIso(d, -1))} aria-label="전날" className="border-none bg-none p-1 text-[16px] text-[#161616]/50">
          ‹
        </button>
        <p className="m-0 text-[15px] leading-6 text-[#161616]/60 lg:text-[16px]">{viewDate}</p>
        <button onClick={() => setViewDate((d) => shiftIso(d, 1))} aria-label="다음날" className="border-none bg-none p-1 text-[16px] text-[#161616]/50">
          ›
        </button>
        {!isToday && (
          <button onClick={() => setViewDate(todayIso())} className="border-none bg-none p-0 text-[13px] text-[#003ce0] underline underline-offset-[3px]">
            오늘로
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-2 pb-4 lg:pb-5">
        <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">{isToday ? "오늘 학습 인증" : "학습 인증"}</p>
        <div className="flex items-center gap-3">
          <button onClick={() => setUploadOpen(true)} className="border-none bg-none p-0 text-[14px] text-[#161616] underline underline-offset-[3px] lg:text-[16px]">
            + 사진으로 인증 추가
          </button>
          <p className="m-0 text-[13px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">{totalLabel}</p>
        </div>
      </div>

      <div className="pt-3">
        {entries.map((e) => (
          <div key={e.id} className="flex gap-4 lg:gap-5">
            <div className="flex w-12 flex-none flex-col items-center pt-5 lg:w-16">
              <span className="font-mono text-[13px] text-[#161616] lg:text-[14px]">{e.time}</span>
              <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#161616]" />
              <span className="mt-1.5 min-h-5 w-px flex-1 bg-[#16161614]" />
            </div>
            <div className="min-w-0 flex-1 py-4 pb-7 lg:py-6">
              <div className="flex flex-col border border-[#16161614] lg:flex-row">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4_9px,#efefef_9px,#efefef_18px)] lg:w-[220px] lg:flex-none">
                  {e.photoUrls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.photoUrls[0]} alt="캠스터디 캡처" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  {e.hasMemo && e.memoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.memoUrl} alt="손글씨 메모" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-[2px] bg-[#161616] px-2.5 py-1">
                    <span className="inline-flex h-3 w-3 items-center justify-center rounded-full border-[1.5px] border-white" />
                    <span className="text-[11px] font-semibold text-white">인증됨</span>
                  </div>
                  {e.photoUrls.length > 1 && (
                    <span className="absolute right-2.5 bottom-2.5 rounded-[2px] bg-[#161616]/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
                      +{e.photoUrls.length - 1}
                    </span>
                  )}
                  {e.hasMemo && (
                    <span className="absolute top-2.5 right-2.5 rounded-[2px] border border-[#16161614] bg-white px-1.5 py-0.5 text-[11px] whitespace-nowrap text-[#161616]">
                      ✎ 메모
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center gap-2">
                    {e.subject && <Badge>{e.subject}</Badge>}
                    <span className="font-mono text-[13px] text-[#161616]/50">
                      {e.time}–{e.end}
                    </span>
                    {e.dur && <span className="text-[14px] text-[#161616]/45">· {e.dur} 집중</span>}
                  </div>
                  <p className="m-0 mb-auto text-[16px] leading-6 text-[#161616] lg:text-[18px] lg:leading-7">
                    {e.title || "학습 진행 중"}
                  </p>
                  {e.photoUrls.length > 1 && (
                    <div className="scrollbar-hide mb-3 flex gap-1.5 overflow-x-auto">
                      {e.photoUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt="" className="h-12 w-12 flex-none rounded-[2px] border border-[#16161614] object-cover" />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => setMemoEntry(e)}
                      className="self-start rounded-[2px] border border-[#161616] bg-white px-4.5 py-2.5 text-[14px] font-medium text-[#161616]"
                    >
                      ✎ {e.hasMemo ? "손글씨 메모 수정" : "손글씨 메모 추가"}
                    </button>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="self-start border-none bg-none p-0 text-[13px] text-[#161616]/45 underline underline-offset-[3px]"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="m-0 py-12 text-center text-[14px] text-[#161616]/40">{isToday ? "오늘" : "해당 날짜에"} 캡처된 학습 인증이 없습니다.</p>}
      </div>

      {memoEntry && (
        <MemoSheet
          entry={memoEntry}
          onClose={() => setMemoEntry(null)}
          onSaved={() => {
            setMemoEntry(null);
            load();
          }}
        />
      )}

      {uploadOpen && (
        <ManualUploadSheet
          todos={todos}
          viewDate={viewDate}
          onClose={() => setUploadOpen(false)}
          onSaved={() => {
            setUploadOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ManualUploadSheet({
  todos,
  viewDate,
  onClose,
  onSaved,
}: {
  todos: TodoOption[];
  viewDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [todoId, setTodoId] = useState("");
  const nowKstHm = () => new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
  const [time, setTime] = useState(nowKstHm);
  const [endTime, setEndTime] = useState(nowKstHm);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    ).then((urls) => setPhotos((prev) => [...prev, ...urls]));
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, j) => j !== i));
  }

  async function submit() {
    if (photos.length === 0) {
      setError("사진을 한 장 이상 선택해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    const todo = todos.find((t) => t.id === todoId);
    const res = await fetch("/api/camstudy/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: todo?.subject,
        todoTitle: todo?.title,
        photoUrls: photos,
        // Place the entry at the chosen KST start/end times on the browsed day;
        // fall back to KST noon if the start time was cleared.
        segmentStart: time ? `${viewDate}T${time}:00+09:00` : `${viewDate}T03:00:00.000Z`,
        segmentEnd: endTime ? `${viewDate}T${endTime}:00+09:00` : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("등록에 실패했습니다.");
      return;
    }
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} maxWidth={560}>
      <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">사진으로 인증 추가</h2>
      <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50 lg:text-[16px]">여러 장의 사진을 한 번에 올려 학습 인증을 남길 수 있어요.</p>

      {todos.length > 0 && (
        <>
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">연동 투두 (선택)</p>
          <select
            value={todoId}
            onChange={(e) => setTodoId(e.target.value)}
            className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
          >
            <option value="">선택 안 함</option>
            {todos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.subject} · {t.title}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="mb-5 flex gap-4">
        <div className="flex-1">
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">시작 시간</p>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
          />
        </div>
        <div className="flex-1">
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">끝나는 시간</p>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
          />
        </div>
      </div>

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">인증 사진 {photos.length > 0 && `(${photos.length}장)`}</p>
      {photos.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-20 rounded-[2px] border border-[#16161614] object-cover" />
              <button
                onClick={() => removePhoto(i)}
                aria-label="삭제"
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-none bg-[#161616] text-[12px] text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="mb-6 flex w-full cursor-pointer items-center justify-center border border-dashed border-[#c6c6c6] py-3 text-[14px] text-[#161616]/60">
        사진 선택 (여러 장 가능)
        <input type="file" accept="image/*" multiple className="hidden" onChange={onPickPhotos} />
      </label>

      {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onClose} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
          취소
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          등록하기
        </button>
      </div>
    </Sheet>
  );
}

function MemoSheet({ entry, onClose, onSaved }: { entry: TimelineEntry; onClose: () => void; onSaved: () => void }) {
  const [penColor, setPenColor] = useState(PEN_COLORS[0].c);
  const canvasHandle = useRef<HandwritingCanvasHandle | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const dataUrl = canvasHandle.current?.getDataUrl();
    if (!dataUrl) return;
    setSaving(true);
    await fetch(`/api/camstudy/timeline/${entry.id}/memo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, penColor }),
    });
    setSaving(false);
    onSaved();
  }
  async function del() {
    setSaving(true);
    await fetch(`/api/camstudy/timeline/${entry.id}/memo`, { method: "DELETE" });
    setSaving(false);
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} maxWidth={620}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {entry.subject && <Badge>{entry.subject}</Badge>}
            <span className="text-[13px] text-[#161616]/50">{entry.time} 캡처</span>
          </div>
          <p className="m-0 mt-2.5 text-[16px] leading-6 text-[#161616] lg:text-[18px] lg:leading-7">{entry.title || "학습 진행 중"}</p>
        </div>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden border border-[#161616] bg-[repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4_10px,#efefef_10px,#efefef_20px)]" style={{ touchAction: "none" }}>
        {entry.photoUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.photoUrls[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className="pointer-events-none absolute top-3 left-3.5 text-[12px] text-[#161616]/40">캡처 화면 위에 손글씨로 메모하세요</span>
        <HandwritingCanvas ref={canvasHandle} penColor={penColor} initialDataUrl={entry.memoUrl} />
      </div>

      <div className="flex items-center justify-between pt-4 pb-1">
        <div className="flex items-center gap-2.5">
          {PEN_COLORS.map((p) => (
            <button
              key={p.c}
              onClick={() => setPenColor(p.c)}
              aria-label={p.label}
              className="h-7 w-7 rounded-full border-2 p-0 lg:h-8 lg:w-8"
              style={{ background: p.c, borderColor: penColor === p.c ? "#161616" : "transparent", outline: "1px solid #16161614" }}
            />
          ))}
        </div>
        <button onClick={() => canvasHandle.current?.clear()} className="border-none bg-none p-0 text-[14px] text-[#161616]/50 underline underline-offset-[3px]">
          전체 지우기
        </button>
      </div>

      <div className="mt-4 flex gap-2.5">
        {entry.hasMemo && (
          <button onClick={del} disabled={saving} className="w-[88px] flex-none rounded-[2px] border border-[#c6c6c6] bg-white py-3.5 text-[15px] font-medium text-[#161616] disabled:opacity-50 lg:w-[100px]">
            삭제
          </button>
        )}
        <button onClick={onClose} className="hidden w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616] lg:block">
          취소
        </button>
        <button onClick={save} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          메모 저장
        </button>
      </div>
    </Sheet>
  );
}
