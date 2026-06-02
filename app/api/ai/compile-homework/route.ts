import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    console.log("RAILWAY VERSION");
  try {
    const body = await request.json();
    const draftId = body.draftId;

    if (!draftId) {
      return NextResponse.json(
        { error: "Missing draftId." },
        { status: 400 }
      );
    }

    const { data: draft, error: draftError } = await supabaseAdmin
      .from("homework_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: draftError?.message ?? "Draft not found." },
        { status: 500 }
      );
    }

    const latex = draft.latex_source;

    if (!latex) {
      return NextResponse.json(
        { error: "No LaTeX source found." },
        { status: 400 }
      );
    }

    const compileResponse = await fetch(
      "https://tutoring-pdf-compiler-production.up.railway.app/compile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latex,
        }),
      }
    );

    const compileResult = await compileResponse.json();

    if (!compileResult.success) {
      return NextResponse.json(
        {
          error: compileResult.error,
        },
        {
          status: 500,
        }
      );
    }

    const pdfBuffer = Buffer.from(
      compileResult.pdfBase64,
      "base64"
    );

    const filePath = `${draftId}/homework.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("homework-pdfs")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error: uploadError.message,
        },
        {
          status: 500,
        }
      );
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
      return NextResponse.json(
        {
          error: updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
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