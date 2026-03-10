import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(req: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "leaderboard";

    if (view === "leaderboard") {
      // Get active season + scores
      const { data: seasons } = await sb
        .from("competition_seasons")
        .select("*")
        .eq("status", "active")
        .limit(1);

      const activeSeason = seasons?.[0] || null;

      let scores: any[] = [];
      if (activeSeason) {
        const { data } = await sb
          .from("competition_scores")
          .select("*")
          .eq("season_id", activeSeason.id)
          .order("rank", { ascending: true });
        scores = data || [];
      }

      // Also get all completed seasons for history
      const { data: allSeasons } = await sb
        .from("competition_seasons")
        .select("*")
        .order("season_number", { ascending: false });

      return NextResponse.json({
        activeSeason,
        scores,
        seasons: allSeasons || [],
      });
    }

    if (view === "season") {
      const seasonId = searchParams.get("seasonId");
      if (!seasonId) {
        return NextResponse.json({ error: "seasonId required" }, { status: 400 });
      }

      const { data: season } = await sb
        .from("competition_seasons")
        .select("*")
        .eq("id", seasonId)
        .single();

      const { data: scores } = await sb
        .from("competition_scores")
        .select("*")
        .eq("season_id", seasonId)
        .order("rank", { ascending: true });

      return NextResponse.json({ season, scores: scores || [] });
    }

    if (view === "agent") {
      const agentId = searchParams.get("agentId");
      if (!agentId) {
        return NextResponse.json({ error: "agentId required" }, { status: 400 });
      }

      // Get all scores for this agent across seasons
      const { data: scores } = await sb
        .from("competition_scores")
        .select("*, competition_seasons!inner(season_number, name, start_date, end_date, status)")
        .eq("agent_id", agentId)
        .order("computed_at", { ascending: false });

      return NextResponse.json({ agentId, scores: scores || [] });
    }

    return NextResponse.json({ error: "Invalid view parameter" }, { status: 400 });
  } catch (err: any) {
    console.error("Competition API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
