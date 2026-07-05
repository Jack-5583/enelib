"use client";

import { useMemo } from "react";
import type { OmrConfig, OmrAnswers } from "@/lib/omr";

// A faithful-ish 수능 OMR answer sheet, responsive for phone and PC/tablet.
// Used to enter the answer key AND to mark student answers (same visual language).
// Choice questions flow top-to-bottom in columns (like the real sheet) via CSS
// multi-column; 단답형 questions render as 백/십/일 digit grids.

const CIRCLED = ["①", "②", "③", "④", "⑤"];

const SUBJECT_THEME: Record<string, { bar: string; accent: string; tint: string }> = {
  국어: { bar: "bg-[#0f9d58]", accent: "#0f9d58", tint: "bg-[#0f9d58]/8" },
  수학: { bar: "bg-[#e0367f]", accent: "#e0367f", tint: "bg-[#e0367f]/8" },
  영어: { bar: "bg-[#3b6fe0]", accent: "#3b6fe0", tint: "bg-[#3b6fe0]/8" },
  한국사: { bar: "bg-[#b0561f]", accent: "#b0561f", tint: "bg-[#b0561f]/8" },
  탐구: { bar: "bg-[#6b3fb0]", accent: "#6b3fb0", tint: "bg-[#6b3fb0]/8" },
};
function themeFor(subject: string) {
  return SUBJECT_THEME[subject] ?? { bar: "bg-[#161616]", accent: "#161616", tint: "bg-[#161616]/6" };
}

type Status = "correct" | "wrong" | "blank" | undefined;

export function OmrSheet({
  subject,
  title,
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
  config: OmrConfig;
  values: OmrAnswers;
  onChange?: (no: number, value: string) => void;
  /** Review mode: overlay correct answers + right/wrong colouring. */
  showCorrect?: boolean;
  correct?: OmrAnswers;
  statusByNo?: Record<string, Status>;
  readOnly?: boolean;
}) {
  const theme = themeFor(subject);
  const choiceQs = useMemo(() => config.filter((q) => q.type === "choice"), [config]);
  const shortQs = useMemo(() => config.filter((q) => q.type === "short"), [config]);

  return (
    <div className="border border-[#16161629] bg-white">
      <div className={`flex items-center justify-between px-4 py-2.5 ${theme.bar}`}>
        <div className="flex items-center gap-2 text-white">
          <span className="text-[13px] font-semibold tracking-tight">OMR 답안지</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[12px]">{subject}</span>
        </div>
        {title && <span className="max-w-[55%] truncate text-[12px] text-white/80">{title}</span>}
      </div>

      <div className="p-3 lg:p-5">
        {choiceQs.length > 0 && (
          <div className="[column-fill:_balance] columns-1 gap-x-7 sm:columns-2 lg:columns-3">
            {choiceQs.map((q) => {
              const marked = values[String(q.no)] ?? "";
              const st = statusByNo?.[String(q.no)];
              return (
                <div
                  key={q.no}
                  className={`mb-1 flex break-inside-avoid items-center gap-1.5 rounded-[3px] px-1.5 py-1 ${
                    showCorrect && st === "wrong" ? "bg-[#e0362f]/8" : showCorrect && st === "blank" ? "bg-[#161616]/5" : ""
                  }`}
                >
                  <span className="w-6 flex-none text-right text-[13px] tabular-nums text-[#161616]/70">{q.no}</span>
                  <div className="flex flex-1 items-center justify-between gap-0.5">
                    {CIRCLED.map((c, i) => {
                      const val = String(i + 1);
                      const selected = marked === val;
                      const isKey = showCorrect && correct?.[String(q.no)] === val;
                      return (
                        <Bubble
                          key={val}
                          label={c}
                          selected={selected}
                          isKey={isKey}
                          wrong={showCorrect && selected && !isKey}
                          accent={theme.accent}
                          disabled={readOnly}
                          onClick={() => onChange?.(q.no, selected ? "" : val)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {shortQs.length > 0 && (
          <div className="mt-4 border-t border-dashed border-[#16161629] pt-4">
            <p className="m-0 mb-2 text-[12px] font-semibold text-[#161616]/60">단답형</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shortQs.map((q) => (
                <ShortGrid
                  key={q.no}
                  q={q}
                  value={values[String(q.no)] ?? ""}
                  onChange={(v) => onChange?.(q.no, v)}
                  showCorrect={showCorrect}
                  correct={correct?.[String(q.no)]}
                  status={statusByNo?.[String(q.no)]}
                  accent={theme.accent}
                  tint={theme.tint}
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

function Bubble({
  label,
  selected,
  isKey,
  wrong,
  accent,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  isKey?: boolean;
  wrong?: boolean;
  accent: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  let cls = "border-[#16161640] text-[#16161680]";
  const style: React.CSSProperties = {};
  if (isKey) {
    cls = "border-transparent text-white font-semibold";
    style.background = accent;
  } else if (wrong) {
    cls = "border-[#e0362f] bg-[#e0362f] text-white";
  } else if (selected) {
    cls = "border-[#161616] bg-[#161616] text-white";
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[12px] leading-none transition-colors lg:h-6 lg:w-6 ${cls} disabled:cursor-default`}
    >
      {label}
    </button>
  );
}

// 단답형 digit grid: 백/십/일 columns of 0–9. The value is the number formed by
// the selected digits (blank columns are skipped, right-aligned on display).
function ShortGrid({
  q,
  value,
  onChange,
  showCorrect,
  correct,
  status,
  accent,
  tint,
  readOnly,
}: {
  q: { no: number };
  value: string;
  onChange: (v: string) => void;
  showCorrect?: boolean;
  correct?: string;
  status?: Status;
  accent: string;
  tint: string;
  readOnly?: boolean;
}) {
  const COLS = 3; // 백 · 십 · 일
  // Right-align the current value into 3 positions.
  const positions = value.padStart(COLS, " ").slice(-COLS).split("");
  function setDigit(col: number, digit: string) {
    const next = [...positions];
    next[col] = next[col] === digit ? " " : digit;
    onChange(next.join("").replace(/\s+/g, ""));
  }
  const labels = ["백", "십", "일"];
  const borderCls = showCorrect ? (status === "correct" ? "border-[#0f9d58]" : status === "wrong" ? "border-[#e0362f]" : "border-[#16161629]") : "border-[#16161629]";

  return (
    <div className={`rounded-[3px] border ${borderCls} ${tint} p-2`}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[12px] font-semibold text-[#161616]">{q.no}번</span>
        {showCorrect && <span className="text-[11px] text-[#161616]/50">정답 {correct}</span>}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: COLS }).map((_, col) => (
          <div key={col} className="flex-1">
            <div className="mb-1 text-center text-[10px] text-[#161616]/40">{labels[col]}</div>
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: 10 }).map((_, d) => {
                const digit = String(d);
                const selected = positions[col] === digit;
                const isKey = showCorrect && correct != null && correct.padStart(COLS, " ").slice(-COLS)[col] === digit;
                const style: React.CSSProperties = isKey ? { background: accent, color: "#fff", borderColor: "transparent" } : {};
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setDigit(col, digit)}
                    style={style}
                    className={`h-5 rounded-full border text-[10px] leading-none ${
                      selected && !isKey ? "border-[#161616] bg-[#161616] text-white" : "border-[#16161640] text-[#16161680]"
                    } disabled:cursor-default`}
                  >
                    {digit}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
