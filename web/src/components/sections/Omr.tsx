"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OmrSheet } from "@/components/omr/OmrSheet";
import { SUBJECT_PRESETS, customChoiceConfig, sumPoints, type OmrConfig, type OmrAnswers } from "@/lib/omr";

interface SheetListItem {
  id: string;
  title: string;
  subject: string;
  questionCount: number;
  maxScore: number;
  keyComplete: boolean;
  lastResult: { raw: number; total: number; correctCount: number; createdAt: string } | null;
}

type View = { name: "list" } | { name: "create" } | { name: "fill"; id: string };

export function Omr() {
  const [view, setView] = useState<View>({ name: "list" });

  return (
    <div className="pb-16">
      <div className="flex items-center justify-between border-b border-[#161616]/96 pt-8 pb-4 lg:pt-10">
        <div className="flex items-center gap-2">
          <Link href="/grades" className="text-[14px] text-[#161616]/50 no-underline">← 성적</Link>
          <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px]">OMR 채점</p>
        </div>
        {view.name !== "list" && (
          <button onClick={() => setView({ name: "list" })} className="border-none bg-none p-0 text-[14px] text-[#161616]/60 underline underline-offset-[3px]">
            목록
          </button>
        )}
      </div>

      {view.name === "list" && <OmrListView onCreate={() => setView({ name: "create" })} onOpen={(id) => setView({ name: "fill", id })} />}
      {view.name === "create" && <OmrCreateView onDone={() => setView({ name: "list" })} />}
      {view.name === "fill" && <OmrFillView id={view.id} onClose={() => setView({ name: "list" })} />}
    </div>
  );
}

function OmrListView({ onCreate, onOpen }: { onCreate: () => void; onOpen: (id: string) => void }) {
  const [sheets, setSheets] = useState<SheetListItem[] | null>(null);

  function load() {
    fetch("/api/omr/sheets").then((r) => r.json()).then((d) => setSheets(Array.isArray(d) ? d : [])).catch(() => setSheets([]));
  }
  useEffect(load, []);

  async function del(id: string) {
    if (!window.confirm("이 OMR을 삭제할까요? 채점 기록도 함께 삭제됩니다.")) return;
    await fetch(`/api/omr/sheets/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <button onClick={onCreate} className="mt-5 w-full rounded-[2px] border-none bg-[#161616] py-3.5 text-[15px] font-semibold text-white">
        + 새 OMR 만들기
      </button>

      <p className="m-0 mt-6 mb-1 text-[13px] text-[#161616]/50">시험지·학습자료의 정답을 한 번 등록해두면, OMR로 답을 표기하고 바로 채점할 수 있어요.</p>

      {sheets == null && <p className="m-0 py-10 text-center text-[14px] text-[#161616]/40">불러오는 중…</p>}
      {sheets?.length === 0 && <p className="m-0 py-10 text-center text-[14px] text-[#161616]/40">아직 만든 OMR이 없습니다.</p>}

      {sheets?.map((s) => (
        <div key={s.id} className="flex items-center gap-3 border-0 border-b border-[#16161614] py-4">
          <button onClick={() => onOpen(s.id)} className="min-w-0 flex-1 border-none bg-none p-0 text-left">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-[#161616]/6 px-2 py-0.5 text-[12px] text-[#161616]/70">{s.subject}</span>
              <span className="text-[12px] text-[#161616]/40">{s.questionCount}문항 · {s.maxScore}점</span>
              {!s.keyComplete && <span className="text-[12px] text-[#e0362f]">정답 미완성</span>}
            </div>
            <p className="m-0 text-[15px] leading-6 text-[#161616] lg:text-[16px]">{s.title}</p>
            {s.lastResult && (
              <p className="m-0 mt-0.5 text-[12px] text-[#161616]/50">
                최근 채점 {s.lastResult.raw}/{s.lastResult.total}점 · {s.lastResult.correctCount}개 정답
              </p>
            )}
          </button>
          <button onClick={() => del(s.id)} className="flex-none rounded-full border border-[#16161624] bg-white px-2.5 py-1 text-[12px] text-[#161616]/50">
            삭제
          </button>
        </div>
      ))}
    </div>
  );
}

function OmrCreateView({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [presetId, setPresetId] = useState("korean");
  const [customCount, setCustomCount] = useState("20");
  const [config, setConfig] = useState<OmrConfig>([]);
  const [subject, setSubject] = useState("국어");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toStep2() {
    const preset = SUBJECT_PRESETS.find((p) => p.id === presetId);
    if (presetId === "custom") {
      setSubject("기타");
      setConfig(customChoiceConfig(Number(customCount) || 20));
    } else if (preset) {
      setSubject(preset.subject);
      setConfig(preset.build());
    }
    if (!title.trim()) setError("제목을 입력해주세요.");
    else {
      setError(null);
      setStep(2);
    }
  }

  const keyValues: OmrAnswers = Object.fromEntries(config.map((q) => [String(q.no), q.answer]));
  function setKey(no: number, value: string) {
    setConfig((prev) => prev.map((q) => (q.no === no ? { ...q, answer: value } : q)));
  }

  async function save() {
    const missing = config.filter((q) => q.answer === "").length;
    if (missing > 0) {
      setError(`정답이 입력되지 않은 문항이 ${missing}개 있습니다.`);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/omr/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), subject, config }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "저장에 실패했습니다.");
      return;
    }
    onDone();
  }

  if (step === 1) {
    return (
      <div className="mt-6 max-w-[520px]">
        <p className="m-0 mb-2 text-[13px] font-semibold text-[#161616]">제목</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 6월 모평 수학, 신성규 3회"
          className="mb-6 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
        />

        <p className="m-0 mb-2 text-[13px] font-semibold text-[#161616]">과목/양식</p>
        <div className="flex flex-col gap-2">
          {SUBJECT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPresetId(p.id)}
              className={`flex items-center justify-between border px-4 py-3 text-left text-[15px] ${presetId === p.id ? "border-[#161616] bg-[#161616]/4" : "border-[#16161614]"}`}
            >
              <span className="text-[#161616]">{p.label}</span>
              {presetId === p.id && <span className="text-[#161616]">✓</span>}
            </button>
          ))}
          <button
            onClick={() => setPresetId("custom")}
            className={`flex items-center gap-3 border px-4 py-3 text-left text-[15px] ${presetId === "custom" ? "border-[#161616] bg-[#161616]/4" : "border-[#16161614]"}`}
          >
            <span className="text-[#161616]">직접 설정</span>
            {presetId === "custom" && (
              <input
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value.replace(/[^0-9]/g, ""))}
                onClick={(e) => e.stopPropagation()}
                inputMode="numeric"
                className="w-16 border-0 border-b border-[#161616]/50 bg-transparent py-1 text-center text-[15px] outline-none"
              />
            )}
            {presetId === "custom" && <span className="text-[13px] text-[#161616]/50">문항 (5지선다)</span>}
          </button>
        </div>

        {error && <p className="m-0 mt-4 text-[13px] text-[#e0362f]">{error}</p>}

        <button onClick={toStep2} className="mt-6 w-full rounded-[2px] border-none bg-[#161616] py-3.5 text-[15px] font-semibold text-white">
          다음 · 정답 입력
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="m-0 text-[14px] font-semibold text-[#161616]">정답 표기 <span className="font-normal text-[#161616]/50">— 각 문항의 정답을 표기하세요 · 만점 {sumPoints(config)}점</span></p>
      </div>
      <OmrSheet subject={subject} title={title} config={config} values={keyValues} onChange={setKey} />

      {error && <p className="m-0 mt-4 text-[13px] text-[#e0362f]">{error}</p>}

      <div className="mt-5 flex gap-3">
        <button onClick={() => setStep(1)} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
          뒤로
        </button>
        <button onClick={save} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
          {saving ? "저장 중…" : "정답 저장하기"}
        </button>
      </div>
    </div>
  );
}

interface FullSheet {
  id: string;
  title: string;
  subject: string;
  config: OmrConfig;
  maxScore: number;
}

interface GradeResult {
  raw: number;
  total: number;
  correctCount: number;
  answeredCount: number;
  questionCount: number;
  wrongNos: number[];
  blankNos: number[];
  perQuestion: { no: number; correct: boolean; blank: boolean }[];
}

function OmrFillView({ id, onClose }: { id: string; onClose: () => void }) {
  const [sheet, setSheet] = useState<FullSheet | null>(null);
  const [answers, setAnswers] = useState<OmrAnswers>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/omr/sheets/${id}`)
      .then((r) => r.json())
      .then((d: FullSheet) => setSheet(d))
      .catch(() => setError("불러오지 못했습니다."));
  }, [id]);

  function mark(no: number, value: string) {
    if (result) return; // locked after grading
    setAnswers((prev) => ({ ...prev, [String(no)]: value }));
  }

  async function grade() {
    if (!sheet) return;
    setGrading(true);
    setError(null);
    const res = await fetch(`/api/omr/sheets/${id}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setGrading(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "채점에 실패했습니다.");
      return;
    }
    setResult(d as GradeResult);
  }

  if (!sheet) return <p className="m-0 py-12 text-center text-[14px] text-[#161616]/40">{error || "불러오는 중…"}</p>;

  const correctMap: OmrAnswers = Object.fromEntries(sheet.config.map((q) => [String(q.no), q.answer]));
  const statusByNo: Record<string, "correct" | "wrong" | "blank" | undefined> = {};
  if (result) {
    for (const pq of result.perQuestion) statusByNo[String(pq.no)] = pq.correct ? "correct" : pq.blank ? "blank" : "wrong";
  }
  const pct = result && result.total > 0 ? Math.round((result.raw / result.total) * 100) : 0;

  return (
    <div className="mt-5">
      {result && (
        <div className="mb-5 border border-[#161616] bg-[#161616] px-5 py-4 text-white">
          <div className="flex items-end justify-between">
            <div>
              <p className="m-0 text-[13px] text-white/60">{sheet.title}</p>
              <p className="m-0 mt-1 text-[13px] text-white/80">
                {result.correctCount}/{result.questionCount}개 정답 · 백분율 {pct}%
              </p>
            </div>
            <div className="text-right">
              <span className="text-[40px] leading-none font-extralight">{result.raw}</span>
              <span className="text-[15px] text-white/60"> / {result.total}점</span>
            </div>
          </div>
          {result.wrongNos.length > 0 && (
            <p className="m-0 mt-3 border-t border-white/15 pt-3 text-[13px] leading-6 text-white/80">
              틀린 문항 <span className="text-white">{result.wrongNos.join(", ")}</span>
            </p>
          )}
          {result.blankNos.length > 0 && (
            <p className="m-0 mt-1 text-[12px] leading-5 text-white/50">미표기 {result.blankNos.join(", ")}</p>
          )}
        </div>
      )}

      {!result && (
        <p className="m-0 mb-3 text-[13px] text-[#161616]/50">답을 표기한 뒤 아래 <span className="font-semibold text-[#161616]">채점하기</span>를 누르세요.</p>
      )}

      <OmrSheet
        subject={sheet.subject}
        title={sheet.title}
        config={sheet.config}
        values={answers}
        onChange={mark}
        showCorrect={!!result}
        correct={result ? correctMap : undefined}
        statusByNo={result ? statusByNo : undefined}
        readOnly={!!result}
      />

      {error && <p className="m-0 mt-4 text-[13px] text-[#e0362f]">{error}</p>}

      <div className="mt-5 flex gap-3">
        {!result ? (
          <>
            <button onClick={onClose} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
              취소
            </button>
            <button onClick={grade} disabled={grading} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
              {grading ? "채점 중…" : "채점하기"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              className="flex-1 rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]"
            >
              다시 풀기
            </button>
            <button onClick={onClose} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[15px] font-semibold text-white">
              완료
            </button>
          </>
        )}
      </div>
    </div>
  );
}
