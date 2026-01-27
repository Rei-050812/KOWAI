import { NextRequest, NextResponse } from "next/server";
import {
  getAllStyleBlueprints,
  saveStyleBlueprint,
  updateStyleBlueprint,
  deleteStyleBlueprint,
} from "@/lib/supabase";
import { validateStyleBlueprint } from "@/lib/style-validators";
import { StyleBlueprintData } from "@/types";

function requireAdmin(request: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN || "";
  const auth = request.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "権限がありません" }, { status: 401 });
  }
  return null;
}

// GET: 全StyleBlueprint一覧取得
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const blueprints = await getAllStyleBlueprints();
    return NextResponse.json({ blueprints });
  } catch (error) {
    console.error("[StyleBlueprints] GET error:", error);
    return NextResponse.json(
      { error: "StyleBlueprint一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: 新規StyleBlueprint作成
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const styleData: StyleBlueprintData = body.styleData;

    if (!styleData) {
      return NextResponse.json(
        { error: "styleData が必要です" },
        { status: 400 }
      );
    }

    // バリデーション
    const validation = validateStyleBlueprint(styleData);
    if (!validation.is_valid) {
      return NextResponse.json(
        {
          error: "バリデーションエラー",
          violations: validation.violations,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    const qualityScore = body.qualityScore ?? 70;
    const result = await saveStyleBlueprint(styleData, qualityScore);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "保存に失敗しました" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error("[StyleBlueprints] POST error:", error);
    return NextResponse.json(
      { error: "StyleBlueprintの作成に失敗しました" },
      { status: 500 }
    );
  }
}

// PATCH: StyleBlueprint更新（有効/無効切替、編集）
export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }

    const updates: {
      is_active?: boolean;
      quality_score?: number;
      style_data?: StyleBlueprintData;
      archetype_name?: string;
    } = {};

    // 有効/無効切替
    if (typeof body.is_active === "boolean") {
      updates.is_active = body.is_active;
    }

    // 品質スコア更新
    if (typeof body.quality_score === "number") {
      updates.quality_score = Math.max(0, Math.min(100, body.quality_score));
    }

    // styleData更新
    if (body.styleData) {
      const validation = validateStyleBlueprint(body.styleData);
      if (!validation.is_valid) {
        return NextResponse.json(
          {
            error: "バリデーションエラー",
            violations: validation.violations,
            warnings: validation.warnings,
          },
          { status: 400 }
        );
      }
      updates.style_data = body.styleData;
      updates.archetype_name = body.styleData.archetype_name;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "更新するフィールドがありません" },
        { status: 400 }
      );
    }

    const result = await updateStyleBlueprint(id, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[StyleBlueprints] PATCH error:", error);
    return NextResponse.json(
      { error: "StyleBlueprintの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: StyleBlueprint削除
export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }

    const result = await deleteStyleBlueprint(Number(id));

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[StyleBlueprints] DELETE error:", error);
    return NextResponse.json(
      { error: "StyleBlueprintの削除に失敗しました" },
      { status: 500 }
    );
  }
}
