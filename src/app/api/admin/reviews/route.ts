import { NextRequest, NextResponse } from "next/server";
import { getAdminReviewQueueByType, saveStoryReview, AdminQueueType } from "@/lib/supabase";

function requireAdmin(request: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN || "";
  const auth = request.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "権限がありません" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const queueTypeParam = searchParams.get("queue_type") || "priority";
  const queueType: AdminQueueType =
    queueTypeParam === "all" || queueTypeParam === "random"
      ? queueTypeParam
      : "priority";
  const limit = limitParam ? Math.min(Number(limitParam) || 50, 200) : 50;

  try {
    const items = await getAdminReviewQueueByType(queueType, limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[AdminReviews] GET error:", error);
    return NextResponse.json({ error: "レビュー一覧の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const storyId = String(body.storyId || "");
    const rating = body.rating === null || body.rating === undefined ? null : Number(body.rating);
    const issues = Array.isArray(body.issues) ? body.issues.map(String) : [];
    const note = body.note ? String(body.note) : null;

    if (!storyId) {
      return NextResponse.json({ error: "storyId が必要です" }, { status: 400 });
    }

    if (rating !== null && (Number.isNaN(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "rating は1-5またはnullです" }, { status: 400 });
    }

    await saveStoryReview({ storyId, rating, issues, note });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[AdminReviews] POST error:", error);
    return NextResponse.json({ error: "レビューの保存に失敗しました" }, { status: 500 });
  }
}
