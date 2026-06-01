import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const draftId = body.draftId;

    if (!draftId) {
      return NextResponse.json({ error: "Missing draftId." }, { status: 400 });
    }

    const { data: draft, error: draftError } = await supabaseAdmin
      .from("homework_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (draftError) {
      return NextResponse.json({ error: draftError.message }, { status: 500 });
    }

    const latex = draft.latex_source;

    if (!latex) {
      return NextResponse.json(
        { error: "No LaTeX source found." },
        { status: 400 }
      );
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "homework-"));
    const texPath = path.join(tempDir, "homework.tex");
    const pdfPath = path.join(tempDir, "homework.pdf");

    await fs.writeFile(texPath, latex, "utf8");

    await execFileAsync(
      "/Library/TeX/texbin/pdflatex",
      ["-interaction=nonstopmode", "-halt-on-error", "homework.tex"],
      {
        cwd: tempDir,
      }
    );

    const pdfBuffer = await fs.readFile(pdfPath);

    const filePath = `${draftId}/homework.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("homework-pdfs")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("homework-pdfs")
      .getPublicUrl(filePath);

    const pdfUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from("homework_drafts")
      .update({
        pdf_url: pdfUrl,
        status: "compiled",
      })
      .eq("id", draftId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "PDF compiled.",
      pdf_url: pdfUrl,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        error: String(err?.message ?? err),
      },
      {
        status: 500,
      }
    );
  }
}