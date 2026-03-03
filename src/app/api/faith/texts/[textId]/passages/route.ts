import { NextRequest, NextResponse } from "next/server";
import { faithSupabase, isFaithSupabaseConfigured } from "@/lib/faith-supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { textId: string } }
) {
  try {
    if (!isFaithSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Faith database not configured" },
        { status: 503 }
      );
    }

    const { textId } = params;
    const { searchParams } = new URL(request.url);
    const chapterParam = searchParams.get("chapter");
    const pageParam = searchParams.get("page");
    const searchQuery = searchParams.get("search");

    const chapter = chapterParam ? parseInt(chapterParam, 10) : null;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    // Build the query
    let query = faithSupabase
      .from("text_passages")
      .select("id, chapter, verse_start, verse_end, passage_reference, content", { count: "exact" })
      .eq("sacred_text_id", textId);

    // Add chapter filter if provided
    if (chapter !== null && !isNaN(chapter)) {
      query = query.eq("chapter", chapter);
    }

    // Add search filter if provided
    if (searchQuery) {
      query = query.ilike("content", `%${searchQuery}%`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: passages, error, count } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch passages" },
        { status: 500 }
      );
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      passages: passages || [],
      totalCount,
      totalPages,
      currentPage: page,
    });

  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}