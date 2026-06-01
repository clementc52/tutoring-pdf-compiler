"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HomeworkDraft = {
  id: string;
  student_id: string | null;
  title: string | null;
  description: string | null;
  source_weaknesses: string | null;
  latex_source: string | null;
  pdf_url: string | null;
  status: string | null;
  revision_request: string | null;
};

export default function HomeworkDraftPage() {
  const params = useParams();
  const draftId = params.id as string;

  const [draft, setDraft] = useState<HomeworkDraft | null>(null);
  const [latex, setLatex] = useState("");
  const [revisionRequest, setRevisionRequest] = useState("");
  const [message, setMessage] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
const [assignmentDescription, setAssignmentDescription] = useState("");

  async function loadDraft() {
    const { data, error } = await supabase
      .from("homework_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
  setDraft(data);
  setLatex(data.latex_source ?? "");
  setRevisionRequest(data.revision_request ?? "");

  setAssignmentTitle(data.title ?? "");
  setAssignmentDescription(data.description ?? "");
}
  }

  useEffect(() => {
    loadDraft();
  }, [draftId]);

  async function saveLatex() {
    const { error } = await supabase
      .from("homework_drafts")
      .update({
        latex_source: latex,
        revision_request: revisionRequest,
        status: "revised",
      })
      .eq("id", draftId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Draft saved.");
    loadDraft();
  }

  async function compilePdf() {
    setMessage("Compiling PDF...");

    const response = await fetch("/api/ai/compile-homework", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draftId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "PDF compilation failed.");
      return;
    }

    setMessage("PDF compiled.");
    loadDraft();
  }

  async function sendRevisionRequest() {
    if (!revisionRequest.trim()) {
      setMessage("Please type a revision request first.");
      return;
    }

    setMessage("Saving revision request...");

    const { error } = await supabase
      .from("homework_drafts")
      .update({
        revision_request: revisionRequest,
        status: "revision_requested",
      })
      .eq("id", draftId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Sending request to AI...");

    const response = await fetch("/api/ai/rewrite-homework", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draftId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "AI rewrite failed.");
      return;
    }

    setMessage(result.message ?? "Revision processed.");
    loadDraft();
  }

  async function approveDraft() {
  setMessage("Publishing assignment...");

  const response = await fetch(
    "/api/admin/approve-homework-draft",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draftId,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    setMessage(result.error ?? "Publish failed.");
    return;
  }

  setMessage("Assignment published.");
  loadDraft();
}

  if (!draft) {
    return (
      <main className="min-h-screen bg-[#080808] p-16 text-[#e8e8e8]">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[1300px]">
        <Link
          href="/tutor/homework-ai"
          className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
        >
          ← back
        </Link>

        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[56px] font-semibold tracking-[-0.04em]">
              draft review.
            </h1>

            <p className="mt-6 text-[#888]">
              Status: {draft.status ?? "draft"}
            </p>
          </div>

          <div className="mt-8 border border-[#ffffff18] bg-[#ffffff03] p-8">
  <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
    assignment details
  </p>

  <input
    value={assignmentTitle}
    onChange={(e) => setAssignmentTitle(e.target.value)}
    placeholder="Assignment title"
    className="mt-6 w-full border border-[#ffffff18] bg-transparent p-4 text-[#ddd] outline-none"
  />

  <textarea
    value={assignmentDescription}
    onChange={(e) => setAssignmentDescription(e.target.value)}
    placeholder="Assignment description"
    className="mt-4 min-h-[120px] w-full border border-[#ffffff18] bg-transparent p-4 text-[#ddd] outline-none"
  />
</div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={saveLatex}
              className="border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
            >
              save latex
            </button>

            <button
              onClick={compilePdf}
              className="border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
            >
              compile pdf
            </button>

            <button
              onClick={approveDraft}
              className="border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
            >
              approve + publish
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="border border-[#ffffff18] bg-[#ffffff03] p-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                latex source
              </p>

              <p className="text-[12px] text-[#555]">
                Editable source code
              </p>
            </div>

            <textarea
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              className="mt-6 min-h-[760px] w-full resize-y border border-[#ffffff18] bg-transparent p-5 font-mono text-[13px] leading-6 text-[#ddd] outline-none"
            />
          </div>

          <div className="space-y-8">
            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                  browser preview
                </p>

                {draft.pdf_url && (
                  <a
                    href={draft.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] uppercase tracking-[0.22em] text-[#777] hover:text-white"
                  >
                    open pdf
                  </a>
                )}
              </div>

              {draft.pdf_url ? (
                <iframe
                  src={`${draft.pdf_url}?t=${Date.now()}`}
                  className="mt-6 h-[760px] w-full border border-[#ffffff18]"
                />
              ) : (
                <div className="mt-6 min-h-[420px] border border-[#ffffff18] p-6 text-[#777]">
                  <p>No compiled PDF yet.</p>

                  <p className="mt-4">
                    Click <span className="text-[#aaa]">COMPILE PDF</span> to
                    build the worksheet and preview it here.
                  </p>
                </div>
              )}
            </div>

            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8">
              <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                ai revision chat
              </p>

              <p className="mt-4 text-[#777]">
                Type what should change. The AI will revise the LaTeX source for
                this draft.
              </p>

              <textarea
                value={revisionRequest}
                onChange={(e) => setRevisionRequest(e.target.value)}
                placeholder="Example: make question 3 harder, add 5 more radical equations, remove solutions, make Section C optional..."
                className="mt-6 min-h-[160px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
              />

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={sendRevisionRequest}
                  className="border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                >
                  send to ai
                </button>

                <button
                  onClick={saveLatex}
                  className="border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                >
                  save manual edits
                </button>

                <button
                  onClick={compilePdf}
                  className="border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                >
                  compile pdf
                </button>
              </div>

              {message && <p className="mt-6 text-[#888]">{message}</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}