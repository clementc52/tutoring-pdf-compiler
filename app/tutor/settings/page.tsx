"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Settings = {
  id: string;
  question_bank_root_url: string | null;
  question_bank_root_folder_id: string | null;
  latex_template_url: string | null;
  latex_template_name: string | null;
};

export default function TutorSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [questionBankRootUrl, setQuestionBankRootUrl] = useState("");
  const [latexTemplateUrl, setLatexTemplateUrl] = useState("");
  const [latexTemplateName, setLatexTemplateName] = useState("");
  const [message, setMessage] = useState("");

  async function loadSettings() {
    const { data } = await supabase
      .from("system_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setQuestionBankRootUrl(data.question_bank_root_url ?? "");
      setLatexTemplateUrl(data.latex_template_url ?? "");
      setLatexTemplateName(data.latex_template_name ?? "");
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function saveSettings() {
    if (settings) {
      const { error } = await supabase
        .from("system_settings")
        .update({
          question_bank_root_url: questionBankRootUrl,
          latex_template_url: latexTemplateUrl,
          latex_template_name: latexTemplateName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Settings updated.");
      loadSettings();
      return;
    }

    const { error } = await supabase.from("system_settings").insert({
      question_bank_root_url: questionBankRootUrl,
      latex_template_url: latexTemplateUrl,
      latex_template_name: latexTemplateName,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Settings saved.");
    loadSettings();
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
          settings.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Configure the permanent Google Drive question bank and your default LaTeX template.
        </p>

        <div className="mt-16 max-w-[850px] border border-[#ffffff18] bg-[#ffffff03] p-8">
          <label className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
            question bank root google drive folder
          </label>

          <input
            value={questionBankRootUrl}
            onChange={(e) => setQuestionBankRootUrl(e.target.value)}
            placeholder="paste the one permanent Google Drive root folder link"
            className="mt-4 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <label className="mt-8 block text-[12px] uppercase tracking-[0.3em] text-[#666]">
            latex template name
          </label>

          <input
            value={latexTemplateName}
            onChange={(e) => setLatexTemplateName(e.target.value)}
            placeholder="e.g. Clement Standard Worksheet Template"
            className="mt-4 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <label className="mt-8 block text-[12px] uppercase tracking-[0.3em] text-[#666]">
            latex template url
          </label>

          <input
            value={latexTemplateUrl}
            onChange={(e) => setLatexTemplateUrl(e.target.value)}
            placeholder="Overleaf link or Google Drive link to template.tex"
            className="mt-4 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
          />

          <button
            onClick={saveSettings}
            className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
          >
            save settings
          </button>

          {message && <p className="mt-6 text-[#888]">{message}</p>}
        </div>
      </section>
    </main>
  );
}