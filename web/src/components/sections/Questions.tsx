"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { SUBJECTS } from "@/lib/subjects";

interface BoardOption {
  id: string;
  name: string;
}

interface LabOption {
  id: string;
  name: string;
  boards: BoardOption[];
}

interface QuestionItem {
  id: string;
  labId: string;
  labName: string;
  boardName: string;
  subject: string;
  title: string;
  postStatus: string;
  postError: string | null;
  cafeArticleUrl: string | null;
  commentCount: number;
  hasUnseenReply: boolean;
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

export function Questions() {
  const searchParams = useSearchParams();
  const [naverConnected, setNaverConnected] = useState<boolean | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [naverNotice] = useState<"connected" | "error" | null>(() => {
    const p = searchParams.get("naver");
    return p === "connected" || p === "error" ? p : null;
  });

  function loadMe() {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setNaverConnected(!!d.naverConnected));
  }
  function loadQuestions() {
    fetch("/api/questions")
      .then((r) => r.json())
      .then(setQuestions);
  }

  useEffect(() => {
    loadMe();
    loadQuestions();
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-8 pb-4 lg:pt-10 lg:pb-5">
        <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">TA 질문하기</p>
        <button onClick={() => setAddOpen(true)} className="border-none bg-none p-0 text-[14px] text-[#161616] underline underline-offset-[3px] lg:text-[16px]">
          + 질문하기
        </button>
      </div>

      {naverNotice === "connected" && (
        <p className="m-0 py-3 text-[13px] text-[#003ce0]">네이버 계정이 연동되었습니다.</p>
      )}
      {naverNotice === "error" && (
        <p className="m-0 py-3 text-[13px] text-[#e0362f]">네이버 계정 연동에 실패했습니다. 다시 시도해 주세요.</p>
      )}

      {naverConnected === false && (
        <div className="my-4 border border-[#16161614] bg-[#f4f4f4] p-4">
          <p className="m-0 mb-3 text-[14px] leading-6 text-[#161616]">
            질문을 카페에 올리려면 네이버 계정 연동이 필요해요. (본인 명의의 네이버 계정으로, 각 연구소 카페의 회원이어야 글쓰기가 가능합니다.)
          </p>
          <a
            href="/api/naver/authorize"
            className="inline-block rounded-[2px] border-none bg-[#161616] px-4 py-2.5 text-[14px] font-semibold text-white no-underline"
          >
            네이버 계정 연동하기
          </a>
        </div>
      )}

      {questions?.map((q) => (
        <button
          key={q.id}
          onClick={() => setDetailId(q.id)}
          className="flex w-full items-center gap-3 border-0 border-b border-[#16161614] bg-white py-4 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <Badge>{q.labName}</Badge>
              <span className="text-[12px] text-[#161616]/40">{q.boardName}</span>
              {q.postStatus === "failed" && <span className="text-[12px] text-[#e0362f]">등록 실패</span>}
              {q.hasUnseenReply && <span className="h-2 w-2 flex-none rounded-full bg-[#e0362f]" />}
            </div>
            <p className="m-0 text-[15px] leading-6 text-[#161616] lg:text-[16px]">{q.title}</p>
          </div>
          {q.postStatus === "posted" && (
            <span className="flex-none text-[13px] text-[#161616]/40">댓글 {q.commentCount}</span>
          )}
          <span className="flex-none text-[16px] text-[#161616]/30">→</span>
        </button>
      ))}
      {questions?.length === 0 && (
        <p className="m-0 py-12 text-center text-[14px] text-[#161616]/40">등록된 질문이 없습니다.</p>
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

      {detailId && (
        <QuestionDetailSheet
          id={detailId}
          onClose={() => {
            setDetailId(null);
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
      .then(setLabs);
  }, []);

  const lab = labs.find((l) => l.id === labId) || null;

  function pickLab(l: LabOption) {
    setLabId(l.id);
    // Skip the board picker entirely when there's only one board to choose.
    setBoardId(l.boards.length === 1 ? l.boards[0].id : null);
  }

  if (!lab) {
    return (
      <Sheet open onClose={onClose} maxWidth={480}>
        <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">질문할 연구소 선택하기</h2>
        <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50">질문을 올릴 연구소 카페를 선택하세요.</p>
        <div className="flex flex-col gap-2.5">
          {labs.map((l) => (
            <button
              key={l.id}
              onClick={() => pickLab(l)}
              className="flex items-center justify-between border border-[#16161614] px-4 py-3.5 text-left"
            >
              <span className="text-[15px] text-[#161616] lg:text-[16px]">{l.name}</span>
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
      // Board picker was skipped for a single-board lab — go straight back to lab selection.
      setLabId(null);
      setBoardId(null);
    } else {
      setBoardId(null);
    }
  }

  return (
    <QuestionForm
      labId={lab.id}
      labName={lab.name}
      boardId={boardId}
      boardName={lab.boards.find((b) => b.id === boardId)?.name || boardId}
      onBack={backFromForm}
      onClose={onClose}
      onSaved={onSaved}
      onNeedsNaver={onNeedsNaver}
    />
  );
}

function QuestionForm({
  labId,
  labName,
  boardId,
  boardName,
  onBack,
  onClose,
  onSaved,
  onNeedsNaver,
}: {
  labId: string;
  labName: string;
  boardId: string;
  boardName: string;
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
  onNeedsNaver: () => void;
}) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
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
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        labId,
        boardId,
        subject,
        title: title.trim(),
        content: content.trim(),
        photoDataUrls: photos,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (d.needsNaverConnect) onNeedsNaver();
      setError(d.error || "등록에 실패했습니다.");
      return;
    }
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} maxWidth={560}>
      <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">질문 작성</h2>
      <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50 lg:text-[16px]">
        <span className="font-semibold text-[#161616]">{labName}</span> · {boardName}에 질문을 올립니다.
      </p>

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">과목</p>
      <select
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
      >
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

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

      {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}

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

function QuestionDetailSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/questions/${id}`)
      .then((r) => r.json())
      .then(setDetail);
  }, [id]);

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
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className="h-28 w-28 rounded-[2px] border border-[#16161614] object-cover" />
          ))}
        </div>
      )}

      {detail.postStatus === "posted" && (
        <div className="mb-6 border-t border-[#16161614] pt-4">
          <p className="m-0 mb-2 text-[13px] leading-5 text-[#161616]/50">
            댓글 {detail.commentCount}개 · 새 댓글이 달리면 이 앱에서 알려드려요.
          </p>
          {detail.cafeArticleUrl && (
            <a href={detail.cafeArticleUrl} target="_blank" rel="noreferrer" className="text-[13px] text-[#002a9e] underline underline-offset-[3px]">
              실제 카페 게시글에서 답변 확인하기 ↗
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
