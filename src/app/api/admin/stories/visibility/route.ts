import { NextRequest, NextResponse } from "next/server";
import { setStoryVisibility } from "@/lib/supabase";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

function checkAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return token === ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { storyId, isVisible } = body;

    if (!storyId || typeof isVisible !== "boolean") {
      return NextResponse.json(
        { error: "storyId と isVisible が必要です" },
        { status: 400 }
      );
    }

    const result = await setStoryVisibility(storyId, isVisible);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isVisible ? "再表示しました" : "非表示にしました",
    });
  } catch (error) {
    console.error("Error updating story visibility:", error);
    return NextResponse.json(
      { error: "表示設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
