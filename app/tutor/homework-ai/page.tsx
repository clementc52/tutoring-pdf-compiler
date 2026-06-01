"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HomeworkDraft = {
  id: string;
  created_at: string;
  student_id: string | null;
  title: string | null;
  description: string | null;
  source_weaknesses: string | null;
  latex_source: string | null;
  pdf_url: string | null;
  status: string | null;
};

export default function HomeworkAIPage() {
  const [drafts, setDrafts] = useState<HomeworkDraft[]>([]);

  async function loadDrafts() {
    const { data } = await supabase
      .from("homework_drafts")
      .select("*")
      .order("created_at", { ascending: false });

    setDrafts(data || []);
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[1100px]">
        <Link
          href="/tutor/dashboard"
          className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
        >
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          homework ai.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Review AI-generated worksheet drafts before releasing them to students.
        </p>

        <div className="mt-16 space-y-6">
          {drafts.length === 0 && (
            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8 text-[#777]">
              No homework drafts yet.
            </div>
          )}

          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="border border-[#ffffff18] bg-[#ffffff03] p-8"
            >
              <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                {draft.status ?? "draft"}
              </p>

              <h2 className="mt-4 text-[24px] uppercase tracking-[0.12em]">
                {draft.title ?? "Untitled homework draft"}
              </h2>

              {draft.description && (
                <p className="mt-4 text-[#888]">{draft.description}</p>
              )}

              {draft.source_weaknesses && (
                <p className="mt-4 text-[#777]">
                  Weaknesses: {draft.source_weaknesses}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href={`/tutor/homework-ai/${draft.id}`}
                  className="inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                >
                  open draft
                </Link>

                {draft.pdf_url && (
                  <a
                    href={draft.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                  >
                    open pdf
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}