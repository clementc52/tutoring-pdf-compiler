"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoadingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadAndRedirect() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      let finalName = "Student";

      if (user.email) {
        const name = user.email.split("@")[0];
        finalName = name.charAt(0).toUpperCase() + name.slice(1);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", user.id)
        .single();

      if (profile?.display_name) {
        finalName = profile.display_name;
      }

      setDisplayName(finalName);
      setReady(true);

      setTimeout(() => {
        if (profile?.role === "admin") {
          router.push("/tutor/dashboard");
          return;
        }

        if (profile?.role === "parent") {
          router.push("/student/dashboard");
          return;
        }

        router.push("/student/dashboard");
      }, 5000);
    }

    loadAndRedirect();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] text-[#e8e8e8]">
      <style>{`
  @keyframes typing {
    from { width: 0; }
    to { width: 100%; }
  }

  @keyframes blink {
    50% { border-color: transparent; }
  }

  .typing-wrap {
    display: inline-block;
  }

  .typing-title {
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    border-right: 3px solid #e8e8e8;
    width: 0;
    animation:
      typing 2s steps(20, end) forwards,
      blink 0.8s step-end infinite;
  }
`}</style>

      {ready && (
  <span className="typing-wrap">
    <h1 className="typing-title text-[58px] font-semibold tracking-[-0.04em]">
      Welcome, {displayName}.
    </h1>
  </span>
)}
    </main>
  );
}