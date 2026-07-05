"use client";

import { useState } from "react";
import { Questions } from "@/components/sections/Questions";
import { HohoonQuestions } from "@/components/sections/HohoonQuestions";

type Tab = "cafe" | "hohoon";

export function QuestionsHome() {
  const [tab, setTab] = useState<Tab>("cafe");

  return (
    <div>
      <div className="flex gap-2 pt-6 lg:pt-8">
        <button
          onClick={() => setTab("cafe")}
          className={`rounded-full border px-4 py-1.5 text-[13px] lg:text-[14px] ${
            tab === "cafe" ? "border-[#161616] bg-[#161616] text-white" : "border-[#16161624] bg-white text-[#161616]/60"
          }`}
        >
          연구소 카페
        </button>
        <button
          onClick={() => setTab("hohoon")}
          className={`rounded-full border px-4 py-1.5 text-[13px] lg:text-[14px] ${
            tab === "hohoon" ? "border-[#161616] bg-[#161616] text-white" : "border-[#16161624] bg-white text-[#161616]/60"
          }`}
        >
          훈훈수학
        </button>
      </div>

      {tab === "cafe" ? <Questions /> : <HohoonQuestions />}
    </div>
  );
}
