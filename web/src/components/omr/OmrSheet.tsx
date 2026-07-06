"use client";

import { OMR_TEMPLATES, svgUrl, type OmrTemplateQ } from "@/lib/omrTemplates";
import type { OmrAnswers } from "@/lib/omr";

// Renders the real 수능 답안지 (the PDF page, as an SVG) and overlays interactive
// marks exactly on the printed bubbles, using coordinates extracted from the PDF.
// Used for entering the answer key, marking answers, and reviewing results.

const OK = "#0f9d58";
const NO = "#e0362f";

export function OmrSheet({
  templateId,
  values,
  onChange,
  showCorrect = false,
  correct,
  readOnly = false,
}: {
  templateId: string;
  values: OmrAnswers;
  onChange?: (no: number, value: string) => void;
  showCorrect?: boolean;
  correct?: OmrAnswers;
  readOnly?: boolean;
}) {
  const tpl = OMR_TEMPLATES[templateId];
  if (!tpl) return null;
  const [W, H] = tpl.viewBox;

  return (
    <div className="relative w-full select-none overflow-hidden rounded-[2px] border border-[#16161629]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svgUrl(templateId)} alt="OMR 답안지" className="block w-full" draggable={false} />
      <div className="absolute inset-0">
        {tpl.questions.map((q) =>
          q.type === "choice" ? (
            <ChoiceMarks
              key={q.no}
              q={q}
              W={W}
              H={H}
              marked={values[String(q.no)] ?? ""}
              onPick={(v) => onChange?.(q.no, v)}
              showCorrect={showCorrect}
              keyVal={correct?.[String(q.no)]}
              readOnly={readOnly}
            />
          ) : (
            <ShortMarks
              key={q.no}
              q={q}
              W={W}
              H={H}
              value={values[String(q.no)] ?? ""}
              onChange={(v) => onChange?.(q.no, v)}
              showCorrect={showCorrect}
              keyVal={correct?.[String(q.no)]}
              readOnly={readOnly}
            />
          )
        )}
      </div>
    </div>
  );
}

function pct(v: number, span: number) {
  return `${(v / span) * 100}%`;
}

function ChoiceMarks({
  q,
  W,
  H,
  marked,
  onPick,
  showCorrect,
  keyVal,
  readOnly,
}: {
  q: Extract<OmrTemplateQ, { type: "choice" }>;
  W: number;
  H: number;
  marked: string;
  onPick: (v: string) => void;
  showCorrect?: boolean;
  keyVal?: string;
  readOnly?: boolean;
}) {
  const bw = 22;
  const bh = 15;
  return (
    <>
      {q.bubbles.map(([x, y], i) => {
        const val = String(i + 1);
        const selected = marked === val;
        const isKey = showCorrect && keyVal === val;
        let dot: React.CSSProperties | null = null;
        if (isKey) dot = { background: OK };
        else if (showCorrect && selected) dot = { background: NO };
        else if (selected) dot = { background: "#161616" };
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onPick(selected ? "" : val)}
            title={`${q.no}번 ${val}`}
            style={{ left: pct(x, W), top: pct(y, H), width: pct(bw, W), height: pct(bh, H) }}
            className="absolute -translate-x-1/2 -translate-y-1/2 disabled:cursor-default"
          >
            {dot && <span className="block h-full w-full rounded-full opacity-85" style={dot} />}
            {showCorrect && isKey && !selected && (
              <span className="block h-full w-full rounded-full border-2" style={{ borderColor: OK }} />
            )}
          </button>
        );
      })}
    </>
  );
}

function ShortMarks({
  q,
  W,
  H,
  value,
  onChange,
  showCorrect,
  keyVal,
  readOnly,
}: {
  q: Extract<OmrTemplateQ, { type: "short" }>;
  W: number;
  H: number;
  value: string;
  onChange: (v: string) => void;
  showCorrect?: boolean;
  keyVal?: string;
  readOnly?: boolean;
}) {
  const nCols = q.cols.length;
  const positions = value.padStart(nCols, " ").slice(-nCols).split("");
  const keyPos = (keyVal ?? "").padStart(nCols, " ").slice(-nCols).split("");

  function setDigit(col: number, digit: string) {
    const next = [...positions];
    next[col] = next[col] === digit ? " " : digit;
    onChange(next.join("").replace(/\s+/g, ""));
  }

  const bw = 12;
  const bh = 12;
  return (
    <>
      {q.cols.map((cells, ci) =>
        cells.map((cell) => {
          const digit = String(cell.d);
          const selected = positions[ci] === digit;
          const isKey = showCorrect && keyPos[ci] === digit && (keyVal ?? "").trim() !== "";
          let dot: React.CSSProperties | null = null;
          if (isKey) dot = { background: OK };
          else if (showCorrect && selected) dot = { background: NO };
          else if (selected) dot = { background: "#161616" };
          return (
            <button
              key={`${ci}-${cell.d}`}
              type="button"
              disabled={readOnly}
              onClick={() => setDigit(ci, digit)}
              title={`${q.no}번`}
              style={{ left: pct(cell.x, W), top: pct(cell.y, H), width: pct(bw, W), height: pct(bh, H) }}
              className="absolute -translate-x-1/2 -translate-y-1/2 disabled:cursor-default"
            >
              {dot && <span className="block h-full w-full rounded-full opacity-85" style={dot} />}
              {showCorrect && isKey && !selected && (
                <span className="block h-full w-full rounded-full border-2" style={{ borderColor: OK }} />
              )}
            </button>
          );
        })
      )}
    </>
  );
}
