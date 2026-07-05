"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";

interface QuestionItem {
  id: string;
  subject: string;
  body: string;
  imagePaths: string[];
  commentCount: number;
  hasUnseenReply: boolean;
  createdAt: string;
}

export function HohoonQuestions() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [writerName, setWriterName] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[] | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  function loadAccount() {
    fetch("/api/hohoon/account")
      .then((r) => r.json())
      .then((d) => {
        setConnected(!!d.connected);
        setWriterName(d.writerName ?? null);
      })
      .catch(() => setConnected(false));
  }
  function loadQuestions() {
    fetch("/api/hohoon/questions")
      .then((r) => r.json())
      .then((d) => setQuestions(Array.isArray(d) ? d : []))
      .catch(() => setQuestions([]));
  }

  useEffect(() => {
    loadAccount();
    loadQuestions();
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-8 pb-4 lg:pt-10 lg:pb-5">
        <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">훈훈수학 질문</p>
        {connected && (
          <button onClick={() => setComposeOpen(true)} className="border-none bg-none p-0 text-[14px] text-[#161616] underline underline-offset-[3px] lg:text-[16px]">
            + 질문하기
          </button>
        )}
      </div>

      {connected === false && (
        <div className="my-4 border border-[#16161614] bg-[#f4f4f4] p-4">
          <p className="m-0 mb-3 text-[14px] leading-6 text-[#161616]">
            훈훈수학 질문 게시판에 글을 올리려면 hohoonmath 계정 연동이 필요해요. 본인 아이디/비밀번호로 로그인합니다.
          </p>
          <button
            onClick={() => setConnectOpen(true)}
            className="rounded-[2px] border-none bg-[#161616] px-4 py-2.5 text-[14px] font-semibold text-white"
          >
            hohoonmath 계정 연동하기
          </button>
        </div>
      )}

      {connected && (
        <p className="m-0 py-3 text-[12px] text-[#161616]/40">
          연동됨{writerName ? ` · ${writerName}` : ""} ·{" "}
          <button onClick={() => setConnectOpen(true)} className="border-none bg-none p-0 text-[12px] text-[#161616]/40 underline underline-offset-[3px]">
            계정 변경
          </button>
        </p>
      )}

      {questions?.map((q) => (
        <div key={q.id} className="border-0 border-b border-[#16161614] py-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[12px] text-[#161616]/40">훈훈수학 · 질문 게시판</span>
            {q.hasUnseenReply && <span className="h-2 w-2 flex-none rounded-full bg-[#e0362f]" />}
          </div>
          <p className="m-0 text-[15px] leading-6 text-[#161616] lg:text-[16px]">{q.subject}</p>
          <p className="m-0 mt-1 line-clamp-2 text-[13px] leading-5 text-[#161616]/50">{q.body}</p>
          {q.imagePaths.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {q.imagePaths.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="h-16 w-16 rounded-[2px] border border-[#16161614] object-cover" />
              ))}
            </div>
          )}
        </div>
      ))}
      {questions?.length === 0 && (
        <p className="m-0 py-12 text-center text-[14px] text-[#161616]/40">등록된 질문이 없습니다.</p>
      )}

      {connectOpen && (
        <ConnectSheet
          onClose={() => setConnectOpen(false)}
          onConnected={(name) => {
            setConnected(true);
            setWriterName(name);
            setConnectOpen(false);
          }}
        />
      )}

      {composeOpen && (
        <ComposeSheet
          onClose={() => setComposeOpen(false)}
          onNeedsConnect={() => {
            setComposeOpen(false);
            setConnected(false);
            setConnectOpen(true);
          }}
          onPosted={() => {
            setComposeOpen(false);
            loadQuestions();
          }}
        />
      )}
    </div>
  );
}

function ConnectSheet({ onClose, onConnected }: { onClose: () => void; onConnected: (name: string | null) => void }) {
  const [userId, setUserId] = useState("");
  const [userPass, setUserPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!userId.trim() || !userPass || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/hohoon/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId.trim(), userPass }),
    });
    setSaving(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "연동에 실패했습니다.");
      return;
    }
    onConnected(d.writerName ?? null);
  }

  return (
    <Sheet open onClose={onClose} maxWidth={440}>
      <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">hohoonmath 계정 연동</h2>
      <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50">
        hohoonmath.com 로그인 아이디/비밀번호를 입력하세요. 질문을 올릴 때만 사용되며 암호화되어 저장됩니다.
      </p>

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">아이디</p>
      <input
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        autoComplete="off"
        className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
      />
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">비밀번호</p>
      <input
        type="password"
        value={userPass}
        onChange={(e) => setUserPass(e.target.value)}
        autoComplete="off"
        className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
      />

      {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onClose} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
          취소
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          {saving ? "연동 중…" : "연동하기"}
        </button>
      </div>
    </Sheet>
  );
}

function ComposeSheet({
  onClose,
  onNeedsConnect,
  onPosted,
}: {
  onClose: () => void;
  onNeedsConnect: () => void;
  onPosted: () => void;
}) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [startError, setStartError] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
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
          if (d.needsConnect) return onNeedsConnect();
          setStartError(d.error || "질문 작성을 시작하지 못했습니다.");
          return;
        }
        setDraftId(d.draftId);
        setCaptcha(d.captcha);
      })
      .catch(() => setStartError("질문 작성을 시작하지 못했습니다."))
      .finally(() => setStarting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (res.ok && d.path) {
        setPhotos((prev) => [...prev, `https://www.hohoonmath.com${d.path}`]);
      } else {
        setError(d.error || "이미지 업로드에 실패했습니다.");
      }
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
    if (!draftId || !subject.trim() || !body.trim() || !code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/hohoon/compose/${draftId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), body: body.trim(), captcha: code.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "글 등록에 실패했습니다.");
      setCode("");
      refreshCaptcha(); // captcha is single-use; get a fresh one to retry
      return;
    }
    onPosted();
  }

  function cancel() {
    if (draftId) fetch(`/api/hohoon/compose/${draftId}`, { method: "DELETE" }).catch(() => {});
    onClose();
  }

  return (
    <Sheet open onClose={cancel} maxWidth={560}>
      <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">질문 작성</h2>
      <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50 lg:text-[16px]">
        <span className="font-semibold text-[#161616]">훈훈수학</span> · 질문 게시판에 질문을 올립니다.
      </p>

      {starting && <p className="m-0 py-8 text-center text-[13px] text-[#161616]/40">준비 중…</p>}
      {startError && <p className="m-0 py-8 text-center text-[13px] text-[#e0362f]">{startError}</p>}

      {!starting && !startError && draftId && (
        <>
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">제목</p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="예) 이 문제 풀이가 이해가 안 돼요"
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
          <div className="mb-5 flex items-center gap-3">
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
