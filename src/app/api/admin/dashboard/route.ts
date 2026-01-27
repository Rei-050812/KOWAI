import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function requireAdmin(request: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN || "";
  const auth = request.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "権限がありません" }, { status: 401 });
  }
  return null;
}

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const supabase = getClient();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // --- Stories ---
    const { count: totalStories } = await supabase
      .from("stories")
      .select("*", { count: "exact", head: true });

    const { count: thisWeekStories } = await supabase
      .from("stories")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    const { count: thisMonthStories } = await supabase
      .from("stories")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString());

    // --- Reviews ---
    const { data: reviewsData } = await supabase
      .from("story_reviews")
      .select("rating, issues");

    const reviews = reviewsData || [];
    const totalReviews = reviews.length;
    const ratedReviews = reviews.filter(
      (r) => r.rating !== null && r.rating !== undefined
    );
    const avgRating =
      ratedReviews.length > 0
        ? ratedReviews.reduce((sum, r) => sum + (r.rating as number), 0) /
          ratedReviews.length
        : 0;

    // Rating distribution
    const ratingDistribution: Record<string, number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };
    for (const r of ratedReviews) {
      const key = String(r.rating);
      if (key in ratingDistribution) {
        ratingDistribution[key]++;
      }
    }

    // Issue trends from reviews
    const issueCounts: Record<string, number> = {};
    for (const r of reviews) {
      if (Array.isArray(r.issues)) {
        for (const issue of r.issues) {
          issueCounts[issue] = (issueCounts[issue] || 0) + 1;
        }
      }
    }
    const issuesTrend = Object.entries(issueCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);

    // --- Kaidan Blueprints ---
    const { data: blueprintsData } = await supabase
      .from("kaidan_blueprints")
      .select("quality_score");

    const blueprints = blueprintsData || [];
    const totalBlueprints = blueprints.length;
    const avgBlueprintQuality =
      totalBlueprints > 0
        ? blueprints.reduce((sum, b) => sum + (b.quality_score || 0), 0) /
          totalBlueprints
        : 0;

    // --- Style Blueprints ---
    const { data: styleBlueprintsData } = await supabase
      .from("style_blueprints")
      .select("id, archetype_name, is_active, usage_count");

    const styleBlueprints = styleBlueprintsData || [];
    const totalStyleBlueprints = styleBlueprints.length;
    const activeStyleBlueprints = styleBlueprints.filter(
      (s) => s.is_active
    ).length;

    const usageStats = styleBlueprints
      .map((s) => ({
        name: s.archetype_name || `ID:${s.id}`,
        count: s.usage_count || 0,
      }))
      .sort((a, b) => b.count - a.count);

    // --- Quality Flags from generation_logs ---
    const { data: logsData } = await supabase
      .from("generation_logs")
      .select(
        "event_repetition_detected, action_consistency_issue, quote_incomplete_detected, coherence_issue"
      );

    const logs = logsData || [];
    let eventRepetition = 0;
    let actionConsistency = 0;
    let quoteIncomplete = 0;
    let coherenceIssue = 0;
    for (const log of logs) {
      if (log.event_repetition_detected) eventRepetition++;
      if (log.action_consistency_issue) actionConsistency++;
      if (log.quote_incomplete_detected) quoteIncomplete++;
      if (log.coherence_issue) coherenceIssue++;
    }

    return NextResponse.json({
      stories: {
        total: totalStories || 0,
        thisWeek: thisWeekStories || 0,
        thisMonth: thisMonthStories || 0,
      },
      reviews: {
        total: totalReviews,
        avgRating: Math.round(avgRating * 100) / 100,
        ratingDistribution,
      },
      kaidanBlueprints: {
        total: totalBlueprints,
        avgQuality: Math.round(avgBlueprintQuality * 10) / 10,
      },
      styleBlueprints: {
        total: totalStyleBlueprints,
        active: activeStyleBlueprints,
        usageStats,
      },
      qualityFlags: {
        eventRepetition,
        actionConsistency,
        quoteIncomplete,
        coherenceIssue,
      },
      issuesTrend,
    });
  } catch (error) {
    console.error("[Dashboard] GET error:", error);
    return NextResponse.json(
      { error: "ダッシュボードデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
