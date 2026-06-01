"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("Signing in...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setMessage("No user found.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setMessage("Signed in, but no role profile found.");
      return;
    }

    if (profile.role === "admin") {
      router.push("/tutor/dashboard");
      return;
    }

    if (profile.role === "student") {
      router.push("/student/dashboard");
      return;
    }

    if (profile.role === "parent") {
      router.push("/student/dashboard");
      return;
    }

    setMessage("Unknown role.");
  }

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[700px]">
        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          login.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          One login page for students, parents, and admin.
        </p>

        <div className="mt-16 border border-[#ffffff18] bg-[#ffffff03] p-8">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
            className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <button
            onClick={login}
            className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
          >
            sign in
          </button>

          {message && <p className="mt-6 text-[#888]">{message}</p>}
        </div>
      </section>
    </main>
  );
}