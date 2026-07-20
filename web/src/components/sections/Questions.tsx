"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";

/** A thumbnail that opens a full-screen zoom overlay when clicked. */
function Zoomable({ src, className }: { src: string; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={className} style={{ cursor: "zoom-in" }} onClick={() => setOpen(true)} />
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"
          style={{ cursor: "zoom-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[92vw] rounded-[2px] object-contain"
            style={{ cursor: "default" }}
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border-none bg-white/15 text-[18px] text-white"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

interface BoardOption {
  id: string;
  name: string;
}

interface LabOption {
  id: string;
  name: string;
  subject: string;
  kind: "naver" | "hohoon" | "inclass";
  boards: BoardOption[];
}

interface QuestionItem {
  id: string;
  kind: "naver" | "hohoon" | "inclass";
  labName: string;
  boardName?: string | null;
  subject: string;
  title: string;
  body?: string;
  imagePaths?: string[];
  postStatus?: string;
  cafeArticleUrl?: string | null;
  articleUrl?: string | null;
  answerText?: string | null;
  answerImages?: string[];
  commentCount: number;
  hasUnseenReply: boolean;
  done: boolean;
  createdAt: string;
}

interface QuestionDetail {
  id: string;
  labName: string;
  boardName: string;
  subject: string;
  title: string;
  content: string;
  photoUrls: string[];
  postStatus: string;
  postError: string | null;
  cafeArticleUrl: string | null;
  commentCount: number;
}

interface CafeComment {
  nickname: string;
  content: string;
  date?: string;
}

export function Questions() {
  const searchParams = useSearchParams();
  const [naverConnected, setNaverConnected] = useState<boolean | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<QuestionItem | null>(null);
  const [tab, setTab] = useState<"open" | "done">("open");
  const [naverNotice] = useState<"connected" | "error" | null>(() => {
    const p = searchParams.get("naver");
    return p === "connected" || p === "error" ? p : null;
  });

  function loadMe() {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setNaverConnected(!!d.naverConnected))
      .catch(() => {});
  }
  function loadQuestions() {
    Promise.all([
      fetch("/api/questions").then((r) => r.json()).catch(() => []),
      fetch("/api/hohoon/questions").then((r) => r.json()).catch(() => []),
      fetch("/api/inclass/questions").then((r) => r.json()).catch(() => []),
    ]).then(([naver, hohoon, inclass]) => {
      const a: QuestionItem[] = (Array.isArray(naver) ? naver : []).map((q) => ({ ...q, kind: "naver" as const }));
      const b: QuestionItem[] = Array.isArray(hohoon) ? hohoon : [];
      const c: QuestionItem[] = Array.isArray(inclass) ? inclass : [];
      setQuestions([...a, ...b, ...c].sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1)));
    });
  }

  useEffect(() => {
    loadMe();
    loadQuestions();
    const interval = setInterval(loadQuestions, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function toggleDone(q: QuestionItem) {
    const url =
      q.kind === "hohoon"
        ? `/api/hohoon/questions/${q.id}`
        : q.kind === "inclass"
          ? `/api/inclass/questions/${q.id}`
          : `/api/questions/${q.id}`;
    setQuestions((prev) => prev?.map((x) => (x.id === q.id ? { ...x, done: !x.done } : x)) ?? prev);
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !q.done }),
    }).catch(() => {});
  }

  const shown = questions?.filter((q) => (tab === "done" ? q.done : !q.done)) ?? null;
  const openCount = questions?.filter((q) => !q.done).length ?? 0;
  const doneCount = questions?.filter((q) => q.done).length ?? 0;

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-8 pb-4 lg:pt-10 lg:pb-5">
        <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">TA 질문하기</p>
        <button onClick={() => setAddOpen(true)} className="border-none bg-none p-0 text-[14px] text-[#161616] underline underline-offset-[3px] lg:text-[16px]">
          + 질문하기
        </button>
      </div>

      {naverNotice === "connected" && <p className="m-0 py-3 text-[13px] text-[#003ce0]">네이버 계정이 연동되었습니다.</p>}
      {naverNotice === "error" && <p className="m-0 py-3 text-[13px] text-[#e0362f]">네이버 계정 연동에 실패했습니다. 다시 시도해 주세요.</p>}

      {naverConnected === false && (
        <div className="my-4 border border-[#16161614] bg-[#f4f4f4] p-4">
          <p className="m-0 mb-3 text-[14px] leading-6 text-[#161616]">
            네이버 연구소 카페(신국어·정석준·신성규)에 질문하려면 네이버 계정 연동이 필요해요. (호형훈제수학연구소는 연동 없이 바로 질문 가능해요.)
          </p>
          <a
            href="/api/naver/authorize"
            className="inline-block rounded-[2px] border-none bg-[#161616] px-4 py-2.5 text-[14px] font-semibold text-white no-underline"
          >
            네이버 계정 연동하기
          </a>
        </div>
      )}

      <div className="flex gap-2 py-4">
        <button
          onClick={() => setTab("open")}
          className={`rounded-full border px-4 py-1.5 text-[13px] lg:text-[14px] ${tab === "open" ? "border-[#161616] bg-[#161616] text-white" : "border-[#16161624] bg-white text-[#161616]/60"}`}
        >
          진행 중 {openCount > 0 && `(${openCount})`}
        </button>
        <button
          onClick={() => setTab("done")}
          className={`rounded-full border px-4 py-1.5 text-[13px] lg:text-[14px] ${tab === "done" ? "border-[#161616] bg-[#161616] text-white" : "border-[#16161624] bg-white text-[#161616]/60"}`}
        >
          완료 {doneCount > 0 && `(${doneCount})`}
        </button>
      </div>

      {shown?.map((q) => (
        <div key={q.id} className="flex items-center gap-3 border-0 border-b border-[#16161614] py-4">
          <button onClick={() => setDetail(q)} className="min-w-0 flex-1 border-none bg-none p-0 text-left">
            <div className="mb-1.5 flex items-center gap-2">
              <Badge>{q.labName}</Badge>
              <span className="text-[12px] text-[#161616]/40">{q.subject}</span>
              {q.postStatus === "failed" && <span className="text-[12px] text-[#e0362f]">등록 실패</span>}
              {q.hasUnseenReply && <span className="h-2 w-2 flex-none rounded-full bg-[#e0362f]" />}
            </div>
            <p className={`m-0 text-[15px] leading-6 lg:text-[16px] ${q.done ? "text-[#161616]/35 line-through" : "text-[#161616]"}`}>{q.title}</p>
          </button>
          <button
            onClick={() => toggleDone(q)}
            className={`flex-none rounded-full border px-2.5 py-1 text-[12px] ${q.done ? "border-[#16161624] bg-white text-[#161616]/50" : "border-[#161616] bg-white text-[#161616]"}`}
          >
            {q.done ? "완료 취소" : "완료"}
          </button>
        </div>
      ))}
      {shown?.length === 0 && (
        <p className="m-0 py-12 text-center text-[14px] text-[#161616]/40">{tab === "done" ? "완료된 질문이 없습니다." : "진행 중인 질문이 없습니다."}</p>
      )}

      {addOpen && (
        <AddQuestionSheet
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            loadQuestions();
          }}
          onNeedsNaver={() => setNaverConnected(false)}
        />
      )}

      {detail && detail.kind === "naver" && (
        <QuestionDetailSheet
          id={detail.id}
          onClose={() => {
            setDetail(null);
            loadQuestions();
          }}
        />
      )}
      {detail && detail.kind === "hohoon" && (
        <HohoonDetailSheet
          item={detail}
          onClose={() => {
            setDetail(null);
            loadQuestions();
          }}
        />
      )}
      {detail && detail.kind === "inclass" && (
        <InclassDetailSheet
          item={detail}
          onClose={() => {
            setDetail(null);
            loadQuestions();
          }}
        />
      )}
    </div>
  );
}

function AddQuestionSheet({
  onClose,
  onSaved,
  onNeedsNaver,
}: {
  onClose: () => void;
  onSaved: () => void;
  onNeedsNaver: () => void;
}) {
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [labId, setLabId] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/questions/labs")
      .then((r) => r.json())
      .then(setLabs)
      .catch(() => {});
  }, []);

  const lab = labs.find((l) => l.id === labId) || null;

  function pickLab(l: LabOption) {
    setLabId(l.id);
    setBoardId(l.boards.length === 1 ? l.boards[0].id : null);
  }

  if (!lab) {
    return (
      <Sheet open onClose={onClose} maxWidth={480}>
        <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">질문할 연구소 선택하기</h2>
        <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50">질문을 올릴 연구소를 선택하세요. 과목은 연구소에 따라 자동으로 정해져요.</p>
        <div className="flex flex-col gap-2.5">
          {labs.map((l) => (
            <button
              key={l.id}
              onClick={() => pickLab(l)}
              className="flex items-center justify-between border border-[#16161614] px-4 py-3.5 text-left"
            >
              <span className="text-[15px] text-[#161616] lg:text-[16px]">
                {l.name} <span className="text-[13px] text-[#161616]/40">· {l.subject}</span>
              </span>
              <span className="text-[16px] text-[#161616]/30">→</span>
            </button>
          ))}
          {labs.length === 0 && <p className="m-0 py-6 text-center text-[13px] text-[#161616]/40">불러오는 중…</p>}
        </div>
        <div className="mt-8">
          <button onClick={onClose} className="w-full rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
            취소
          </button>
        </div>
      </Sheet>
    );
  }

  // hohoonmath uses its own login/captcha compose flow.
  if (lab.kind === "hohoon") {
    return <HohoonComposeForm labName={lab.name} subject={lab.subject} onBack={() => setLabId(null)} onClose={onClose} onSaved={onSaved} />;
  }

  if (!boardId) {
    return (
      <Sheet open onClose={onClose} maxWidth={480}>
        <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">게시판 선택하기</h2>
        <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50">
          <span className="font-semibold text-[#161616]">{lab.name}</span>의 어느 게시판에 올릴지 선택하세요.
        </p>
        <div className="scrollbar-hide flex max-h-[50vh] flex-col gap-2.5 overflow-y-auto">
          {lab.boards.map((b) => (
            <button
              key={b.id}
              onClick={() => setBoardId(b.id)}
              className="flex items-center justify-between border border-[#16161614] px-4 py-3.5 text-left"
            >
              <span className="text-[15px] text-[#161616] lg:text-[16px]">{b.name}</span>
              <span className="text-[16px] text-[#161616]/30">→</span>
            </button>
          ))}
        </div>
        <div className="mt-8">
          <button onClick={() => setLabId(null)} className="w-full rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
            뒤로
          </button>
        </div>
      </Sheet>
    );
  }

  const singleBoardLab = lab.boards.length === 1;
  function backFromForm() {
    if (singleBoardLab) {
      setLabId(null);
      setBoardId(null);
    } else {
      setBoardId(null);
    }
  }
  const boardName = lab.boards.find((b) => b.id === boardId)?.name || boardId;

  // inclass boards post through a shared session — a plain title/body form.
  if (lab.kind === "inclass") {
    return (
      <InclassComposeForm
        labId={lab.id}
        labName={lab.name}
        subject={lab.subject}
        boardId={boardId}
        boardName={boardName}
        onBack={backFromForm}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  return (
    <NaverQuestionForm
      labId={lab.id}
      labName={lab.name}
      subject={lab.subject}
      boardId={boardId}
      boardName={boardName}
      onBack={backFromForm}
      onClose={onClose}
      onSaved={onSaved}
      onNeedsNaver={onNeedsNaver}
    />
  );
}

function NaverQuestionForm({
  labId,
  labName,
  subject,
  boardId,
  boardName,
  onBack,
  onClose,
  onSaved,
  onNeedsNaver,
}: {
  labId: string;
  labName: string;
  subject: string;
  boardId: string;
  boardName: string;
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
  onNeedsNaver: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

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
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    setError(null);
    setJoinUrl(null);
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, boardId, title: title.trim(), content: content.trim(), photoDataUrls: photos }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (d.needsNaverConnect) onNeedsNaver();
      setError(d.error || "등록에 실패했습니다.");
      setJoinUrl(typeof d.joinUrl === "string" ? d.joinUrl : null);
      return;
    }
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} maxWidth={560}>
      <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">질문 작성</h2>
      <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50 lg:text-[16px]">
        <span className="font-semibold text-[#161616]">{labName}</span> · {boardName} · {subject}
      </p>

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">제목</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="예) 이 문제 풀이 방법을 모르겠어요"
        className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
      />

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">내용</p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        placeholder="질문 내용을 자세히 적어주세요."
        className="mb-5 w-full resize-none border border-[#16161614] bg-transparent p-3 text-[14px] leading-6 text-[#161616] outline-none"
      />

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">사진 첨부 {photos.length > 0 && `(${photos.length}장)`}</p>
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

      {error && (
        <p className="m-0 mb-4 text-[13px] text-[#e0362f]">
          {error}
          {joinUrl && (
            <>
              {" "}
              <a href={joinUrl} target="_blank" rel="noreferrer" className="underline underline-offset-[3px]">
                카페 가입하러 가기 ↗
              </a>
            </>
          )}
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
          뒤로
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          {saving ? "등록 중…" : "질문 등록하기"}
        </button>
      </div>
    </Sheet>
  );
}

function HohoonComposeForm({
  labName,
  subject,
  onBack,
  onClose,
  onSaved,
}: {
  labName: string;
  subject: string;
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [startError, setStartError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hohoon/compose", { method: "POST" })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => {
        if (!ok) {
          setStartError(d.error || "질문 작성을 시작하지 못했습니다.");
          return;
        }
        setDraftId(d.draftId);
        setCaptcha(d.captcha);
      })
      .catch(() => setStartError("질문 작성을 시작하지 못했습니다."))
      .finally(() => setStarting(false));
  }, []);

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!draftId || files.length === 0) return;
    setUploading(true);
    setError(null);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/hohoon/compose/${draftId}/image`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.path) setPhotos((prev) => [...prev, `https://www.hohoonmath.com${d.path}`]);
      else setError(d.error || "이미지 업로드에 실패했습니다.");
    }
    setUploading(false);
  }

  async function refreshCaptcha() {
    if (!draftId) return;
    const res = await fetch(`/api/hohoon/compose/${draftId}/captcha`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.captcha) setCaptcha(d.captcha);
  }

  async function submit() {
    if (!draftId || !title.trim() || !body.trim() || !code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/hohoon/compose/${draftId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: title.trim(), body: body.trim(), captcha: code.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "글 등록에 실패했습니다.");
      setCode("");
      refreshCaptcha();
      return;
    }
    onSaved();
  }

  function cancel() {
    if (draftId) fetch(`/api/hohoon/compose/${draftId}`, { method: "DELETE" }).catch(() => {});
    onClose();
  }

  return (
    <Sheet open onClose={cancel} maxWidth={560}>
      <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">질문 작성</h2>
      <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50 lg:text-[16px]">
        <span className="font-semibold text-[#161616]">{labName}</span> · 학습질문 · {subject}
      </p>

      {starting && <p className="m-0 py-8 text-center text-[13px] text-[#161616]/40">준비 중…</p>}
      {startError && (
        <div className="py-8 text-center">
          <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{startError}</p>
          <button onClick={onBack} className="rounded-[2px] border border-[#161616] bg-white px-4 py-2.5 text-[14px] text-[#161616]">
            뒤로
          </button>
        </div>
      )}

      {!starting && !startError && draftId && (
        <>
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">제목</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 서킷 17회 20번 질문"
            className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
          />

          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">내용</p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="질문 내용을 자세히 적어주세요."
            className="mb-5 w-full resize-none border border-[#16161614] bg-transparent p-3 text-[14px] leading-6 text-[#161616] outline-none"
          />

          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">사진 첨부 {photos.length > 0 && `(${photos.length}장)`}</p>
          {photos.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="h-20 w-20 rounded-[2px] border border-[#16161614] object-cover" />
              ))}
            </div>
          )}
          <label className="mb-6 flex w-full cursor-pointer items-center justify-center border border-dashed border-[#c6c6c6] py-3 text-[14px] text-[#161616]/60">
            {uploading ? "업로드 중…" : "사진 선택 (여러 장 가능)"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={onPickPhotos} disabled={uploading} />
          </label>

          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">자동 등록 방지</p>
          <div className="mb-3 flex items-center gap-3">
            {captcha && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={captcha} alt="캡차" className="h-10 border border-[#c6c6c6]" />
            )}
            <button onClick={refreshCaptcha} className="border-none bg-none p-0 text-[12px] text-[#161616]/50 underline underline-offset-[3px]">
              문자 변경
            </button>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="위 이미지의 문자를 입력하세요"
            autoComplete="off"
            className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
          />

          {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}

          <div className="flex gap-3">
            <button onClick={cancel} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
              취소
            </button>
            <button onClick={submit} disabled={submitting || uploading} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
              {submitting ? "등록 중…" : "질문 등록하기"}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function HohoonDetailSheet({ item, onClose }: { item: QuestionItem; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [answer, setAnswer] = useState<string | null>(item.answerText ?? null);
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  function loadAnswer() {
    setLoadingAnswer(true);
    fetch(`/api/hohoon/questions/${item.id}/refresh`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.answerText === "string") setAnswer(d.answerText);
      })
      .finally(() => setLoadingAnswer(false));
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/hohoon/questions/${item.id}/refresh`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (active && typeof d.answerText === "string") setAnswer(d.answerText);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function del() {
    if (!window.confirm("이 질문을 삭제할까요? (호형훈제수학연구소에 이미 올라간 글은 앱에서 삭제해도 사이트에는 그대로 남아있습니다.)")) return;
    setDeleting(true);
    await fetch(`/api/hohoon/questions/${item.id}`, { method: "DELETE" });
    setDeleting(false);
    onClose();
  }

  return (
    <Sheet open onClose={onClose} maxWidth={620}>
      <div className="mb-4 flex items-center gap-2">
        <Badge>{item.labName}</Badge>
        {item.boardName && <span className="text-[12px] text-[#161616]/40">{item.boardName}</span>}
        <Badge>{item.subject}</Badge>
      </div>
      <h2 className="m-0 mb-4 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">{item.title}</h2>
      <p className="m-0 mb-5 text-[15px] leading-7 whitespace-pre-wrap text-[#393939]">{item.body}</p>
      {item.imagePaths && item.imagePaths.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {item.imagePaths.map((url, i) => (
            <Zoomable key={i} src={url} className="h-28 w-28 rounded-[2px] border border-[#16161614] object-cover" />
          ))}
        </div>
      )}

      <div className="mb-6 border-t border-[#16161614] pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="m-0 text-[13px] leading-5 font-semibold text-[#161616]">선생님 답변</p>
          <button onClick={loadAnswer} disabled={loadingAnswer} className="border-none bg-none p-0 text-[12px] text-[#161616]/50 underline underline-offset-[3px] disabled:opacity-50">
            새로고침
          </button>
        </div>
        {answer ? (
          <p className="m-0 text-[14px] leading-6 whitespace-pre-wrap text-[#393939]">{answer}</p>
        ) : loadingAnswer ? (
          <p className="m-0 py-4 text-center text-[13px] text-[#161616]/40">답변 확인 중…</p>
        ) : (
          <p className="m-0 py-4 text-center text-[13px] text-[#161616]/40">아직 선생님 답변이 없습니다.</p>
        )}
        {item.articleUrl && (
          <a href={item.articleUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] text-[#161616]/40 underline underline-offset-[3px]">
            사이트에서 직접 확인하기 ↗
          </a>
        )}
      </div>

      <button
        onClick={del}
        disabled={deleting}
        className="w-full rounded-[2px] border border-[#c6c6c6] bg-white py-3.5 text-[15px] font-medium text-[#161616] disabled:opacity-50"
      >
        질문 삭제
      </button>
    </Sheet>
  );
}

function InclassComposeForm({
  labId,
  labName,
  subject,
  boardId,
  boardName,
  onBack,
  onClose,
  onSaved,
}: {
  labId: string;
  labName: string;
  subject: string;
  boardId: string;
  boardName: string;
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<{ fileUpNM: string; fileKey: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ code: string; label: string }[]>([]);
  const [groupCode, setGroupCode] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/inclass/categories?labId=${encodeURIComponent(labId)}&boardId=${encodeURIComponent(boardId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.categories)) setCategories(d.categories);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [labId, boardId]);

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    for (const file of files) {
      if (attachments.length >= 3) {
        setError("사진은 최대 3장까지 첨부할 수 있습니다.");
        break;
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("labId", labId);
      fd.append("boardId", boardId);
      const res = await fetch("/api/inclass/upload", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) setAttachments((prev) => [...prev, d]);
      else setError(d.error || "이미지 업로드에 실패했습니다.");
    }
    setUploading(false);
  }

  function removePhoto(i: number) {
    setAttachments((prev) => prev.filter((_, j) => j !== i));
  }

  async function submit() {
    if (!title.trim() || !body.trim() || submitting || uploading) return;
    if (categories.length > 0 && !groupCode) {
      setError("분류를 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/inclass/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, boardId, subject: title.trim(), body: body.trim(), groupCode, attachments }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "질문 등록에 실패했습니다.");
      return;
    }
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} maxWidth={560}>
      <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">질문 작성</h2>
      <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50 lg:text-[16px]">
        <span className="font-semibold text-[#161616]">{labName}</span> · {boardName} · {subject}
      </p>

      {categories.length > 0 && (
        <>
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">분류</p>
          <select
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value)}
            className="mb-5 w-full border border-[#16161614] bg-transparent px-3 py-2.5 text-[15px] text-[#161616] outline-none"
          >
            <option value="">분류를 선택해주세요.</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </>
      )}

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">제목</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="예) 3회 15번 풀이 질문"
        className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
      />

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">내용</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        placeholder="질문 내용을 자세히 적어주세요."
        className="mb-5 w-full resize-none border border-[#16161614] bg-transparent p-3 text-[14px] leading-6 text-[#161616] outline-none"
      />

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">사진 첨부 {attachments.length > 0 && `(${attachments.length}/3)`}</p>
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt="" className="h-20 w-20 rounded-[2px] border border-[#16161614] object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border-none bg-[#161616] text-[12px] leading-none text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {attachments.length < 3 && (
        <label className="mb-6 flex w-full cursor-pointer items-center justify-center border border-dashed border-[#c6c6c6] py-3 text-[14px] text-[#161616]/60">
          {uploading ? "업로드 중…" : "사진 선택 (최대 3장)"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={onPickPhotos} disabled={uploading} />
        </label>
      )}

      <p className="m-0 mb-4 text-[12px] leading-5 text-[#161616]/45">🔒 이 질문은 비공개(작성자만 열람)로 등록됩니다.</p>

      {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onBack} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
          뒤로
        </button>
        <button onClick={submit} disabled={submitting || uploading} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          {submitting ? "등록 중…" : "질문 등록하기"}
        </button>
      </div>
    </Sheet>
  );
}

function InclassDetailSheet({ item, onClose }: { item: QuestionItem; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [answer, setAnswer] = useState<string | null>(item.answerText ?? null);
  const [answerImages, setAnswerImages] = useState<string[]>(item.answerImages ?? []);
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  function applyAnswer(d: { answerText?: unknown; answerImages?: unknown }) {
    if (typeof d.answerText === "string") setAnswer(d.answerText);
    if (Array.isArray(d.answerImages)) setAnswerImages(d.answerImages.filter((x): x is string => typeof x === "string"));
  }

  function loadAnswer() {
    setLoadingAnswer(true);
    fetch(`/api/inclass/questions/${item.id}/refresh`, { method: "POST" })
      .then((r) => r.json())
      .then(applyAnswer)
      .finally(() => setLoadingAnswer(false));
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/inclass/questions/${item.id}/refresh`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (active) applyAnswer(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function del() {
    if (!window.confirm(`이 질문을 삭제할까요? (${item.labName}에 이미 올라간 글은 앱에서 삭제해도 사이트에는 그대로 남아있습니다.)`)) return;
    setDeleting(true);
    await fetch(`/api/inclass/questions/${item.id}`, { method: "DELETE" });
    setDeleting(false);
    onClose();
  }

  return (
    <Sheet open onClose={onClose} maxWidth={620}>
      <div className="mb-4 flex items-center gap-2">
        <Badge>{item.labName}</Badge>
        {item.boardName && <span className="text-[12px] text-[#161616]/40">{item.boardName}</span>}
        <Badge>{item.subject}</Badge>
      </div>
      <h2 className="m-0 mb-4 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">{item.title}</h2>
      <p className="m-0 mb-5 text-[15px] leading-7 whitespace-pre-wrap text-[#393939]">{item.body}</p>
      {item.imagePaths && item.imagePaths.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {item.imagePaths.map((url, i) => (
            <Zoomable key={i} src={url} className="h-28 w-28 rounded-[2px] border border-[#16161614] object-cover" />
          ))}
        </div>
      )}

      <div className="mb-6 border-t border-[#16161614] pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="m-0 text-[13px] leading-5 font-semibold text-[#161616]">선생님 답변</p>
          <button onClick={loadAnswer} disabled={loadingAnswer} className="border-none bg-none p-0 text-[12px] text-[#161616]/50 underline underline-offset-[3px] disabled:opacity-50">
            새로고침
          </button>
        </div>
        {answer || answerImages.length > 0 ? (
          <>
            {answer && <p className="m-0 text-[14px] leading-6 whitespace-pre-wrap text-[#393939]">{answer}</p>}
            {answerImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {answerImages.map((url, i) => (
                  <Zoomable key={i} src={url} className="h-32 w-32 rounded-[2px] border border-[#16161614] object-cover" />
                ))}
              </div>
            )}
          </>
        ) : loadingAnswer ? (
          <p className="m-0 py-4 text-center text-[13px] text-[#161616]/40">답변 확인 중…</p>
        ) : (
          <p className="m-0 py-4 text-center text-[13px] text-[#161616]/40">아직 선생님 답변이 없습니다.</p>
        )}
        {item.articleUrl && (
          <a href={item.articleUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] text-[#161616]/40 underline underline-offset-[3px]">
            사이트에서 직접 확인하기 ↗
          </a>
        )}
      </div>

      <button
        onClick={del}
        disabled={deleting}
        className="w-full rounded-[2px] border border-[#c6c6c6] bg-white py-3.5 text-[15px] font-medium text-[#161616] disabled:opacity-50"
      >
        질문 삭제
      </button>
    </Sheet>
  );
}

function QuestionDetailSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<CafeComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  function loadComments() {
    setLoadingComments(true);
    fetch(`/api/questions/${id}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments))
      .finally(() => {
        setLoadingComments(false);
        setCommentsLoaded(true);
      });
  }

  useEffect(() => {
    fetch(`/api/questions/${id}`)
      .then((r) => r.json())
      .then((d: QuestionDetail) => {
        setDetail(d);
        if (d.postStatus === "posted") loadComments();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (detail?.postStatus === "posted") loadComments();
    }, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, detail?.postStatus]);

  async function del() {
    if (!window.confirm("이 질문을 삭제할까요? (카페에 이미 올라간 글은 앱에서 삭제해도 카페에는 그대로 남아있습니다.)")) return;
    setDeleting(true);
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    setDeleting(false);
    onClose();
  }

  if (!detail) return null;

  return (
    <Sheet open onClose={onClose} maxWidth={620}>
      <div className="mb-4 flex items-center gap-2">
        <Badge>{detail.labName}</Badge>
        <span className="text-[12px] text-[#161616]/40">{detail.boardName}</span>
        <Badge>{detail.subject}</Badge>
      </div>
      <h2 className="m-0 mb-4 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">{detail.title}</h2>

      {detail.postStatus === "failed" && (
        <p className="m-0 mb-4 border border-[#e0362f]/30 bg-[#e0362f]/5 p-3 text-[13px] text-[#e0362f]">
          카페 등록에 실패했습니다: {detail.postError || "알 수 없는 오류"}
        </p>
      )}

      <p className="m-0 mb-5 text-[15px] leading-7 whitespace-pre-wrap text-[#393939]">{detail.content}</p>

      {detail.photoUrls.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {detail.photoUrls.map((url, i) => (
            <Zoomable key={i} src={url} className="h-28 w-28 rounded-[2px] border border-[#16161614] object-cover" />
          ))}
        </div>
      )}

      {detail.postStatus === "posted" && (
        <div className="mb-6 border-t border-[#16161614] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="m-0 text-[13px] leading-5 text-[#161616]/50">댓글 {detail.commentCount}개 · 새 댓글이 달리면 이 앱에서 알려드려요.</p>
            <button onClick={loadComments} disabled={loadingComments} className="border-none bg-none p-0 text-[12px] text-[#161616]/50 underline underline-offset-[3px] disabled:opacity-50">
              새로고침
            </button>
          </div>

          {loadingComments && <p className="m-0 py-6 text-center text-[13px] text-[#161616]/40">댓글 불러오는 중…</p>}

          {!loadingComments && commentsLoaded && comments !== null && comments.length === 0 && (
            <p className="m-0 py-6 text-center text-[13px] text-[#161616]/40">아직 댓글이 없습니다.</p>
          )}

          {comments !== null && comments.length > 0 && (
            <div className="mb-3 flex flex-col gap-3">
              {comments.map((c, i) => (
                <div key={i} className="border-b border-[#16161614] pb-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#161616]">{c.nickname}</span>
                    {c.date && <span className="text-[11px] text-[#161616]/40">{c.date}</span>}
                  </div>
                  <p className="m-0 text-[14px] leading-6 whitespace-pre-wrap text-[#393939]">{c.content}</p>
                </div>
              ))}
            </div>
          )}

          {!loadingComments && commentsLoaded && comments === null && (
            <p className="m-0 mb-2 text-[13px] text-[#161616]/40">댓글을 불러오지 못했습니다.</p>
          )}

          {detail.cafeArticleUrl && (
            <a href={detail.cafeArticleUrl} target="_blank" rel="noreferrer" className="text-[12px] text-[#161616]/40 underline underline-offset-[3px]">
              카페에서 직접 확인하기 ↗
            </a>
          )}
        </div>
      )}

      <button
        onClick={del}
        disabled={deleting}
        className="w-full rounded-[2px] border border-[#c6c6c6] bg-white py-3.5 text-[15px] font-medium text-[#161616] disabled:opacity-50"
      >
        질문 삭제
      </button>
    </Sheet>
  );
}
