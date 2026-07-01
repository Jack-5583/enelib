"use client";

import { useEffect, useState } from "react";
import { SegTabs } from "@/components/ui/SegTabs";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";

const TAGS = ["전체", "기출", "모평", "학평", "독서", "유형", "어법", "오답"];
const SUBJECTS = ["국어", "수학", "영어", "생명과학1", "지구과학1", "기타"];
const EXAM_TAGS = ["모평", "학평", "내신", "사설", "수능"];

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
  subject: string;
  title: string;
  tag: string;
  examDate: string;
}

export function Materials() {
  const [tab, setTab] = useState<"book" | "exam">("book");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("전체");
  const [books, setBooks] = useState<BookItem[]>([]);
  const [papers, setPapers] = useState<ExamPaperItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);

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
              <div className="mb-1.5 flex items-center gap-2">
                <Badge>{b.subject}</Badge>
                <span className="text-[13px] text-[#161616]/40 lg:text-[14px]">{b.tags.join(" · ")}</span>
              </div>
              <p className="m-0 mb-0.5 text-[16px] leading-6 text-[#161616] lg:text-[20px] lg:leading-8">{b.title}</p>
              <p className="m-0 text-[13px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">
                {b.publisher} · 연동 투두 {b.todoCount}개
              </p>
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
              <div className="mb-1.5 flex items-center gap-2">
                <Badge>{p.subject}</Badge>
                <Badge>{p.tag}</Badge>
              </div>
              <p className="m-0 mb-0.5 text-[16px] leading-6 text-[#161616] lg:text-[20px] lg:leading-8">{p.title}</p>
              <p className="m-0 text-[13px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">응시일 {p.examDate}</p>
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
    </div>
  );
}

function BookForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim() || !publisher.trim() || saving) return;
    setSaving(true);
    await fetch("/api/materials/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        title: title.trim(),
        publisher: publisher.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div>
      <h2 className="m-0 mb-6 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">교재 등록</h2>
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">과목</p>
      <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none">
        {SUBJECTS.map((s) => (
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
          등록하기
        </button>
      </div>
    </div>
  );
}

function ExamPaperForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState(EXAM_TAGS[0]);
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim() || !examDate.trim() || saving) return;
    setSaving(true);
    await fetch("/api/materials/exam-papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, title: title.trim(), tag, examDate: examDate.trim() }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div>
      <h2 className="m-0 mb-6 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">시험지 등록</h2>
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">과목</p>
      <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none">
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">종류</p>
      <select value={tag} onChange={(e) => setTag(e.target.value)} className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none">
        {EXAM_TAGS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">시험지명</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 2026학년도 6월 모의평가 국어" className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
      <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">응시일</p>
      <input value={examDate} onChange={(e) => setExamDate(e.target.value)} placeholder="26.06.04" className="mb-8 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
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
