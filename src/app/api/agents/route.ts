import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: List all agents with endpoint_enabled=true
export async function GET(request: NextRequest) {
  try {
    const { data: agents, error } = await supabase
      .from('agent_configs')
      .select(`
        id,
        name,
        title,
        emoji,
        model,
        department,
        status,
        description,
        temperature,
        max_tokens,
        endpoint_enabled,
        updated_at
      `)
      .eq('endpoint_enabled', true)
      .order('name', { ascending: true });

    if (error) {
      console.error("List agents error:", error);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      agents: agents || [],
      count: agents?.length || 0
    });

  } catch (err) {
    console.error("List agents error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}