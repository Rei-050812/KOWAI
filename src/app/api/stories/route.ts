import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = Math.min(Number(limitParam) || 20, 50);
  const offset = Number(offsetParam) || 0;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("stories")
      .select("*")
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching stories:", error);
      return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ stories: data || [] });
  } catch (error) {
    console.error("Error in /api/stories:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
