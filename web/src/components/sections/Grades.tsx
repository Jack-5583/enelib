"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";

const TYPE_FILTERS = ["전체", "모평", "학평", "내신", "사설"];
const REGISTER_TYPES = ["모평", "학평", "내신", "사설", "수능"];

interface GradesData {
  subjectChips: string[];
  subject: string;
  typeLabel: string;
  subjSummary: { latest: number | null; best: number | null; count: number; deltaLabel: string };
  subjTrend: { W: number; H: number; points: string; dots: { cx: string; cy: string; label: string }[] };
  exams: { id: string; type: string; name: string; date: string; grade: number; raw: number; pct: number | null }[];
}

interface ExamDetail {
  id: string;
  subject: string;
  type: string;
  name: string;
  date: string;
  grade: number;
  raw: number;
  pct: number | null;
  std: number | null;
  wrong: string[];
  memo: string | null;
}

export function Grades({ studentId, readOnly = false, contextLabel }: { studentId?: string; readOnly?: boolean; contextLabel?: string }) {
  const [subject, setSubject] = useState<string | null>(null);
  const [typeLabel, setTypeLabel] = useState("전체");
  const [data, setData] = useState<GradesData | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  function load(subj: string | null, type: string) {
    const params = new URLSearchParams();
    if (subj) params.set("subject", subj);
    params.set("type", type);
    if (studentId) params.set("studentId", studentId);
    fetch(`/api/grades?${params}`)
      .then((r) => r.json())
      .then((d: GradesData) => {
        setData(d);
        setSubject(d.subject);
      });
  }

  useEffect(() => {
    load(subject, typeLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  function pickSubject(s: string) {
    setTypeLabel("전체");
    load(s, "전체");
  }
  function pickType(t: string) {
    setTypeLabel(t);
    load(subject, t);
  }

  if (!data) return null;

  return (
    <div>
      {readOnly && contextLabel && (
        <div className="pt-8">
          <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">연동된 학생</p>
          <h2 className="m-0 mb-5 text-[24px] leading-8 font-extralight tracking-[-0.02em] text-[#161616] lg:text-[28px] lg:leading-10">
            {contextLabel}
          </h2>
        </div>
      )}
      <div className={`scrollbar-hide flex flex-nowrap gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible ${readOnly ? "pt-1" : "pt-8"}`}>
        {data.subjectChips.map((s) => (
          <Chip key={s} active={s === data.subject} onClick={() => pickSubject(s)}>
            {s}
          </Chip>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-5 border border-[#16161614] p-4.5 lg:flex-row lg:items-center lg:gap-8 lg:p-7">
        <div className="flex-none lg:border-r lg:border-[#16161614] lg:pr-8">
          <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">{data.subject} 최근 등급</p>
          <div className="flex items-end gap-2">
            <span className="text-[40px] leading-none font-extralight tracking-[-0.02em] text-[#161616] lg:text-[56px]">
              {data.subjSummary.latest ?? "—"}
            </span>
            <span className="pb-1 text-[14px] text-[#161616]/50 lg:text-[16px]">등급</span>
          </div>
          <p className="m-0 mt-2 text-[13px] leading-5 text-[#003ce0] lg:text-[14px] lg:leading-6">{data.subjSummary.deltaLabel}</p>
          <p className="m-0 mt-0.5 text-[12px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">
            최고 {data.subjSummary.best ?? "—"}등급 · 기록 {data.subjSummary.count}개
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <svg viewBox={`0 0 ${data.subjTrend.W} ${data.subjTrend.H}`} className="block w-full overflow-visible">
            <polyline points={data.subjTrend.points} fill="none" stroke="#161616" strokeWidth={1.5} />
            {data.subjTrend.dots.map((d, i) => (
              <circle key={i} cx={d.cx} cy={d.cy} r={4} fill="#161616" />
            ))}
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-6 pb-1">
        {TYPE_FILTERS.map((t) => (
          <Chip key={t} active={t === data.typeLabel} onClick={() => pickType(t)} size="sm">
            {t}
          </Chip>
        ))}
      </div>

      <div className="flex items-baseline justify-between border-b border-[#161616]/96 py-4">
        <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">
          {data.subject} 시험 {data.exams.length}개
        </p>
        {!readOnly && (
          <button onClick={() => setRegisterOpen(true)} className="border-none bg-none p-0 text-[14px] text-[#161616] underline underline-offset-[3px] lg:text-[16px]">
            + 시험 등록
          </button>
        )}
      </div>

      {data.exams.map((e) => (
        <button
          key={e.id}
          onClick={() => setDetailId(e.id)}
          className="flex w-full items-center gap-4 border-0 border-b border-[#16161614] bg-white py-[18px] text-left lg:gap-5 lg:py-[22px]"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <Badge>{e.type}</Badge>
              <span className="text-[13px] text-[#161616]/50 lg:text-[14px]">{e.date}</span>
            </div>
            <p className="m-0 text-[16px] leading-6 text-[#161616] lg:text-[20px] lg:leading-8">{e.name}</p>
          </div>
          {e.pct != null && (
            <div className="hidden flex-none pr-2 text-right lg:block">
              <p className="m-0 text-[14px] leading-5 text-[#161616]/50">백분위</p>
              <p className="m-0 text-[20px] leading-[26px] font-light text-[#161616]">{e.pct}</p>
            </div>
          )}
          <div className="w-20 flex-none text-right lg:w-24">
            <p className="m-0 text-[26px] leading-8 font-extralight text-[#161616] lg:text-[32px] lg:leading-9">
              {e.grade}
              <span className="text-[13px] text-[#161616]/50 lg:text-[14px]"> 등급</span>
            </p>
            <p className="m-0 text-[12px] leading-5 text-[#161616]/50 lg:text-[14px]">원점수 {e.raw}</p>
          </div>
          <span className="flex-none text-[16px] text-[#161616]/30">→</span>
        </button>
      ))}
      {data.exams.length === 0 && (
        <p className="m-0 py-12 text-center text-[15px] text-[#161616]/40">해당 종류의 시험 기록이 없습니다.{!readOnly && " '+ 시험 등록'으로 추가하세요."}</p>
      )}

      {detailId && (
        <ExamDetailSheet
          id={detailId}
          readOnly={readOnly}
          onClose={() => setDetailId(null)}
          onChanged={() => load(subject, typeLabel)}
        />
      )}

      {registerOpen && data.subject && (
        <RegisterSheet
          subject={data.subject}
          onClose={() => setRegisterOpen(false)}
          onSaved={() => {
            setRegisterOpen(false);
            load(subject, typeLabel);
          }}
        />
      )}
    </div>
  );
}

function ExamDetailSheet({
  id,
  readOnly,
  onClose,
  onChanged,
}: {
  id: string;
  readOnly: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<ExamDetail | null>(null);
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/grades/${id}`)
      .then((r) => r.json())
      .then((d: ExamDetail) => {
        setDetail(d);
        setMemoDraft(d.memo || "");
      });
  }, [id]);

  async function saveMemo() {
    setSaving(true);
    await fetch(`/api/grades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo: memoDraft }),
    });
    setSaving(false);
    setEditingMemo(false);
    setDetail((d) => (d ? { ...d, memo: memoDraft } : d));
    onChanged();
  }

  if (!detail) return null;

  return (
    <Sheet open onClose={onClose} maxWidth={640}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge>{detail.subject}</Badge>
            <Badge>{detail.type}</Badge>
            <span className="text-[13px] text-[#161616]/50">{detail.date}</span>
          </div>
          <h2 className="m-0 mt-3 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">{detail.name}</h2>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 border-t border-[#16161614] lg:grid-cols-4">
        <div className="border-b border-[#16161614] py-4 pr-4 lg:border-b-0 lg:pr-5">
          <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50">등급</p>
          <p className="m-0 text-[26px] leading-8 font-light text-[#161616] lg:text-[30px] lg:leading-9">{detail.grade}</p>
        </div>
        <div className="border-b border-l border-[#16161614] py-4 pl-4 lg:border-b-0 lg:px-5">
          <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50">원점수</p>
          <p className="m-0 text-[26px] leading-8 font-light text-[#161616] lg:text-[30px] lg:leading-9">{detail.raw}</p>
        </div>
        <div className="border-l border-[#16161614] py-4 pr-4 lg:pl-0">
          <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50">백분위</p>
          <p className="m-0 text-[26px] leading-8 font-light text-[#161616] lg:text-[30px] lg:leading-9">{detail.pct ?? "—"}</p>
        </div>
        <div className="border-t border-l border-[#16161614] py-4 pl-4 lg:border-t-0 lg:px-5">
          <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50">표준점수</p>
          <p className="m-0 text-[26px] leading-8 font-light text-[#161616] lg:text-[30px] lg:leading-9">{detail.std ?? "—"}</p>
        </div>
      </div>

      <div className="mt-7 border-b border-[#161616]/96 pb-3">
        <p className="m-0 text-[16px] leading-6 font-semibold text-[#161616] lg:text-[18px] lg:leading-7">
          틀린 문항 <span className="font-normal text-[#161616]/40">{detail.wrong.length}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 py-3.5">
        {detail.wrong.map((w, i) => (
          <span key={i} className="inline-block rounded-[2px] border border-[#c6c6c6] bg-white px-2.5 py-0.5 text-[13px] text-[#393939] lg:px-3 lg:text-[14px]">
            {w}
          </span>
        ))}
        {detail.wrong.length === 0 && <span className="text-[13px] text-[#161616]/40">기록 없음</span>}
      </div>

      <div className="mt-3 flex items-baseline justify-between border-b border-[#161616]/96 pb-3">
        <p className="m-0 text-[16px] leading-6 font-semibold text-[#161616] lg:text-[18px] lg:leading-7">복기 메모</p>
        {!readOnly && !editingMemo && (
          <button onClick={() => setEditingMemo(true)} className="border-none bg-none p-0 text-[13px] text-[#161616]/60 underline underline-offset-[3px]">
            {detail.memo ? "수정" : "작성"}
          </button>
        )}
      </div>
      {editingMemo ? (
        <div className="pt-3.5">
          <textarea
            value={memoDraft}
            onChange={(e) => setMemoDraft(e.target.value)}
            rows={4}
            className="w-full resize-none border border-[#16161614] p-3 text-[14px] leading-6 text-[#161616] outline-none"
          />
          <div className="mt-3 flex gap-2.5">
            <button onClick={() => setEditingMemo(false)} className="w-[88px] flex-none rounded-[2px] border border-[#161616] bg-white py-3 text-[14px] font-medium text-[#161616]">
              취소
            </button>
            <button onClick={saveMemo} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3 text-[15px] font-semibold text-white disabled:opacity-50">
              저장
            </button>
          </div>
        </div>
      ) : detail.memo ? (
        <p className="m-0 mt-4 bg-[#f4f4f4] px-5 py-4.5 text-[15px] leading-7 text-[#393939] lg:text-[16px] lg:leading-7">{detail.memo}</p>
      ) : (
        <p className="m-0 py-4.5 text-[15px] text-[#161616]/40">작성된 복기 메모가 없습니다.</p>
      )}
    </Sheet>
  );
}

function RegisterSheet({ subject, onClose, onSaved }: { subject: string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState(REGISTER_TYPES[0]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [grade, setGrade] = useState("");
  const [raw, setRaw] = useState("");
  const [pct, setPct] = useState("");
  const [std, setStd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !date.trim() || !grade || !raw) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        type,
        name: name.trim(),
        date: date.trim(),
        raw: Number(raw),
        grade: Number(grade),
        pct: pct ? Number(pct) : null,
        std: std ? Number(std) : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "등록에 실패했습니다.");
      return;
    }
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} maxWidth={560}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="m-0 mb-1 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">시험 등록</h2>
          <p className="m-0 text-[14px] leading-6 text-[#161616]/50 lg:text-[16px] lg:leading-7">
            <span className="font-semibold text-[#161616]">{subject}</span> 과목에 새 시험 기록을 추가합니다.
          </p>
        </div>
      </div>

      <p className="m-0 mt-7 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">시험 종류</p>
      <div className="mb-6 flex flex-wrap gap-2">
        {REGISTER_TYPES.map((t) => (
          <Chip key={t} active={t === type} onClick={() => setType(t)} size="sm">
            {t}
          </Chip>
        ))}
      </div>

      <p className="m-0 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">시험 이름</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 2026학년도 6월 모의평가" className="mb-6 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />

      <div className="mb-6 flex gap-5">
        <div className="flex-1">
          <p className="m-0 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">응시일</p>
          <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="26.07.10" className="w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
        </div>
        <div className="flex-1">
          <p className="m-0 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">등급</p>
          <input value={grade} onChange={(e) => setGrade(e.target.value)} inputMode="numeric" placeholder="2" className="w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
        </div>
      </div>

      <div className="flex gap-5">
        <div className="flex-1">
          <p className="m-0 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">원점수</p>
          <input value={raw} onChange={(e) => setRaw(e.target.value)} inputMode="numeric" placeholder="88" className="w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
        </div>
        <div className="flex-1">
          <p className="m-0 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">
            백분위 <span className="font-normal text-[#161616]/40">선택</span>
          </p>
          <input value={pct} onChange={(e) => setPct(e.target.value)} inputMode="numeric" placeholder="89" className="w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
        </div>
        <div className="flex-1">
          <p className="m-0 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">
            표준점수 <span className="font-normal text-[#161616]/40">선택</span>
          </p>
          <input value={std} onChange={(e) => setStd(e.target.value)} inputMode="numeric" placeholder="130" className="w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none" />
        </div>
      </div>

      {error && <p className="m-0 mt-4 text-[13px] text-[#e0362f]">{error}</p>}

      <div className="mt-9 flex gap-3">
        <button onClick={onClose} className="w-[120px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[16px] font-medium text-[#161616]">
          취소
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          등록하기
        </button>
      </div>
    </Sheet>
  );
}
