"use client";

import { useEffect, useState } from "react";
import { SegTabs } from "@/components/ui/SegTabs";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { SUBJECTS, defaultMaxScoreFor } from "@/lib/subjects";

const TAGS = ["전체", "기출", "모평", "학평", "독서", "유형", "어법", "오답"];
const BOOK_SUBJECTS = SUBJECTS.filter((s) => s !== "기타").concat("기타");
const EXAM_SUBJECTS = SUBJECTS.filter((s) => s !== "기타");
const EXAM_TYPES = ["모평", "학평", "내신", "사설", "수능"];

interface BookItem {
  id: string;
  subject: string;
  title: string;
  publisher: string;
  tags: string[];
  todoCount: number;
}
interface ExamPaperItem {
  id: string;
  kind: "FULL" | "SUBJECT";
  subject: string | null;
  title: string;
  isSeries: boolean;
  type: string;
  examDate: string;
  maxScore: number | null;
  subjects: { subject: string; maxScore: number }[];
}

export function Materials() {
  const [tab, setTab] = useState<"book" | "exam">("book");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("전체");
  const [books, setBooks] = useState<BookItem[]>([]);
  const [papers, setPapers] = useState<ExamPaperItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editBook, setEditBook] = useState<BookItem | null>(null);
  const [editPaper, setEditPaper] = useState<ExamPaperItem | null>(null);

  function loadBooks() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tag !== "전체") params.set("tag", tag);
    fetch(`/api/materials/books?${params}`)
      .then((r) => r.json())
      .then(setBooks);
  }
  function loadPapers() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    fetch(`/api/materials/exam-papers?${params}`)
      .then((r) => r.json())
      .then(setPapers);
  }

  useEffect(() => {
    if (tab === "book") loadBooks();
    else loadPapers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query, tag]);

  async function deleteBook(id: string) {
    if (!window.confirm("이 교재를 삭제할까요? 연동된 투두의 교재 정보도 함께 사라집니다.")) return;
    await fetch(`/api/materials/books/${id}`, { method: "DELETE" });
    loadBooks();
  }
  async function deletePaper(id: string) {
    if (!window.confirm("이 시험지를 삭제할까요? 이 시험지로 등록된 성적도 함께 삭제됩니다.")) return;
    await fetch(`/api/materials/exam-papers/${id}`, { method: "DELETE" });
    loadPapers();
  }

  return (
    <div>
      <SegTabs
        tabs={[
          { id: "book" as const, label: "교재" },
          { id: "exam" as const, label: "시험지" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-7 flex items-center gap-2.5 rounded-[2px] border border-[#c6c6c6] px-3.5 py-3">
        <span className="relative h-[15px] w-[15px] flex-none rounded-full border-[1.5px] border-[#161616]/40">
          <span className="absolute -right-1 -bottom-[3px] h-[1.5px] w-[7px] rotate-45 bg-[#161616]/40" />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="교재·시험지 · 태그 검색"
          className="flex-1 border-none bg-transparent text-[15px] text-[#161616] outline-none lg:text-[16px]"
        />
      </div>
      {tab === "book" && (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto py-4">
          {TAGS.map((t) => (
            <Chip key={t} active={t === tag} onClick={() => setTag(t)} size="sm">
              {t}
            </Chip>
          ))}
        </div>
      )}

      {tab === "book" ? (
        <>
          <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-5 pb-3.5 lg:pt-7 lg:pb-[18px]">
            <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">교재</p>
            <button onClick={() => setAddOpen(true)} className="border-none bg-none p-0 text-[14px] text-[#161616] underline underline-offset-[3px] lg:text-[16px]">
              + 교재 등록
            </button>
          </div>
          {books.map((b) => (
            <div key={b.id} className="border-b border-[#16161614] py-4 lg:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Badge>{b.subject}</Badge>
                    <span className="text-[13px] text-[#161616]/40 lg:text-[14px]">{b.tags.join(" · ")}</span>
                  </div>
                  <p className="m-0 mb-0.5 text-[16px] leading-6 text-[#161616] lg:text-[20px] lg:leading-8">{b.title}</p>
                  <p className="m-0 text-[13px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">
                    {b.publisher} · 연동 투두 {b.todoCount}개
                  </p>
                </div>
                <div className="flex flex-none items-center gap-3 pt-1">
                  <button onClick={() => setEditBook(b)} className="border-none bg-none p-0 text-[13px] text-[#161616]/60 underline underline-offset-[3px]">
                    수정
                  </button>
                  <button onClick={() => deleteBook(b.id)} className="border-none bg-none p-0 text-[13px] text-[#e0362f]/80 underline underline-offset-[3px]">
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
          {books.length === 0 && <p className="m-0 py-12 text-center text-[14px] text-[#161616]/40">등록된 교재가 없습니다.</p>}
        </>
      ) : (
        <>
          <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-5 pb-3.5 lg:pt-7 lg:pb-[18px]">
            <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">시험지</p>
            <button onClick={() => setAddOpen(true)} className="border-none bg-none p-0 text-[14px] text-[#161616] underline underline-offset-[3px] lg:text-[16px]">
              + 시험지 등록
            </button>
          </div>
          {papers.map((p) => (
            <div key={p.id} className="border-b border-[#16161614] py-4 lg:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    {p.kind === "FULL" ? (
                      <>
                        <Badge>전과목</Badge>
                        {p.subjects.map((s) => (
                          <Badge key={s.subject}>{s.subject}</Badge>
                        ))}
                      </>
                    ) : (
                      <Badge>{p.subject}</Badge>
                    )}
                    <Badge>{p.type}</Badge>
                  </div>
                  <p className="m-0 mb-0.5 text-[16px] leading-6 text-[#161616] lg:text-[20px] lg:leading-8">{p.title}</p>
                  <p className="m-0 text-[13px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">
                    응시일 {p.examDate}
                    {p.kind === "SUBJECT" && p.maxScore != null && ` · 만점 ${p.maxScore}점`}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-3 pt-1">
                  <button onClick={() => setEditPaper(p)} className="border-none bg-none p-0 text-[13px] text-[#161616]/60 underline underline-offset-[3px]">
                    수정
                  </button>
                  <button onClick={() => deletePaper(p.id)} className="border-none bg-none p-0 text-[13px] text-[#e0362f]/80 underline underline-offset-[3px]">
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
          {papers.length === 0 && <p className="m-0 py-12 text-center text-[14px] text-[#161616]/40">등록된 시험지가 없습니다.</p>}
        </>
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        {tab === "book" ? (
          <BookForm
            onDone={() => {
              setAddOpen(false);
              loadBooks();
            }}
            onCancel={() => setAddOpen(false)}
          />
        ) : (
          <ExamPaperForm
            onDone={() => {
              setAddOpen(false);
              loadPapers();
            }}
            onCancel={() => setAddOpen(false)}
          />
        )}
      </Sheet>

      <Sheet open={!!editBook} onClose={() => setEditBook(null)}>
        {editBook && (
          <BookForm
            initial={editBook}
            onDone={() => {
              setEditBook(null);
              loadBooks();
            }}
            onCancel={() => setEditBook(null)}
          />
        )}
      </Sheet>

      <Sheet open={!!editPaper} onClose={() => setEditPaper(null)}>
        {editPaper && (
          <ExamPaperEditForm
            paper={editPaper}
            onDone={() => {
              setEditPaper(null);
              loadPapers();
            }}
            onCancel={() => setEditPaper(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function BookForm({ initial, onDone, onCancel }: { initial?: BookItem; onDone: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState(initial?.subject || BOOK_SUBJECTS[0]);
  const [title, setTitle] = useState(initial?.title || "");
  const [publisher, setPublisher] = useState(initial?.publisher || "");
  const [tags, setTags] = useState(initial?.tags.join(", ") || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim() || !publisher.trim() || saving) return;
    setSaving(true);
    const body = JSON.stringify({
      subject,
      title: title.trim(),
      publisher: publisher.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    if (initial) {
      await fetch(`/api/materials/books/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    } else {
      await fetch("/api/materials/books", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    }
    setSaving(false);
    onDone();
  }

  return (
    <div>
      <h2 className="m-0 mb-6 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">{initial ? "교재 수정" : "교재 등록"}</h2>
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">과목</p>
      <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none">
        {BOOK_SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">교재명</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 쎈 수학1" className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">출판사</p>
      <input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="예) 좋은책신사고" className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">태그 (쉼표로 구분)</p>
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예) 기출, 유형" className="mb-8 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
      <div className="flex gap-3">
        <button onClick={onCancel} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
          취소
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          {initial ? "저장하기" : "등록하기"}
        </button>
      </div>
    </div>
  );
}

interface SeriesOption {
  id: string;
  name: string;
  nextRound: number;
}

function ExamPaperForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [kind, setKind] = useState<"SUBJECT" | "FULL">("SUBJECT");
  const [subject, setSubject] = useState(EXAM_SUBJECTS[0]);
  const [mode, setMode] = useState<"standalone" | "series">("standalone");
  const [title, setTitle] = useState("");
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [round, setRound] = useState("");
  const [maxScore, setMaxScore] = useState(String(defaultMaxScoreFor(EXAM_SUBJECTS[0])));
  const [fullSubjects, setFullSubjects] = useState<Record<string, number | null>>({});
  const [type, setType] = useState(EXAM_TYPES[0]);
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== "SUBJECT" || mode !== "series") return;
    fetch(`/api/materials/exam-series?subject=${encodeURIComponent(subject)}`)
      .then((r) => r.json())
      .then((d: SeriesOption[]) => {
        setSeriesOptions(d);
        if (d.length > 0) {
          setSeriesId(d[0].id);
          setRound(String(d[0].nextRound));
        } else {
          setSeriesId("__new__");
          setRound("1");
        }
      });
  }, [kind, mode, subject]);

  function pickSeries(id: string) {
    setSeriesId(id);
    if (id === "__new__") {
      setRound("1");
    } else {
      const s = seriesOptions.find((s) => s.id === id);
      setRound(String(s?.nextRound ?? 1));
    }
  }

  function toggleFullSubject(s: string) {
    setFullSubjects((prev) => {
      const next = { ...prev };
      if (next[s] != null) delete next[s];
      else next[s] = defaultMaxScoreFor(s);
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!examDate.trim()) {
      setError("응시일을 입력해 주세요.");
      return;
    }

    let body: Record<string, unknown>;
    if (kind === "FULL") {
      const subjects = Object.entries(fullSubjects)
        .filter(([, v]) => v != null)
        .map(([subject, maxScore]) => ({ subject, maxScore }));
      if (!title.trim()) {
        setError("시험지 이름을 입력해 주세요.");
        return;
      }
      if (subjects.length === 0) {
        setError("과목을 하나 이상 선택해 주세요.");
        return;
      }
      body = { kind: "FULL", title: title.trim(), type, examDate: examDate.trim(), subjects };
    } else {
      if (!maxScore || Number(maxScore) < 1) {
        setError("만점을 입력해 주세요.");
        return;
      }
      if (mode === "standalone") {
        if (!title.trim()) {
          setError("시험지 이름을 입력해 주세요.");
          return;
        }
        body = { kind: "SUBJECT", subject, mode: "standalone", title: title.trim(), type, examDate: examDate.trim(), maxScore: Number(maxScore) };
      } else {
        if (!round || Number(round) < 1) {
          setError("회차를 입력해 주세요.");
          return;
        }
        body = {
          kind: "SUBJECT",
          subject,
          mode: "series",
          type,
          examDate: examDate.trim(),
          maxScore: Number(maxScore),
          round: Number(round),
          ...(seriesId === "__new__" ? { newSeriesName: newSeriesName.trim() } : { seriesId }),
        };
      }
    }

    setSaving(true);
    const res = await fetch("/api/materials/exam-papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "등록에 실패했습니다.");
      return;
    }
    onDone();
  }

  return (
    <div>
      <h2 className="m-0 mb-6 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">시험지 등록</h2>

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">시험지 종류</p>
      <div className="mb-6 flex gap-2">
        <Chip active={kind === "SUBJECT"} onClick={() => setKind("SUBJECT")}>
          과목별 모의고사
        </Chip>
        <Chip active={kind === "FULL"} onClick={() => setKind("FULL")}>
          풀 모의고사 (전과목)
        </Chip>
      </div>

      {kind === "SUBJECT" ? (
        <>
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">과목</p>
          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setMaxScore(String(defaultMaxScoreFor(e.target.value)));
            }}
            className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
          >
            {EXAM_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">등록 방식</p>
          <div className="mb-5 flex gap-2">
            <Chip active={mode === "standalone"} onClick={() => setMode("standalone")} size="sm">
              단일 등록
            </Chip>
            <Chip active={mode === "series"} onClick={() => setMode("series")} size="sm">
              시리즈 (회차별)
            </Chip>
          </div>

          {mode === "standalone" ? (
            <>
              <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">시험지명</p>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 2026학년도 6월 모의평가 수학" className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
            </>
          ) : (
            <>
              <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">시리즈</p>
              <select value={seriesId} onChange={(e) => pickSeries(e.target.value)} className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none">
                {seriesOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="__new__">+ 새 시리즈 만들기</option>
              </select>
              {seriesId === "__new__" && (
                <input
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  placeholder="예) 시대인재 모의고사"
                  className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
                />
              )}
              <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">회차</p>
              <input value={round} onChange={(e) => setRound(e.target.value)} inputMode="numeric" placeholder="1" className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
            </>
          )}

          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">만점</p>
          <input value={maxScore} onChange={(e) => setMaxScore(e.target.value)} inputMode="numeric" className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
        </>
      ) : (
        <>
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">시험지명</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 2026학년도 6월 모의평가" className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />

          <p className="m-0 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">포함 과목 · 만점</p>
          <div className="mb-5 flex flex-col gap-2.5">
            {EXAM_SUBJECTS.map((s) => (
              <div key={s} className="flex items-center gap-3">
                <Chip active={fullSubjects[s] != null} onClick={() => toggleFullSubject(s)} size="sm">
                  {s}
                </Chip>
                {fullSubjects[s] != null && (
                  <input
                    value={fullSubjects[s] ?? ""}
                    onChange={(e) => setFullSubjects((prev) => ({ ...prev, [s]: Number(e.target.value) || 0 }))}
                    inputMode="numeric"
                    placeholder="만점"
                    className="w-20 border-0 border-b border-[#161616]/50 bg-transparent py-1.5 text-[14px] text-[#161616] outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">시험 종류</p>
      <select value={type} onChange={(e) => setType(e.target.value)} className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none">
        {EXAM_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">응시일</p>
      <input value={examDate} onChange={(e) => setExamDate(e.target.value)} placeholder="26.06.04" className="mb-8 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />

      {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
          취소
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          등록하기
        </button>
      </div>
    </div>
  );
}

function ExamPaperEditForm({ paper, onDone, onCancel }: { paper: ExamPaperItem; onDone: () => void; onCancel: () => void }) {
  const [type, setType] = useState(paper.type);
  const [examDate, setExamDate] = useState(paper.examDate);
  const [title, setTitle] = useState(paper.title);
  const [maxScore, setMaxScore] = useState(String(paper.maxScore ?? ""));
  const [subjectScores, setSubjectScores] = useState(paper.subjects.map((s) => ({ ...s })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSaving(true);
    const body: Record<string, unknown> = { type, examDate: examDate.trim(), title: title.trim() };
    if (paper.kind === "SUBJECT") body.maxScore = Number(maxScore) || undefined;
    else body.subjects = subjectScores;
    const res = await fetch(`/api/materials/exam-papers/${paper.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "저장에 실패했습니다.");
      return;
    }
    onDone();
  }

  return (
    <div>
      <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">시험지 수정</h2>
      <p className="m-0 mb-6 text-[14px] leading-6 text-[#161616]/50">
        {paper.kind === "FULL" ? "전과목" : paper.subject} · {paper.title}
      </p>

      {!paper.isSeries && (
        <>
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">시험지명</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
        </>
      )}

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">시험 종류</p>
      <select value={type} onChange={(e) => setType(e.target.value)} className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none">
        {EXAM_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">응시일</p>
      <input value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />

      {paper.kind === "SUBJECT" ? (
        <>
          <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">만점</p>
          <input value={maxScore} onChange={(e) => setMaxScore(e.target.value)} inputMode="numeric" className="mb-8 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
        </>
      ) : (
        <>
          <p className="m-0 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">과목별 만점</p>
          <div className="mb-8 flex flex-col gap-2.5">
            {subjectScores.map((s, i) => (
              <div key={s.subject} className="flex items-center gap-3">
                <Badge>{s.subject}</Badge>
                <input
                  value={s.maxScore}
                  onChange={(e) =>
                    setSubjectScores((prev) => prev.map((p, j) => (j === i ? { ...p, maxScore: Number(e.target.value) || 0 } : p)))
                  }
                  inputMode="numeric"
                  className="w-20 border-0 border-b border-[#161616]/50 bg-transparent py-1.5 text-[14px] text-[#161616] outline-none"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
          취소
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          저장하기
        </button>
      </div>
    </div>
  );
}
