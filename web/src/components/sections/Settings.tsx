"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Toggle } from "@/components/ui/Toggle";
import type { Role } from "@/lib/types";

interface NotifSettings {
  todoEnabled: boolean;
  examEnabled: boolean;
  camEnabled: boolean;
}

const NOTIF_ROWS: { key: keyof NotifSettings; label: string; desc: string }[] = [
  { key: "todoEnabled", label: "투두 알림", desc: "학습 계획 시간에 맞춰 알림" },
  { key: "examEnabled", label: "시험 일정 알림", desc: "등록한 시험 D-3 · D-1 알림" },
  { key: "camEnabled", label: "캠스터디 참여 알림", desc: "친구가 캠스터디를 시작하면 알림" },
];

export function Settings({ role }: { role: Role }) {
  const router = useRouter();
  const [notif, setNotif] = useState<NotifSettings | null>(null);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then(setNotif);
  }, []);

  async function toggle(key: keyof NotifSettings) {
    if (!notif) return;
    const next = { ...notif, [key]: !notif[key] };
    setNotif(next);
    await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <div className="border-b border-[#161616]/96 pt-8 pb-4 lg:pt-10 lg:pb-5">
        <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">알림 설정</p>
      </div>
      {notif &&
        NOTIF_ROWS.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 border-b border-[#16161614] py-4 lg:py-5">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[15px] leading-6 text-[#161616] lg:text-[16px] lg:leading-7">{r.label}</p>
              <p className="m-0 text-[12px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">{r.desc}</p>
            </div>
            <Toggle on={notif[r.key]} onClick={() => toggle(r.key)} />
          </div>
        ))}

      {role === "STUDENT" ? <StudentLinkSection /> : <ParentLinkSection />}

      <div className="pt-6">
        <button onClick={logout} className="border-none bg-none p-0 text-[15px] leading-6 text-[#161616]/50 underline underline-offset-[3px] lg:text-[16px] lg:leading-7">
          로그아웃
        </button>
      </div>
    </div>
  );
}

function StudentLinkSection() {
  const [code, setCode] = useState<string | null>(null);
  const [parents, setParents] = useState<{ parentId: string; name: string }[]>([]);
  const [copied, setCopied] = useState(false);

  function load() {
    fetch("/api/settings/student-code")
      .then((r) => r.json())
      .then((d) => setCode(d.code));
    fetch("/api/settings/parent-links")
      .then((r) => r.json())
      .then(setParents);
  }
  useEffect(load, []);

  async function refresh() {
    const res = await fetch("/api/settings/student-code", { method: "POST" });
    const d = await res.json();
    setCode(d.code);
  }
  async function copy() {
    if (!code) return;
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function unlink(parentId: string) {
    await fetch(`/api/settings/parent-links/${parentId}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div className="border-b border-[#161616]/96 pt-11 pb-4 lg:pt-11 lg:pb-5">
        <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">크로스 플랫폼 · 학부모 연동</p>
      </div>
      <div className="border-b border-[#16161614] py-4 lg:py-5">
        <p className="m-0 mb-0.5 text-[15px] leading-6 text-[#161616] lg:text-[16px] lg:leading-7">인증코드</p>
        <p className="m-0 mb-3 text-[12px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">
          이 코드를 학부모 앱에 입력하면 학습 현황이 연동됩니다.
        </p>
        <div className="flex items-center gap-3 bg-[#f4f4f4] px-4 py-3.5">
          <span className="flex-1 font-mono text-[16px] tracking-[0.06em] text-[#161616] lg:text-[20px]">{code || "발급 중…"}</span>
          <button onClick={copy} className="flex-none border-none bg-none p-0 text-[13px] text-[#002a9e] underline underline-offset-[3px] lg:text-[14px]">
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
        <button onClick={refresh} className="mt-2 border-none bg-none p-0 text-[12px] text-[#161616]/50 underline underline-offset-[3px] lg:text-[13px]">
          코드 재발급
        </button>
      </div>

      {parents.length > 0 && (
        <div className="border-b border-[#16161614] py-4 lg:py-5">
          <p className="m-0 mb-2 text-[15px] leading-6 text-[#161616] lg:text-[16px] lg:leading-7">연동된 학부모</p>
          {parents.map((p) => (
            <div key={p.parentId} className="flex items-center justify-between py-1.5">
              <span className="text-[14px] text-[#161616]/70">{p.name}</span>
              <button onClick={() => unlink(p.parentId)} className="border-none bg-none p-0 text-[13px] text-[#161616]/50 underline underline-offset-[3px]">
                연동 해제
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ParentLinkSection() {
  const [students, setStudents] = useState<{ studentId: string; name: string; schoolLabel: string }[]>([]);

  function load() {
    fetch("/api/parent/links")
      .then((r) => r.json())
      .then(setStudents);
  }
  useEffect(load, []);

  async function unlink(studentId: string) {
    await fetch(`/api/parent/links/${studentId}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div className="border-b border-[#161616]/96 pt-11 pb-4 lg:pt-11 lg:pb-5">
        <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">자녀 연동 관리</p>
      </div>
      {students.map((s) => (
        <div key={s.studentId} className="flex items-center justify-between gap-4 border-b border-[#16161614] py-4 lg:py-5">
          <div>
            <p className="m-0 text-[15px] leading-6 text-[#161616] lg:text-[16px] lg:leading-7">
              {s.name} · {s.schoolLabel}
            </p>
          </div>
          <button onClick={() => unlink(s.studentId)} className="border-none bg-none p-0 text-[13px] text-[#161616]/50 underline underline-offset-[3px]">
            연동 해제
          </button>
        </div>
      ))}
      <Link
        href="/parent/link"
        className="flex items-center justify-between border-0 border-b border-[#16161614] bg-white py-4 text-left no-underline lg:py-5"
      >
        <span className="text-[15px] text-[#161616] lg:text-[16px]">다른 자녀 연동</span>
        <span className="text-[15px] text-[#161616]/30">→</span>
      </Link>
    </>
  );
}
