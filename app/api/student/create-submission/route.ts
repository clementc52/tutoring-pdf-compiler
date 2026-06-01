import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const formData = await request.formData();

  const studentId = String(formData.get("studentId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const file = formData.get("file") as File | null;

  if (!studentId || !assignmentId || !file) {
    return NextResponse.json(
      { error: "Missing student, assignment, or file." },
      { status: 400 }
    );
  }

  const filePath = `${studentId}/${assignmentId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("student-submissions")
    .upload(filePath, file, {
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from("student-submissions")
    .getPublicUrl(filePath);

  const { error: insertError } = await supabaseAdmin
  .from("submissions")
  .insert({
    student_id: studentId,
    assignment_id: assignmentId,
    file_url: publicUrl.publicUrl,
    status: "submitted",
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Submission uploaded successfully.",
  });
}