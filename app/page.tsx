"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DotBackground from "@/components/DotBackground";



export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Login failed. Please check your email and password.");
    return;
  }

  const user = data.user;

  if (!user) {
    alert("No user found.");
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    alert("Signed in, but no role profile found.");
    return;
  }

  if (profile.role === "admin") {
    router.push("/tutor/dashboard");
    return;
  }

  if (profile.role === "student" || profile.role === "parent") {
    router.push("/student/loading");
    return;
  }

  alert("Unknown role.");
}

  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <DotBackground />

      <section className="relative mx-auto flex min-h-screen max-w-[1100px] items-center px-8">
        <div className="max-w-[520px]">
          <p className="mb-10 text-[13px] uppercase tracking-[0.32em] text-[#777]">
            • Student Portal
          </p>

          <h1 className="typing-title text-[68px] font-semibold leading-[0.95] tracking-[-0.04em]">
            welcome back.
          </h1>

          <p className="mt-8 max-w-[460px] text-[19px] leading-9 text-[#8f8f8f]">
            Please log in to access your profile.
          </p>

          <form className="mt-12 space-y-4">
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#ffffff20] bg-transparent px-5 py-4 text-[15px] tracking-wide text-white outline-none placeholder:text-[#666] focus:border-[#ffffff55]"
            />

            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#ffffff20] bg-transparent px-5 py-4 text-[15px] tracking-wide text-white outline-none placeholder:text-[#666] focus:border-[#ffffff55]"
            />

            <button
              type="button"
              onClick={handleLogin}
              className="mt-4 border border-[#ffffff20] px-7 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff55] hover:text-white"
            >
              login
            </button>
          </form>
        </div>
      </section>

      <footer className="absolute bottom-0 left-0 right-0 border-t border-[#ffffff10] py-5">
        <div className="mx-auto max-w-[1100px] px-8 text-[12px] tracking-[0.15em] text-[#666]">
          © Copyright Clement & Leo 2026
        </div>
      </footer>

      <style>{`
        @keyframes typing {
          from { width: 0; }
          to { width: 13ch; }
        }

        @keyframes blink {
          50% { border-color: transparent; }
        }

        .typing-title {
          overflow: hidden;
          white-space: nowrap;
          border-right: 3px solid #e8e8e8;
          width: 0;
          animation:
            typing 1.6s steps(13, end) forwards,
            blink 0.8s step-end infinite;
        }
      `}</style>
    </main>
  );
}