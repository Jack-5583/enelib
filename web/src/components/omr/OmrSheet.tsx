"use client";

import { useMemo } from "react";
import type { OmrConfig, OmrQuestion, OmrAnswers } from "@/lib/omr";

// A faithful reproduction of the 수능 OMR 답안지 (as in the provided PDF):
// a title bar, the identity block (성명 · 수험번호 · 문형), and the bordered
// 문번/답란 answer grid with ①–⑤ ovals, 공통과목/선택과목 sections, and 단답형
// 백·십·일 digit grids. Responsive: the answer columns sit side-by-side on
// PC/tablet and stack on phones, keeping the form's structure.

const SUBJECT_COLOR: Record<string, string> = {
  국어: "#009e73",
  수학: "#e5197f",
  영어: "#2f6fb0",
  한국사: "#b0561f",
  탐구: "#6b3fb0",
};
const SELECT_COLOR = "#2f6fb0"; // 선택과목 blue, as on the sheet
const KYOSHI: Record<string, string> = { 국어: "1", 수학: "2", 영어: "3", 한국사: "4", 탐구: "4" };
const OK = "#0f9d58";
const NO = "#e0362f";

type Status = "correct" | "wrong" | "blank" | undefined;

export function OmrSheet({
  subject,
  title,
  studentName = "",
  config,
  values,
  onChange,
  showCorrect = false,
  correct,
  statusByNo,
  readOnly = false,
}: {
  subject: string;
  title?: string;
  studentName?: string;
  config: OmrConfig;
  values: OmrAnswers;
  onChange?: (no: number, value: string) => void;
  showCorrect?: boolean;
  correct?: OmrAnswers;
  statusByNo?: Record<string, Status>;
  readOnly?: boolean;
}) {
  const base = SUBJECT_COLOR[subject] ?? "#161616";

  const sections = useMemo(() => {
    const order: (string | undefined)[] = [];
    for (const q of config) if (!order.includes(q.section)) order.push(q.section);
    return order.map((sec) => ({
      sec,
      color: sec === "선택" ? SELECT_COLOR : base,
      questions: config.filter((q) => q.section === sec),
    }));
  }, [config, base]);

  return (
    <div className="overflow-hidden rounded-[2px] border-2 bg-white" style={{ borderColor: base }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: base }}>
        <div className="flex items-center gap-2 text-white">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white text-[12px] font-bold">
            {KYOSHI[subject] ?? "·"}
          </span>
          <span className="text-[15px] font-bold tracking-tight">{subject}영역</span>
        </div>
        <div className="text-right text-white">
          <div className="text-[10px] leading-tight opacity-90">2024학년도 대학수학능력시험 · ene 모의평가 답안지</div>
          <div className="text-[11px] font-semibold leading-tight">
            <span className="font-black">ene</span> 수능교육연구소
          </div>
        </div>
      </div>

      {/* Identity block */}
      <IdentityBlock color={base} studentName={studentName} />

      {/* Answer grid */}
      <div className="border-t-2 p-2.5 lg:p-3.5" style={{ borderColor: base }}>
        {title && <p className="m-0 mb-2 text-[12px] text-[#161616]/50">{title}</p>}
        <div className="flex flex-col gap-4">
          {sections.map((s, i) => (
            <SectionBlock
              key={i}
              label={s.sec}
              color={s.color}
              questions={s.questions}
              values={values}
              onChange={onChange}
              showCorrect={showCorrect}
              correct={correct}
              statusByNo={statusByNo}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function IdentityBlock({ color, studentName }: { color: string; studentName: string }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2 p-2.5 text-[11px]" style={{ color }}>
      <div className="flex min-w-[120px] flex-1 flex-col rounded-[2px] border" style={{ borderColor: color }}>
        <div className="border-b px-2 py-1 font-semibold" style={{ borderColor: color }}>성명</div>
        <div className="flex flex-1 items-center px-2 py-2 text-[13px] text-[#161616]">{studentName || " "}</div>
      </div>

      <div className="flex flex-col rounded-[2px] border" style={{ borderColor: color }}>
        <div className="border-b px-2 py-1 font-semibold" style={{ borderColor: color }}>수 험 번 호</div>
        <div className="flex gap-1 px-2 py-1.5">
          {Array.from({ length: 8 }).map((_, col) => (
            <div key={col} className="flex flex-col items-center gap-[3px]">
              {Array.from({ length: 10 }).map((_, d) => (
                <span
                  key={d}
                  className="flex h-3 w-3 items-center justify-center rounded-full border text-[7px] leading-none text-[#16161660]"
                  style={{ borderColor: `${color}66` }}
                >
                  {d}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col rounded-[2px] border" style={{ borderColor: color }}>
        <div className="border-b px-2 py-1 font-semibold" style={{ borderColor: color }}>문형</div>
        <div className="flex flex-1 flex-col justify-center gap-1.5 px-2 py-1.5 text-[#161616]">
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 rounded-full border" style={{ borderColor: color }} /> 홀수형</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 rounded-full border" style={{ borderColor: color }} /> 짝수형</span>
        </div>
      </div>
    </div>
  );
}

const COL_SIZE = 20; // choice rows per column, like the sheet's grouping

function SectionBlock({
  label,
  color,
  questions,
  values,
  onChange,
  showCorrect,
  correct,
  statusByNo,
  readOnly,
}: {
  label?: string;
  color: string;
  questions: OmrConfig;
  values: OmrAnswers;
  onChange?: (no: number, value: string) => void;
  showCorrect?: boolean;
  correct?: OmrAnswers;
  statusByNo?: Record<string, Status>;
  readOnly?: boolean;
}) {
  const choiceQs = questions.filter((q) => q.type === "choice");
  const shortQs = questions.filter((q) => q.type === "short");

  const cols: OmrQuestion[][] = [];
  for (let i = 0; i < choiceQs.length; i += COL_SIZE) cols.push(choiceQs.slice(i, i + COL_SIZE));

  return (
    <div className="flex items-stretch gap-1.5">
      {label && (
        <div
          className="flex flex-none items-center justify-center rounded-[2px] px-1 text-[12px] font-bold text-white [writing-mode:vertical-rl]"
          style={{ backgroundColor: color, letterSpacing: "0.35em" }}
        >
          {label === "공통" ? "공통과목" : "선택과목"}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-4 gap-y-3">
        {cols.map((col, ci) => (
          <ChoiceColumn
            key={ci}
            color={color}
            questions={col}
            values={values}
            onChange={onChange}
            showCorrect={showCorrect}
            correct={correct}
            statusByNo={statusByNo}
            readOnly={readOnly}
          />
        ))}
        {shortQs.length > 0 && (
          <div className="flex flex-col gap-2">
            {label !== "선택" && <ShortLegend color={color} />}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {shortQs.map((q) => (
                <ShortGrid
                  key={q.no}
                  q={q}
                  color={color}
                  value={values[String(q.no)] ?? ""}
                  onChange={(v) => onChange?.(q.no, v)}
                  showCorrect={showCorrect}
                  correct={correct?.[String(q.no)]}
                  status={statusByNo?.[String(q.no)]}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceColumn({
  color,
  questions,
  values,
  onChange,
  showCorrect,
  correct,
  statusByNo,
  readOnly,
}: {
  color: string;
  questions: OmrQuestion[];
  values: OmrAnswers;
  onChange?: (no: number, value: string) => void;
  showCorrect?: boolean;
  correct?: OmrAnswers;
  statusByNo?: Record<string, Status>;
  readOnly?: boolean;
}) {
  return (
    <table className="border-collapse text-center" style={{ color }}>
      <thead>
        <tr>
          <th className="border px-1.5 py-1 text-[11px] font-semibold" style={{ borderColor: color }}>
            문번
          </th>
          <th className="border px-1 py-1 text-[11px] font-semibold" style={{ borderColor: color }} colSpan={5}>
            답 란
          </th>
        </tr>
      </thead>
      <tbody>
        {questions.map((q) => {
          const marked = values[String(q.no)] ?? "";
          const rowBg = showCorrect && statusByNo?.[String(q.no)] === "wrong" ? `${NO}12` : undefined;
          return (
            <tr key={q.no} style={rowBg ? { background: rowBg } : undefined}>
              <td className="border px-1.5 py-[3px] text-[12px] tabular-nums text-[#161616]" style={{ borderColor: color }}>
                {q.no}
              </td>
              {[1, 2, 3, 4, 5].map((n) => {
                const val = String(n);
                const selected = marked === val;
                const isKey = showCorrect && correct?.[String(q.no)] === val;
                return (
                  <td key={n} className="border px-0.5 py-[3px]" style={{ borderColor: `${color}66` }}>
                    <Oval
                      n={n}
                      selected={selected}
                      isKey={isKey}
                      wrong={showCorrect && selected && !isKey}
                      color={color}
                      disabled={readOnly}
                      onClick={() => onChange?.(q.no, selected ? "" : val)}
                    />
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Oval({
  n,
  selected,
  isKey,
  wrong,
  color,
  disabled,
  onClick,
}: {
  n: number;
  selected: boolean;
  isKey?: boolean;
  wrong?: boolean;
  color: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const style: React.CSSProperties = { borderColor: `${color}99`, color: `${color}cc` };
  if (isKey) {
    style.background = OK;
    style.borderColor = OK;
    style.color = "#fff";
  } else if (wrong) {
    style.background = NO;
    style.borderColor = NO;
    style.color = "#fff";
  } else if (selected) {
    style.background = "#161616";
    style.borderColor = "#161616";
    style.color = "#fff";
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={style}
      className="mx-auto flex h-[15px] w-6 items-center justify-center rounded-full border text-[10px] leading-none transition-colors disabled:cursor-default"
    >
      {n}
    </button>
  );
}

function ShortLegend({ color }: { color: string }) {
  return (
    <div className="rounded-[2px] border p-2 text-[10px] leading-4 text-[#161616]/70" style={{ borderColor: color }}>
      <p className="m-0 font-semibold" style={{ color }}>※ 단답형 답란 표기방법</p>
      <p className="m-0">십진법에 의하되, 반드시 자리에 맞추어 표기</p>
      <p className="m-0">예) 98 → 십의 자리 9, 일의 자리 8</p>
    </div>
  );
}

// 단답형 백·십·일 digit grid. Value = number formed by selected digits.
function ShortGrid({
  q,
  color,
  value,
  onChange,
  showCorrect,
  correct,
  status,
  readOnly,
}: {
  q: { no: number };
  color: string;
  value: string;
  onChange: (v: string) => void;
  showCorrect?: boolean;
  correct?: string;
  status?: Status;
  readOnly?: boolean;
}) {
  const COLS = 3;
  const positions = value.padStart(COLS, " ").slice(-COLS).split("");
  const keyPositions = (correct ?? "").padStart(COLS, " ").slice(-COLS).split("");
  function setDigit(col: number, digit: string) {
    const next = [...positions];
    next[col] = next[col] === digit ? " " : digit;
    onChange(next.join("").replace(/\s+/g, ""));
  }
  const labels = ["백", "십", "일"];
  const borderColor = showCorrect ? (status === "correct" ? OK : status === "wrong" ? NO : color) : color;

  return (
    <div className="rounded-[2px] border" style={{ borderColor }}>
      <div className="flex items-baseline justify-between border-b px-1.5 py-0.5" style={{ borderColor: `${color}66` }}>
        <span className="text-[11px] font-bold" style={{ color: "#161616" }}>{q.no}번</span>
        {showCorrect && <span className="text-[10px] text-[#161616]/50">정답 {correct}</span>}
      </div>
      <div className="flex gap-1 px-1 py-1">
        {Array.from({ length: COLS }).map((_, col) => (
          <div key={col} className="flex flex-1 flex-col items-center gap-[2px]">
            <span className="text-[9px]" style={{ color: `${color}aa` }}>{labels[col]}</span>
            {Array.from({ length: 10 }).map((_, d) => {
              const digit = String(d);
              const selected = positions[col] === digit;
              const isKey = showCorrect && keyPositions[col] === digit && (correct ?? "").trim() !== "";
              const style: React.CSSProperties = { borderColor: `${color}66`, color: `${color}bb` };
              if (isKey) {
                style.background = OK;
                style.borderColor = OK;
                style.color = "#fff";
              } else if (selected) {
                style.background = "#161616";
                style.borderColor = "#161616";
                style.color = "#fff";
              }
              return (
                <button
                  key={d}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setDigit(col, digit)}
                  style={style}
                  className="flex h-[13px] w-full items-center justify-center rounded-full border text-[9px] leading-none disabled:cursor-default"
                >
                  {digit}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
