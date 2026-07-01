"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneNow() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function subscribeStandalone(callback: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

function useIsStandalone() {
  return useSyncExternalStore(subscribeStandalone, isStandaloneNow, () => true);
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Install-app nudge shown on the auth landing screen (PC + mobile). */
export function InstallPrompt({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const installed = useIsStandalone();

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const showIosHint = !installed && !deferred && isIos();

  if (installed) return null;
  if (!deferred && !showIosHint) return null;

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div
      className={
        compact
          ? "flex items-center gap-2 bg-[#f4f4f4] px-3 py-2"
          : "flex items-center gap-3 bg-[#f4f4f4] px-4 py-3"
      }
    >
      <span
        className={
          compact
            ? "flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#161616] text-[13px] font-bold text-white"
            : "flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#161616] text-[15px] font-bold text-white"
        }
      >
        ⇩
      </span>
      {deferred ? (
        <>
          <p className={compact ? "flex-1 text-[12px] leading-[19px] text-[#161616]/60" : "flex-1 text-[13px] leading-[21px] text-[#161616]/60"}>
            <span className="font-semibold text-[#161616]">ene lib 앱 설치</span> · 홈 화면에 추가하고 앱처럼 바로 실행하세요.
          </p>
          <button
            onClick={handleInstall}
            className="flex-none whitespace-nowrap rounded-[2px] border border-[#161616] px-3 py-1.5 text-[13px] font-medium text-[#161616]"
          >
            설치
          </button>
        </>
      ) : (
        <p className={compact ? "flex-1 text-[12px] leading-[19px] text-[#161616]/60" : "flex-1 text-[13px] leading-[21px] text-[#161616]/60"}>
          <span className="font-semibold text-[#161616]">ene lib 앱 설치</span> · 공유 버튼
          <span aria-hidden> ⎋ </span>
          누른 뒤 &lsquo;홈 화면에 추가&rsquo;를 선택하세요.
        </p>
      )}
    </div>
  );
}
