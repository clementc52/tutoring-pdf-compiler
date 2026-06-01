import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { draftId } = await req.json();

    const { data: draft, error: draftFetchError } = await admin
      .from("homework_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (draftFetchError || !draft) {
      return NextResponse.json(
        { error: "Draft not found." },
        { status: 400 }
      );
    }

    const { data: assignment, error: assignmentError } = await admin
      .from("assignments")
      .insert({
        student_id: draft.student_id,
        title: draft.title ?? "AI Homework",
        description: draft.description ?? "",
        file_url: draft.pdf_url,
        latex_source: draft.latex_source,
        status: "assigned",
      })
      .select("id")
      .single();

    if (assignmentError) {
      return NextResponse.json(
        { error: assignmentError.message },
        { status: 400 }
      );
    }

    const { error: updateError } = await admin
      .from("homework_drafts")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        assignment_id: assignment.id,
      })
      .eq("id", draftId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}