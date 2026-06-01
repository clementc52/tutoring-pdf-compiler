"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatVancouverDate } from "@/lib/time";

type Source = {
  id: string;
  name: string | null;
  google_drive_folder_url: string | null;
  status: string | null;
  last_synced_at: string | null;
};

type QuestionBankItem = {
  id: string;
  created_at: string;
  source_name: string | null;
  course: string | null;
  topic: string | null;
  difficulty: string | null;
  question_text: string | null;
  solution_text: string | null;
  tags: string[] | null;
};

export default function QuestionBankPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [items, setItems] = useState<QuestionBankItem[]>([]);

  const [name, setName] = useState("");
  const [folderUrl, setFolderUrl] = useState("");

  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [tagsText, setTagsText] = useState("");

  const [message, setMessage] = useState("");

  async function loadSources() {
    const { data } = await supabase
      .from("question_bank_sources")
      .select("*")
      .order("created_at", { ascending: false });

    setSources(data || []);
  }

  async function loadItems() {
    const { data } = await supabase
      .from("question_bank_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    setItems(data || []);
  }

  useEffect(() => {
    loadSources();
    loadItems();
  }, []);

  async function addSource() {
    if (!name || !folderUrl) {
      setMessage("Please enter source name and Google Drive folder link.");
      return;
    }

    const { error } = await supabase.from("question_bank_sources").insert({
      name,
      google_drive_folder_url: folderUrl,
      status: "not_synced",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Question bank source saved.");
    setName("");
    setFolderUrl("");
    loadSources();
  }

  async function addQuestion() {
    if (!course || !topic || !questionText) {
      setMessage("Please enter course, topic, and question text.");
      return;
    }

    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const { error } = await supabase.from("question_bank_items").insert({
      source_type: "manual",
      source_name: sourceName || "Manual Entry",
      course,
      topic,
      difficulty: difficulty || "unspecified",
      question_text: questionText,
      solution_text: solutionText || null,
      tags,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Question added to bank.");
    setCourse("");
    setTopic("");
    setDifficulty("");
    setSourceName("");
    setQuestionText("");
    setSolutionText("");
    setTagsText("");
    loadItems();
  }

  return (
    <main className="min-h-screen bg-[#080808] px-8 py-16 text-[#e8e8e8]">
      <section className="mx-auto max-w-[1200px]">
        <Link
          href="/tutor/dashboard"
          className="text-[13px] tracking-[0.22em] text-[#777] hover:text-white"
        >
          ← back
        </Link>

        <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em]">
          question bank.
        </h1>

        <p className="mt-6 text-[17px] leading-8 text-[#888]">
          Manage Google Drive sources and manually add searchable questions for homework generation.
        </p>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <div className="border border-[#ffffff18] bg-[#ffffff03] p-8">
            <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
              google drive source
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="source name, e.g. Pre-Calculus School Question Bank"
              className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
            />

            <input
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="google drive root folder link"
              className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
            />

            <button
              onClick={addSource}
              className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
            >
              save root folder
            </button>
          </div>

          <div className="border border-[#ffffff18] bg-[#ffffff03] p-8">
            <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
              manual question entry
            </p>

            <input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="course, e.g. Pre-Calculus 12"
              className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
            />

            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="topic, e.g. Rational Equations"
              className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
            />

            <input
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              placeholder="difficulty, e.g. easy / medium / hard"
              className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
            />

            <input
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="source name, e.g. McGraw Chapter 3"
              className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
            />

            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="question text"
              className="mt-6 min-h-[140px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
            />

            <textarea
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              placeholder="solution text, optional"
              className="mt-6 min-h-[100px] w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
            />

            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="tags separated by commas, e.g. restrictions, extraneous solutions"
              className="mt-6 w-full border border-[#ffffff18] bg-transparent p-5 text-[#ddd] outline-none placeholder:text-[#555]"
            />

            <button
              onClick={addQuestion}
              className="mt-8 border border-[#ffffff18] px-7 py-4 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
            >
              add question
            </button>
          </div>
        </div>

        {message && <p className="mt-8 text-[#888]">{message}</p>}

        <div className="mt-16">
          <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
            indexed questions
          </p>

          <div className="mt-6 space-y-5">
            {items.length === 0 ? (
              <div className="border border-[#ffffff18] bg-[#ffffff03] p-8 text-[#777]">
                No questions indexed yet.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#ffffff18] bg-[#ffffff03] p-8"
                >
                  <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
                    {item.course ?? "No course"} • {item.topic ?? "No topic"} •{" "}
                    {item.difficulty ?? "unspecified"}
                  </p>

                  <p className="mt-5 whitespace-pre-wrap text-[#bbb]">
                    {item.question_text}
                  </p>

                  {item.solution_text && (
                    <p className="mt-5 whitespace-pre-wrap text-[#777]">
                      Solution: {item.solution_text}
                    </p>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <p className="mt-5 text-[#555]">
                      Tags: {item.tags.join(", ")}
                    </p>
                  )}

                  <p className="mt-4 text-[#555]">
                    Source: {item.source_name ?? "Unknown"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-16">
          <p className="text-[12px] uppercase tracking-[0.3em] text-[#666]">
            google drive sources
          </p>

          <div className="mt-6 space-y-6">
            {sources.map((source) => (
              <div
                key={source.id}
                className="border border-[#ffffff18] bg-[#ffffff03] p-8"
              >
                <h2 className="text-[22px] uppercase tracking-[0.12em]">
                  {source.name}
                </h2>

                <p className="mt-4 text-[#777]">
                  Status: {source.status ?? "not_synced"}
                </p>

                {source.last_synced_at && (
                  <p className="mt-4 text-[#777]">
                    Last synced:{" "}
                    {formatVancouverDate(source.last_synced_at)}
                  </p>
                )}

                {source.google_drive_folder_url && (
                  <a
                    href={source.google_drive_folder_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-block border border-[#ffffff18] px-6 py-3 text-[13px] uppercase tracking-[0.22em] text-[#aaa] hover:border-[#ffffff35] hover:text-white"
                  >
                    open drive folder
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}