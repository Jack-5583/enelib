"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";

interface HomeData {
  student: { id: string; name: string; schoolLabel: string } | null;
  parentStats?: { label: string; value: string }[];
  timelineEntries?: { id: string; time: string; subject: string | null; title: string | null; photoUrl: string | null }[];
}

export function ParentHome() {
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    fetch("/api/parent/home")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return null;

  if (!data.student) {
    return (
      <div className="pt-8">
        <p className="text-[15px] text-[#161616]/50">연동된 학생이 없습니다. 연동 탭에서 학생 코드를 입력해 주세요.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="pt-8">
        <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">연동된 학생</p>
        <h2 className="m-0 text-[24px] leading-8 font-extralight tracking-[-0.02em] text-[#161616] lg:text-[28px] lg:leading-10">
          {data.student.name} · {data.student.schoolLabel}
        </h2>
      </div>

      <div className="mt-7 grid grid-cols-2 border-t border-[#16161614]">
        {data.parentStats?.map((p) => (
          <div key={p.label} className="border-b border-[#16161614] py-4 pr-4 lg:py-5 lg:pr-5">
            <p className="m-0 mb-1 text-[14px] leading-6 text-[#161616]/50">{p.label}</p>
            <p className="m-0 text-[22px] leading-8 font-light text-[#161616] lg:text-[24px] lg:leading-8">{p.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-9 pb-4 lg:pt-11 lg:pb-5">
        <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">오늘 완료 인증</p>
        <p className="m-0 hidden text-[14px] leading-6 text-[#161616]/50 lg:block">캠스터디 · 투두 사진</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 pt-5 lg:grid-cols-3 lg:gap-3">
        {data.timelineEntries?.map((e) => (
          <div key={e.id} className="border border-[#16161614]">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4_8px,#efefef_8px,#efefef_16px)]">
              {e.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <span className="absolute right-2 bottom-1.5 rounded-[1px] bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-[#161616]/55 lg:bottom-2">{e.time}</span>
            </div>
            <div className="px-2.5 py-2 lg:px-3 lg:py-2.5">
              {e.subject && <Badge>{e.subject}</Badge>}
              <p className="m-0 mt-1.5 truncate text-[12px] leading-[18px] text-[#161616]/60 lg:text-[13px] lg:leading-5">{e.title}</p>
            </div>
          </div>
        ))}
        {data.timelineEntries?.length === 0 && (
          <p className="col-span-full m-0 py-10 text-center text-[14px] text-[#161616]/40">오늘 완료된 인증이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
