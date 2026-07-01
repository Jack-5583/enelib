"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhoneInput, isValidPhone } from "@/lib/phone";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

type Step = "landing" | "login" | "signupRole" | "signup" | "verify";
type Role = "STUDENT" | "PARENT";
type VerifyStatus = "idle" | "ready" | "checking" | "verified" | "expired" | "error";

export function AuthScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("landing");
  const [mode, setMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const [role, setRole] = useState<Role>("STUDENT");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [smsBody, setSmsBody] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [octomoNumberLabel, setOctomoNumberLabel] = useState("1666-3538");
  const [octomoNumber, setOctomoNumber] = useState("16663538");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canProceed = () => {
    if (!isValidPhone(phone)) return false;
    if (mode === "SIGNUP") {
      if (!agree) return false;
      if (role === "PARENT" && !studentCode.trim()) return false;
    }
    return true;
  };

  function goLogin() {
    setError(null);
    setMode("LOGIN");
    setPhone("");
    setStep("login");
  }
  function goSignupRole() {
    setError(null);
    setMode("SIGNUP");
    setStep("signupRole");
  }
  function pickRole(r: Role) {
    setRole(r);
    setPhone("");
    setStudentCode("");
    setAgree(false);
    setName("");
    setError(null);
    setStep("signup");
  }
  function backLanding() {
    if (pollRef.current) clearInterval(pollRef.current);
    setVerifyStatus("idle");
    setError(null);
    setStep("landing");
  }
  function backRole() {
    setStep("signupRole");
  }

  async function startVerify() {
    if (!canProceed() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          purpose: mode,
          role: mode === "SIGNUP" ? role : undefined,
          name: mode === "SIGNUP" ? name || undefined : undefined,
          studentCode: mode === "SIGNUP" && role === "PARENT" ? studentCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "요청에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      setRequestId(data.requestId);
      setSmsBody(data.smsBody);
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setOctomoNumberLabel(data.octomoNumberLabel);
      setOctomoNumber(data.octomoNumber);
      setVerifyStatus("ready");
      setStep("verify");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function beginPolling(id: string) {
    setVerifyStatus("checking");
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/status?id=${id}`);
        const data = await res.json();
        if (data.status === "verified") {
          if (pollRef.current) clearInterval(pollRef.current);
          setVerifyStatus("verified");
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1000);
        } else if (data.status === "expired") {
          if (pollRef.current) clearInterval(pollRef.current);
          setVerifyStatus("expired");
        }
      } catch {
        // transient — keep polling
      }
    }, 1800);
  }

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const proceedBtnClass = `w-full rounded-[2px] border-none py-[16px] text-[16px] font-semibold ${
    canProceed() ? "bg-[#161616] text-white" : "pointer-events-none bg-[#e2e2e2] text-white"
  }`;

  const smsHref = `sms:${octomoNumber}?&body=${encodeURIComponent(smsBody)}`;

  return (
    <div className="flex flex-1 justify-center overflow-y-auto scrollbar-hide">
      <div className="flex w-full max-w-[1280px] flex-col px-6 lg:px-10">
        <div className="flex h-[64px] items-center lg:h-[80px]">
          <span className="text-[20px] font-bold tracking-[-0.03em] text-[#161616] lg:text-[22px]">
            ene<span className="font-light"> lib</span>
          </span>
        </div>

        <div className="flex flex-1 items-center py-6 lg:py-10 lg:pb-[120px]">
          <div className="w-full max-w-[440px] animate-efade">
            {step === "landing" && (
              <div>
                <h1 className="m-0 mb-2 text-[28px] leading-[38px] font-extralight tracking-[-0.02em] text-[#161616] lg:text-[38px] lg:leading-[52px]">
                  공부의 모든 기록을
                  <br />한 곳에서.
                </h1>
                <p className="m-0 mb-10 text-[15px] leading-6 text-[#161616]/50 lg:text-[16px] lg:leading-7">
                  교재와 연결된 투두, 캠스터디, 성적 추적까지.
                </p>
                <button onClick={goLogin} className="mb-2.5 w-full rounded-[2px] border-none bg-[#161616] py-4 text-[16px] font-semibold text-white">
                  로그인
                </button>
                <button
                  onClick={goSignupRole}
                  className="w-full rounded-[2px] border border-[#161616] bg-white py-[15px] text-[16px] font-medium text-[#161616]"
                >
                  회원가입
                </button>
                <div className="mt-7 flex items-center gap-2.5 bg-[#f4f4f4] px-4 py-4">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#161616] text-[14px] font-bold tracking-[-0.03em] text-white">
                    O
                  </span>
                  <p className="m-0 text-[13px] leading-[21px] text-[#161616]/60">
                    <span className="font-semibold text-[#161616]">OCTOMO 문자 인증</span> · 비밀번호 없이 내 휴대폰에서
                    보내는 문자로 본인 확인해요.
                  </p>
                </div>
                <div className="mt-4">
                  <InstallPrompt />
                </div>
              </div>
            )}

            {step === "login" && (
              <div>
                <button onClick={backLanding} className="mb-6 border-none bg-none p-0 text-[14px] text-[#161616]/50">
                  ← 뒤로
                </button>
                <h1 className="m-0 mb-2 text-[26px] leading-[36px] font-extralight tracking-[-0.02em] text-[#161616] lg:text-[32px] lg:leading-[44px]">
                  로그인
                </h1>
                <p className="m-0 mb-8 text-[15px] leading-6 text-[#161616]/50">가입한 휴대폰 번호로 인증해요.</p>
                <p className="m-0 mb-2 text-[14px] leading-6 font-semibold text-[#161616]">휴대폰 번호</p>
                <input
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  className="mb-8 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3.5 text-[22px] text-[#161616] outline-none"
                />
                <div className="mb-5 flex items-center gap-2.5 bg-[#f4f4f4] px-4 py-3.5">
                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[#161616] text-[13px] font-bold text-white">
                    O
                  </span>
                  <p className="m-0 text-[13px] leading-5 text-[#161616]/60">
                    다음 화면에서 <span className="font-semibold text-[#161616]">내 휴대폰이 인증 문자를 발송</span>합니다.
                    통신 요금이 발생하지 않아요.
                  </p>
                </div>
                {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}
                <button onClick={startVerify} disabled={submitting} className={proceedBtnClass}>
                  OCTOMO로 인증하기
                </button>
                <p className="m-0 mt-5 text-center text-[14px] leading-[22px] text-[#161616]/50">
                  아직 회원이 아니세요?{" "}
                  <button onClick={goSignupRole} className="border-none bg-none p-0 text-[14px] text-[#161616] underline underline-offset-[3px]">
                    회원가입
                  </button>
                </p>
              </div>
            )}

            {step === "signupRole" && (
              <div>
                <button onClick={backLanding} className="mb-6 border-none bg-none p-0 text-[14px] text-[#161616]/50">
                  ← 뒤로
                </button>
                <h1 className="m-0 mb-2 text-[26px] leading-[36px] font-extralight tracking-[-0.02em] text-[#161616] lg:text-[32px] lg:leading-[44px]">
                  회원가입
                </h1>
                <p className="m-0 mb-7 text-[15px] leading-6 text-[#161616]/50">어떻게 시작할까요?</p>
                <div className="flex flex-col border-t border-[#161616]/96">
                  <button
                    onClick={() => pickRole("STUDENT")}
                    className="flex items-center justify-between border-0 border-b border-[#16161614] bg-white py-5 text-left"
                  >
                    <span>
                      <span className="block text-[18px] leading-7 text-[#161616] lg:text-[20px] lg:leading-8">학생으로 시작</span>
                      <span className="block text-[13px] leading-5 text-[#161616]/50">투두 · 캠스터디 · 성적 관리</span>
                    </span>
                    <span className="text-[16px] text-[#161616]">→</span>
                  </button>
                  <button
                    onClick={() => pickRole("PARENT")}
                    className="flex items-center justify-between border-0 border-b border-[#16161614] bg-white py-5 text-left"
                  >
                    <span>
                      <span className="block text-[18px] leading-7 text-[#161616] lg:text-[20px] lg:leading-8">학부모로 시작</span>
                      <span className="block text-[13px] leading-5 text-[#161616]/50">자녀 학생코드로 현황 연동</span>
                    </span>
                    <span className="text-[16px] text-[#161616]">→</span>
                  </button>
                </div>
              </div>
            )}

            {step === "signup" && (
              <div>
                <button onClick={backRole} className="mb-6 border-none bg-none p-0 text-[14px] text-[#161616]/50">
                  ← 뒤로
                </button>
                <h1 className="m-0 mb-2 text-[26px] leading-[36px] font-extralight tracking-[-0.02em] text-[#161616] lg:text-[32px] lg:leading-[44px]">
                  {role === "PARENT" ? "학부모" : "학생"} 회원가입
                </h1>
                <p className="m-0 mb-7 text-[14px] leading-[22px] text-[#161616]/50">
                  휴대폰 번호로 가입해요. 아이디·비밀번호가 없습니다.
                </p>

                <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">이름</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름"
                  className="mb-6 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[18px] text-[#161616] outline-none"
                />

                <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">휴대폰 번호</p>
                <input
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  className="mb-6 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[20px] text-[#161616] outline-none lg:text-[22px]"
                />

                {role === "PARENT" && (
                  <>
                    <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">
                      학생 코드 <span className="text-[#e0362f]">*</span>
                    </p>
                    <input
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                      placeholder="ENE-0000-XX"
                      className="mb-1.5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 font-mono text-[18px] tracking-[0.06em] text-[#161616] outline-none lg:text-[20px]"
                    />
                    <p className="m-0 mb-6 text-[12px] leading-[19px] text-[#161616]/50">
                      자녀의 학생 앱 <span className="text-[#161616]">설정 › 학부모 연동 › 인증코드</span>에서 확인할 수
                      있어요. 학부모는 학생 코드가 있어야 가입됩니다.
                    </p>
                  </>
                )}

                <button
                  onClick={() => setAgree((v) => !v)}
                  className="mb-5 flex w-full items-start gap-2.5 border-none bg-none p-0 text-left"
                >
                  <span
                    className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[2px] border text-[13px] text-white"
                    style={{ borderColor: agree ? "#161616" : "#c6c6c6", background: agree ? "#161616" : "#fff" }}
                  >
                    {agree ? "✓" : ""}
                  </span>
                  <span className="text-[13px] leading-5 text-[#161616]/60">
                    만 14세 이상이며 <span className="text-[#161616] underline underline-offset-2">서비스 이용약관</span> 및{" "}
                    <span className="text-[#161616] underline underline-offset-2">개인정보 처리방침</span>에 동의합니다.
                  </span>
                </button>

                {error && <p className="m-0 mb-4 text-[13px] text-[#e0362f]">{error}</p>}
                <button onClick={startVerify} disabled={submitting} className={proceedBtnClass}>
                  OCTOMO로 인증하고 가입
                </button>
              </div>
            )}

            {step === "verify" && (
              <div>
                <div className="mb-6 flex items-center gap-2.5">
                  <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[#161616] text-[15px] font-bold tracking-[-0.03em] text-white lg:h-[38px] lg:w-[38px] lg:text-[16px]">
                    O
                  </span>
                  <div>
                    <p className="m-0 text-[15px] leading-5 font-semibold text-[#161616] lg:text-[16px] lg:leading-[22px]">
                      OCTOMO 문자 인증
                    </p>
                    <p className="m-0 text-[12px] leading-[18px] text-[#161616]/50">{phone || "—"}</p>
                  </div>
                </div>

                {verifyStatus === "ready" && (
                  <div>
                    <h1 className="m-0 mb-2 hidden text-[30px] leading-[42px] font-extralight tracking-[-0.02em] text-[#161616] lg:block">
                      휴대폰으로 QR을
                      <br />스캔해 주세요.
                    </h1>
                    <h1 className="m-0 mb-2 block text-[24px] leading-[34px] font-extralight tracking-[-0.02em] text-[#161616] lg:hidden">
                      내 폰에서 인증 문자를
                      <br />보내주세요.
                    </h1>
                    <p className="m-0 mb-6 hidden text-[15px] leading-6 text-[#161616]/50 lg:block">
                      PC에서는 문자를 보낼 수 없어요. 휴대폰 카메라로 QR을 스캔하면 메시지 앱이 자동으로 열립니다.
                      그대로 전송하면 OCTOMO가 발신 번호를 확인해 본인 인증을 완료해요.
                    </p>
                    <p className="m-0 mb-6 text-[14px] leading-[22px] text-[#161616]/50 lg:hidden">
                      아래 버튼을 누르면 문자 앱이 자동으로 열려요. 그대로 전송하면 OCTOMO가 발신 번호를 확인해 본인
                      인증을 완료해요.
                    </p>

                    <div className="hidden gap-6 lg:flex lg:items-center">
                      <div className="flex h-[180px] w-[180px] flex-none items-center justify-center border border-[#161616] p-2.5">
                        {qrCodeDataUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={qrCodeDataUrl} alt="OCTOMO 인증 QR 코드" width={160} height={160} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 mb-1 text-[13px] leading-5 text-[#161616]/50">받는 번호</p>
                        <p className="m-0 font-mono text-[18px] tracking-[0.04em] text-[#161616]">{octomoNumberLabel}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border border-[#161616] px-[18px] py-4 lg:hidden">
                      <span className="text-[13px] text-[#161616]/50">받는 번호</span>
                      <span className="font-mono text-[18px] tracking-[0.04em] text-[#161616]">{octomoNumberLabel}</span>
                    </div>

                    <button
                      onClick={() => requestId && beginPolling(requestId)}
                      className="mt-7 hidden w-full rounded-[2px] border-none bg-[#161616] py-4 text-[16px] font-semibold text-white lg:block"
                    >
                      문자 전송 완료 · 인증 확인
                    </button>
                    <a
                      href={smsHref}
                      onClick={() => requestId && beginPolling(requestId)}
                      className="mt-5 block w-full rounded-[2px] border-none bg-[#161616] py-4 text-center text-[16px] font-semibold text-white no-underline lg:hidden"
                    >
                      인증 문자 보내기
                    </a>
                    <button onClick={backLanding} className="mt-4 w-full border-none bg-none py-0 text-[14px] text-[#161616]/50">
                      취소
                    </button>
                  </div>
                )}

                {verifyStatus === "checking" && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <span className="h-14 w-14 animate-spin-slow rounded-full border-[3px] border-[#16161618] border-t-[#161616]" />
                    <p className="m-0 mt-7 text-[19px] leading-[29px] text-[#161616]">발신 문자 확인 중…</p>
                    <p className="m-0 mt-1.5 max-w-[300px] text-center text-[14px] leading-[22px] text-[#161616]/50">
                      OCTOMO가 방금 보낸 문자의 발신 번호를 확인하고 있어요.
                    </p>
                    <p className="m-0 mt-6 animate-pulse-soft font-mono text-[13px] text-[#161616]/40">{octomoNumberLabel}</p>
                  </div>
                )}

                {verifyStatus === "verified" && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#161616]">
                      <span className="h-4 w-[26px] rotate-[42deg] -translate-x-px -translate-y-0.5 border-[3px] border-t-0 border-l-0 border-white" />
                    </span>
                    <p className="m-0 mt-6 text-[20px] leading-[30px] text-[#161616]">인증 완료</p>
                    <p className="m-0 mt-1.5 text-center text-[14px] leading-[22px] text-[#161616]/50">
                      본인 확인이 끝났어요. 잠시 후 이동합니다.
                    </p>
                  </div>
                )}

                {verifyStatus === "expired" && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="m-0 text-[18px] text-[#161616]">인증 시간이 만료되었어요.</p>
                    <button onClick={backLanding} className="mt-6 rounded-[2px] border border-[#161616] bg-white px-6 py-3 text-[14px] text-[#161616]">
                      처음으로
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
