import { NextRequest, NextResponse } from "next/server";
import {
  getAllBlueprints,
  updateBlueprint,
  deleteKaidanBlueprint,
} from "@/lib/supabase";

function requireAdmin(request: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN || "";
  const auth = request.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "権限がありません" }, { status: 401 });
  }
  return null;
}

// GET: 全KaidanBlueprint一覧取得
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const blueprints = await getAllBlueprints();
    return NextResponse.json({ blueprints });
  } catch (error) {
    console.error("[Blueprints] GET error:", error);
    return NextResponse.json(
      { error: "Blueprint一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PATCH: KaidanBlueprint更新
export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const { id, blueprint, quality_score } = body;

    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }

    if (blueprint === undefined && quality_score === undefined) {
      return NextResponse.json(
        { error: "更新するフィールドがありません" },
        { status: 400 }
      );
    }

    await updateBlueprint(id, blueprint, quality_score);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Blueprints] PATCH error:", error);
    return NextResponse.json(
      { error: "Blueprintの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: KaidanBlueprint削除
export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }

    await deleteKaidanBlueprint(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Blueprints] DELETE error:", error);
    return NextResponse.json(
      { error: "Blueprintの削除に失敗しました" },
      { status: 500 }
    );
  }
}
