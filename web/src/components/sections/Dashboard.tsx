"use client";

import { useEffect, useState } from "react";
import { CheckBox } from "@/components/ui/CheckBox";
import { useIsDesktop } from "@/hooks/useIsDesktop";

interface TodoItem {
  id: string;
  subject: string;
  title: string;
  done: boolean;
  materialLabel: string | null;
}

interface DashboardData {
  userName: string;
  todayLabel: string;
  ddayTargetLabel: string;
  dday: number;
  quote: string;
  quoteAuthor: string;
  weekPct: number;
  weekDone: number;
  weekTotal: number;
  weekBars: { name: string; pct: number; label: string }[];
  cumHours: string;
  weekHours: string;
  avgDay: string;
  streakDays: string;
  todosDaily: TodoItem[];
  doneCount: number;
  totalCount: number;
}

function Bar({ pct }: { pct: number }) {
  return (
    <span className="relative h-[6px] flex-1 overflow-hidden bg-[#e2e2e2]">
      <span className="absolute top-0 left-0 h-full bg-[#161616]" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [variant, setVariant] = useState<1 | 2>(1);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  async function toggle(id: string, current: boolean) {
    setData((d) =>
      d ? { ...d, todosDaily: d.todosDaily.map((t) => (t.id === id ? { ...t, done: !current } : t)) } : d
    );
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !current }),
    });
  }

  if (!data) return null;

  const todoList = (compact: boolean) => (
    <div className={compact ? "flex flex-col" : "flex flex-col"}>
      {data.todosDaily.map((t) => (
        <div key={t.id} className="flex items-start gap-3.5 border-b border-[#16161614] py-4 lg:py-[18px]">
          <CheckBox checked={t.done} onClick={() => toggle(t.id, t.done)} />
          <div className="min-w-0 flex-1">
            {!compact && (
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-block rounded-[2px] border border-[#c6c6c6] bg-[#f4f4f4] px-1.5 text-sm leading-6 font-semibold text-[#393939]">
                  {t.subject}
                </span>
                {t.materialLabel && (
                  <span className="truncate text-[14px] leading-6 text-[#161616]/50">🔗 {t.materialLabel}</span>
                )}
              </div>
            )}
            <p
              className={`m-0 text-[15px] leading-6 lg:text-[16px] lg:leading-7 ${
                t.done ? "text-[#161616]/40 line-through" : "text-[#161616]"
              }`}
            >
              {t.title}
            </p>
          </div>
        </div>
      ))}
      {data.todosDaily.length === 0 && (
        <p className="m-0 py-10 text-center text-[14px] text-[#161616]/40">오늘 등록된 투두가 없습니다.</p>
      )}
    </div>
  );

  if (!isDesktop) {
    return (
      <div>
        <div className="mt-5 bg-[#161616] p-[22px]">
          <p className="m-0 mb-1.5 text-[13px] leading-5 text-white/60">{data.ddayTargetLabel}</p>
          <div className="flex items-end justify-between">
            <p className="m-0 text-[56px] leading-none font-extralight tracking-[-0.03em] text-white">D-{data.dday}</p>
            <p className="m-0 text-right text-[13px] leading-5 text-white/60">
              오늘
              <br />
              <span className="text-[20px] font-light text-white">{data.weekHours}</span>
            </p>
          </div>
        </div>
        <div className="mt-3 bg-[#f4f4f4] px-[18px] py-4">
          <p className="m-0 mb-1 text-[15px] leading-6 font-medium text-[#161616]">&ldquo;{data.quote}&rdquo;</p>
          <p className="m-0 text-[13px] leading-5 text-[#161616]/50">— {data.quoteAuthor}</p>
        </div>

        <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-8 pb-4">
          <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616]">이번 주 완료율</p>
          <p className="m-0 text-[13px] leading-5 text-[#161616]/50">
            {data.weekDone} / {data.weekTotal}
          </p>
        </div>
        <div className="flex items-end gap-1.5 py-4">
          <span className="text-[44px] leading-none font-extralight tracking-[-0.02em] text-[#161616]">{data.weekPct}</span>
          <span className="pb-[3px] text-[18px] leading-none font-light text-[#161616]/50">%</span>
        </div>
        <div className="flex flex-col gap-2.5 py-1">
          {data.weekBars.map((b) => (
            <div key={b.name} className="flex items-center gap-3">
              <span className="w-[66px] flex-none text-[13px] leading-[22px] text-[#161616]">{b.name}</span>
              <Bar pct={b.pct} />
              <span className="w-[38px] flex-none text-right text-[13px] leading-[22px] text-[#161616]/50">{b.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-8 pb-4">
          <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616]">오늘의 투두</p>
          <p className="m-0 text-[13px] leading-5 text-[#161616]/50">
            {data.doneCount} / {data.totalCount}
          </p>
        </div>
        {todoList(false)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between pt-8">
        <div>
          <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">{data.todayLabel}</p>
          <h2 className="m-0 text-[26px] leading-9 font-extralight tracking-[-0.02em] text-[#161616]">
            {data.userName}님, 오늘도 시작해볼까요.
          </h2>
        </div>
        <div className="flex w-[120px] flex-none">
          <button
            onClick={() => setVariant(1)}
            className={`flex-1 border py-[9px] text-center text-[14px] ${variant === 1 ? "border-[#16161614] bg-[#161616] text-white" : "border-[#16161614] bg-white text-[#161616]/50"}`}
          >
            A
          </button>
          <button
            onClick={() => setVariant(2)}
            className={`flex-1 border border-l-0 border-[#16161614] py-[9px] text-center text-[14px] ${variant === 2 ? "bg-[#161616] text-white" : "bg-white text-[#161616]/50"}`}
          >
            B
          </button>
        </div>
      </div>

      {variant === 1 ? (
        <>
          <div className="mt-7 flex items-stretch gap-5 bg-[#f4f4f4] p-6">
            <div className="flex-none border-r border-[#16161614] pr-5">
              <p className="m-0 mb-0.5 text-[14px] leading-6 text-[#161616]/50">수능까지</p>
              <p className="m-0 text-[44px] leading-[52px] font-extralight tracking-[-0.02em] text-[#161616]">D-{data.dday}</p>
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <p className="m-0 mb-1 text-[16px] leading-[26px] font-medium text-[#161616]">&ldquo;{data.quote}&rdquo;</p>
              <p className="m-0 text-[14px] leading-6 text-[#161616]/50">— {data.quoteAuthor}</p>
            </div>
          </div>

          <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-11 pb-5">
            <p className="m-0 text-[20px] leading-8 font-semibold text-[#161616]">이번 주 투두 완료율</p>
            <p className="m-0 text-[14px] leading-6 text-[#161616]/50">
              {data.weekDone} / {data.weekTotal}개 완료
            </p>
          </div>
          <div className="flex items-end gap-1.5 py-[22px]">
            <span className="text-[52px] leading-none font-extralight tracking-[-0.02em] text-[#161616]">{data.weekPct}</span>
            <span className="pb-1 text-[20px] leading-none font-light text-[#161616]/50">%</span>
          </div>
          <div className="flex flex-col gap-3 py-1">
            {data.weekBars.map((b) => (
              <div key={b.name} className="flex items-center gap-3.5">
                <span className="w-[78px] flex-none text-[14px] leading-6 text-[#161616]">{b.name}</span>
                <Bar pct={b.pct} />
                <span className="w-11 flex-none text-right text-[14px] leading-6 text-[#161616]/50">{b.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-9 grid grid-cols-2 border-t border-[#16161614]">
            <div className="border-b border-[#16161614] py-5 pr-5">
              <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">누적 학습시간</p>
              <p className="m-0 text-[24px] leading-8 font-light text-[#161616]">{data.cumHours}</p>
            </div>
            <div className="border-b border-l border-[#16161614] py-5 pl-5">
              <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">이번 주 학습시간</p>
              <p className="m-0 text-[24px] leading-8 font-light text-[#161616]">{data.weekHours}</p>
            </div>
            <div className="py-5 pr-5">
              <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">하루 평균</p>
              <p className="m-0 text-[24px] leading-8 font-light text-[#161616]">{data.avgDay}</p>
            </div>
            <div className="border-l border-[#16161614] py-5 pl-5">
              <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">연속 학습</p>
              <p className="m-0 text-[24px] leading-8 font-light text-[#161616]">{data.streakDays}</p>
            </div>
          </div>

          <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-11 pb-5">
            <p className="m-0 text-[20px] leading-8 font-semibold text-[#161616]">오늘의 투두</p>
            <p className="m-0 text-[14px] leading-6 text-[#161616]/50">
              {data.doneCount} / {data.totalCount}
            </p>
          </div>
          {todoList(false)}
        </>
      ) : (
        <>
          <div className="mt-7 flex flex-col border border-[#161616]">
            <div className="flex items-end justify-between border-b border-[#161616] p-8">
              <div>
                <p className="m-0 mb-1.5 text-[14px] leading-6 text-[#161616]/50">{data.ddayTargetLabel}</p>
                <p className="m-0 text-[72px] leading-none font-extralight tracking-[-0.03em] text-[#161616]">D-{data.dday}</p>
              </div>
              <div className="max-w-[260px] text-right">
                <p className="m-0 mb-1 text-[15px] leading-6 font-medium text-[#161616]">&ldquo;{data.quote}&rdquo;</p>
                <p className="m-0 text-[13px] leading-5 text-[#161616]/50">— {data.quoteAuthor}</p>
              </div>
            </div>
            <div className="grid grid-cols-4">
              <div className="border-r border-[#16161614] px-4 py-[18px]">
                <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50">완료율</p>
                <p className="m-0 text-[22px] leading-7 font-light text-[#161616]">{data.weekPct}%</p>
              </div>
              <div className="border-r border-[#16161614] px-4 py-[18px]">
                <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50">주간 학습</p>
                <p className="m-0 text-[22px] leading-7 font-light text-[#161616]">{data.weekHours}</p>
              </div>
              <div className="border-r border-[#16161614] px-4 py-[18px]">
                <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50">누적</p>
                <p className="m-0 text-[22px] leading-7 font-light text-[#161616]">{data.cumHours}</p>
              </div>
              <div className="px-4 py-[18px]">
                <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50">연속</p>
                <p className="m-0 text-[22px] leading-7 font-light text-[#161616]">{data.streakDays}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-start gap-10">
            <div className="min-w-0 flex-1">
              <p className="m-0 mb-3 border-b border-[#161616]/96 pb-3.5 text-[16px] leading-7 font-semibold text-[#161616]">
                과목별 진도
              </p>
              <div className="flex flex-col gap-3 pt-4">
                {data.weekBars.map((b) => (
                  <div key={b.name} className="flex items-center gap-3">
                    <span className="w-[70px] flex-none text-[13px] leading-[22px] text-[#161616]">{b.name}</span>
                    <Bar pct={b.pct} />
                    <span className="w-10 flex-none text-right text-[13px] leading-[22px] text-[#161616]/50">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-60 flex-none">
              <p className="m-0 mb-3 border-b border-[#161616]/96 pb-3.5 text-[16px] leading-7 font-semibold text-[#161616]">
                오늘의 투두
              </p>
              <div className="flex flex-col">
                {data.todosDaily.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 border-b border-[#16161614] py-3">
                    <CheckBox checked={t.done} onClick={() => toggle(t.id, t.done)} />
                    <p
                      className={`m-0 min-w-0 flex-1 truncate text-[14px] leading-5 ${
                        t.done ? "text-[#161616]/40 line-through" : "text-[#161616]"
                      }`}
                    >
                      {t.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
