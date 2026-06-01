"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="
        border border-[#ffffff18]
        px-5 py-3
        text-[13px]
        tracking-[0.25em]
        uppercase
        text-[#888]
        transition-all
        duration-300
        hover:border-[#ffffff35]
        hover:text-white
      "
    >
      ← Back
    </button>
  );
}