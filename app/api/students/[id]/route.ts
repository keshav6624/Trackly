import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { StudentModel } from "@/models/Student";

type RouteContext = { params: Promise<{ id: string }> };

// Only allow safe ID characters: alphanumeric, dash, underscore
const SAFE_ID = /^[a-zA-Z0-9\-_]{1,50}$/;

export async function PUT(request: Request, context: RouteContext) {
  await dbConnect();

  const { id } = await context.params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ message: "Invalid student ID" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof payload.name === "string" && payload.name.trim()) {
    updates.name = payload.name.trim().slice(0, 200);
  }
  if (typeof payload.leetcodeUsername === "string" && payload.leetcodeUsername.trim()) {
    updates.leetcodeUsername = payload.leetcodeUsername.trim().slice(0, 100);
  }
  if (typeof payload.githubUsername === "string" && payload.githubUsername.trim()) {
    updates.githubUsername = payload.githubUsername.trim().slice(0, 100);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { message: "Provide at least one field to update: name, leetcodeUsername, githubUsername" },
      { status: 400 },
    );
  }

  // Force re-fetch on next GET after profile identity changes
  updates.lastFetchedAt = null;
  updates.stale = false;
  updates.warnings = [];

  const updated = await StudentModel.findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    return NextResponse.json({ message: `Student ${id} not found` }, { status: 404 });
  }

  return NextResponse.json({
    message: "Student updated",
    student: {
      id: updated.id,
      name: updated.name,
      leetcodeUsername: updated.leetcodeUsername,
      githubUsername: updated.githubUsername,
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  await dbConnect();

  const { id } = await context.params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ message: "Invalid student ID" }, { status: 400 });
  }

  const deleted = await StudentModel.findOneAndDelete({ id }).lean();
  if (!deleted) {
    return NextResponse.json({ message: `Student ${id} not found` }, { status: 404 });
  }

  return NextResponse.json({ message: "Student deleted" });
}
