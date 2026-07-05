"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDday, formatDdayTargetLabel } from "@/lib/dday";
import type { SessionUserDTO } from "@/lib/types";

const STUDENT_NAV = [
  { href: "/dashboard", pcLabel: "대시보드", mobileLabel: "홈" },
  { href: "/todo", pcLabel: "투두", mobileLabel: "투두" },
  { href: "/materials", pcLabel: "학습자료", mobileLabel: "자료" },
  { href: "/camstudy", pcLabel: "캠스터디", mobileLabel: "캠" },
  { href: "/grades", pcLabel: "성적", mobileLabel: "성적" },
  { href: "/questions", pcLabel: "TA 질문하기", mobileLabel: "질문" },
];

const PARENT_NAV = [
  { href: "/parent", pcLabel: "현황", mobileLabel: "현황" },
  { href: "/grades", pcLabel: "성적", mobileLabel: "성적" },
  { href: "/parent/link", pcLabel: "연동", mobileLabel: "연동" },
];

export function AppShell({ user, children }: { user: SessionUserDTO; children: React.ReactNode }) {
  const pathname = usePathname();
  const isParent = user.role === "PARENT";
  const navBase = isParent ? PARENT_NAV : STUDENT_NAV;
  const settingsItem = { href: "/settings", pcLabel: "설정", mobileLabel: "설정" };
  const pcNav = [...navBase, settingsItem];
  const mobileNav = isParent ? [...navBase, settingsItem] : navBase;

  const { dday, target } = getDday();

  const [hasUnseenQuestionReply, setHasUnseenQuestionReply] = useState(false);
  useEffect(() => {
    if (isParent) return;
    fetch("/api/questions/unseen-count")
      .then((r) => r.json())
      .then((d) => setHasUnseenQuestionReply((d.count ?? 0) > 0))
      .catch(() => {});
  }, [isParent]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-white">
      {/* HEADER */}
      <div className="sticky top-0 z-50 flex w-full flex-none justify-center bg-white">
        <div className="flex h-[64px] w-full max-w-[1280px] items-center justify-between px-5 lg:h-[80px] lg:px-10">
          <span className="text-[19px] font-bold tracking-[-0.03em] text-[#161616] lg:text-[22px]">
            ene<span className="font-light"> lib</span>
          </span>
          <div className="flex items-center gap-3 lg:gap-5">
            <Link
              href="/settings"
              className="flex items-center gap-2 border-none bg-none p-0 text-[16px] font-normal text-[#161616] lg:text-[18px]"
            >
              <span className="hidden lg:inline"><span className="mr-2 font-semibold">{user.schoolLabel}</span>{user.name} 님</span>
              <span
                aria-label="설정"
                className="relative inline-block h-[18px] w-[18px] rounded-full border-[1.5px] border-[#161616] lg:hidden"
              >
                <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[#161616]" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* PC: SCROLL AREA WITH LEFT MENU + CONTENT / MOBILE: CONTENT ONLY */}
      <div className="flex flex-1 justify-center overflow-y-auto scrollbar-hide">
        <div className="flex w-full max-w-[1280px] items-start gap-10 px-5 lg:px-10">
          {/* LEFT MEGA MENU (PC only) */}
          <div className="sticky top-0 hidden w-[300px] flex-none py-8 lg:block">
            {pcNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-0.5 flex w-full items-center gap-2 py-0.5 text-left text-[32px] leading-[48px] font-extralight tracking-[-0.01em] ${
                    isActive ? "text-[#161616] underline decoration-1 underline-offset-[3px]" : "text-[#161616]/30 no-underline"
                  }`}
                >
                  {item.pcLabel}
                  {item.href === "/questions" && hasUnseenQuestionReply && <span className="h-2 w-2 flex-none rounded-full bg-[#e0362f]" />}
                </Link>
              );
            })}
            <div className="mt-10 border-t border-[#16161614] pt-6">
              <p className="m-0 mb-1.5 text-[14px] leading-6 text-[#161616]/50">{formatDdayTargetLabel(target)}</p>
              <p className="m-0 text-[44px] leading-[52px] font-extralight tracking-[-0.02em] text-[#161616]">D-{dday}</p>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="min-w-0 flex-1 pb-24 lg:max-w-[660px] lg:pb-24">{children}</div>
        </div>
      </div>

      {/* MOBILE BOTTOM TAB BAR */}
      <div className="flex h-[74px] flex-none border-t border-[#16161614] pb-4 lg:hidden">
        {mobileNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1.5 pt-2.5"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#161616]" : "bg-transparent"}`} />
              <span className={`text-[11px] leading-[14px] ${active ? "font-semibold text-[#161616]" : "font-normal text-[#161616]/35"}`}>
                {item.mobileLabel}
              </span>
              {item.href === "/questions" && hasUnseenQuestionReply && (
                <span className="absolute top-1 right-[calc(50%-20px)] h-2 w-2 rounded-full bg-[#e0362f]" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
