"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Settings = {
  id: string;
  question_bank_root_url: string | null;
};

type IndexedFile = {
  id: string;
  file_name: string | null;
  file_path: string | null;
  drive_url: string | null;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
  source_type: string | null;
  created_at: string;
};

export default function DriveSyncPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [message, setMessage] = useState("");

  async function loadData() {
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("id, question_bank_root_url")
      .limit(1)
      .maybeSingle();

    const { data: fileData } = await supabase
      .from("question_bank_index")
      .select("*")
      .order("created_at", { ascending: false });

    setSettings(settingsData);
    setFiles(fileData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  function fakeSync() {
    setMessage(
      "Drive sync worker is not connected yet. Next step: connect Google Drive API and recursively index the root folder."
    );
  }

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
          drive sync.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          This will eventually crawl your permanent Google Drive question bank,
          extract text, and populate the AI-searchable index.
        </p>

        <div className="mt-16 border border-[#ffffff18] bg-[#ffffff03] p-8">
          <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
            root folder
          </p>

          <p className="mt-4 text-[#bbb] break-all">
            {settings?.question_bank_root_url ?? "No root folder configured yet."}
          </p>

          <button
            onClick={fakeSync}
            className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
          >
            sync drive folder
          </button>

          {message && <p className="mt-6 text-[#888]">{message}</p>}
        </div>

        <h2 className="mt-16 text-[32px] tracking-[-0.03em]">
          indexed files.
        </h2>

        <div className="mt-8 space-y-6">
          {files.length === 0 && (
            <div className="border border-[#ffffff18] bg-[#ffffff03] p-8 text-[#777]">
              No indexed files yet.
            </div>
          )}

          {files.map((file) => (
            <div
              key={file.id}
              className="border border-[#ffffff18] bg-[#ffffff03] p-8"
            >
              <h3 className="text-[22px] uppercase tracking-[0.12em]">
                {file.file_name ?? "Untitled file"}
              </h3>

              <p className="mt-4 text-[#777]">
                Path: {file.file_path ?? "Not indexed"}
              </p>

              <p className="mt-4 text-[#777]">
                Topic: {file.topic ?? "Not tagged"}
              </p>

              <p className="mt-4 text-[#777]">
                Subtopic: {file.subtopic ?? "Not tagged"}
              </p>

              <p className="mt-4 text-[#777]">
                Source type: {file.source_type ?? "Not tagged"}
              </p>

              {file.drive_url && (
                <a
                  href={file.drive_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                >
                  open drive file
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}