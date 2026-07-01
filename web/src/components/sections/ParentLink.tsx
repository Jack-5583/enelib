"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LinkedStudent {
  studentId: string;
  name: string;
  schoolLabel: string;
  linkedAt: string;
}

export function ParentLink() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/parent/links")
      .then((r) => r.json())
      .then(setStudents);
  }
  useEffect(load, []);

  async function submit() {
    if (!code.trim() || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/parent/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "연동에 실패했습니다.");
      return;
    }
    setCode("");
    load();
    router.push("/parent");
    router.refresh();
  }

  async function unlink(studentId: string) {
    await fetch(`/api/parent/links/${studentId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-[440px] pt-8 lg:pt-10">
      <h2 className="m-0 mb-2 text-[24px] leading-8 font-extralight tracking-[-0.02em] text-[#161616] lg:text-[28px] lg:leading-10">자녀 계정 연동</h2>
      <p className="m-0 mb-7 text-[15px] leading-6 text-[#161616]/50 lg:text-[16px] lg:leading-7">학생 앱 설정에서 발급된 인증코드를 입력하세요.</p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ENE-0000-XX"
        className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 font-mono text-[20px] tracking-[0.08em] text-[#161616] outline-none lg:text-[22px]"
      />
      {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}
      <button onClick={submit} disabled={saving} className="w-full rounded-[2px] border-none bg-[#161616] py-4 text-[16px] font-semibold text-white disabled:opacity-50">
        연동하기
      </button>

      {students.length > 0 && (
        <div className="mt-8 border-t border-[#16161614] pt-5">
          <p className="m-0 mb-2.5 text-[13px] leading-5 font-semibold text-[#161616]">연동된 자녀</p>
          {students.map((s) => (
            <div key={s.studentId} className="flex items-center justify-between gap-3.5 py-3">
              <div>
                <p className="m-0 text-[15px] leading-6 text-[#161616]">
                  {s.name} · {s.schoolLabel}
                </p>
                <p className="m-0 text-[12px] leading-5 text-[#161616]/50">{new Date(s.linkedAt).toLocaleDateString("ko-KR")} 연동됨</p>
              </div>
              <button onClick={() => unlink(s.studentId)} className="flex-none border-none bg-none p-0 text-[13px] text-[#161616]/50 underline underline-offset-[3px]">
                연동 해제
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="m-0 pt-5 text-[13px] leading-6 text-[#161616]/50 lg:text-[14px] lg:leading-6">
        * 연동 시 학생의 완료율, 학습시간, 성적 추이, 완료 인증 사진을 조회할 수 있습니다. 개인 메모는 공유되지 않습니다.
      </p>
    </div>
  );
}
