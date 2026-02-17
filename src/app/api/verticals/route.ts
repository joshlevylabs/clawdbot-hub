import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || "";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// Helper to ensure table exists
async function ensureTableExists() {
  // First try to select from table - if it fails, table doesn't exist
  try {
    const testRes = await fetch(
      `${SUPABASE_URL}/rest/v1/verticals?limit=0`,
      { headers: { ...headers, Prefer: "count=exact" }, cache: "no-store" }
    );
    
    if (testRes.ok) {
      return true; // Table exists
    }
    
    // If we get here, table doesn't exist - this would need manual creation
    // For now, return false to indicate table missing
    return false;
  } catch (err) {
    return false;
  }
}

// GET — return all verticals
export async function GET() {
  try {
    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Verticals table not found", 
        verticals: [],
        tableExists: false 
      }, { status: 503 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/verticals?select=*&order=name.asc`,
      { headers, cache: "no-store" }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase fetch error:", err);
      return NextResponse.json({ error: "Failed to fetch verticals" }, { status: 500 });
    }
    
    const verticals = await res.json();
    return NextResponse.json({ verticals, tableExists: true });
  } catch (err) {
    console.error("Error fetching verticals:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create a new vertical
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, name, emoji, description, color, repos, paths } = body;

    if (!key || !name) {
      return NextResponse.json(
        { error: "Missing required fields: key, name" },
        { status: 400 }
      );
    }

    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Verticals table not found - please create tables manually" 
      }, { status: 503 });
    }

    const vertical = {
      key,
      name,
      emoji: emoji || "📁",
      description: description || "",
      color: color || "slate",
      repos: repos || [],
      paths: paths || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/verticals`,
      {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(vertical),
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase create error:", err);
      return NextResponse.json({ error: "Failed to create vertical" }, { status: 500 });
    }
    
    const created = await res.json();
    return NextResponse.json({ vertical: created[0] || created, success: true });
  } catch (err) {
    console.error("Error creating vertical:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — update a vertical
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, name, emoji, description, color, repos, paths } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Missing required field: key" },
        { status: 400 }
      );
    }

    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Verticals table not found - please create tables manually" 
      }, { status: 503 });
    }

    const updates = {
      ...(name && { name }),
      ...(emoji && { emoji }),
      ...(description !== undefined && { description }),
      ...(color && { color }),
      ...(repos && { repos }),
      ...(paths && { paths }),
      updated_at: new Date().toISOString()
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/verticals?key=eq.${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(updates),
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase update error:", err);
      return NextResponse.json({ error: "Failed to update vertical" }, { status: 500 });
    }
    
    const updated = await res.json();
    return NextResponse.json({ vertical: updated[0] || updated, success: true });
  } catch (err) {
    console.error("Error updating vertical:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — delete a vertical
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: "Missing required parameter: key" },
        { status: 400 }
      );
    }

    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Verticals table not found - please create tables manually" 
      }, { status: 503 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/verticals?key=eq.${encodeURIComponent(key)}`,
      {
        method: "DELETE",
        headers,
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase delete error:", err);
      return NextResponse.json({ error: "Failed to delete vertical" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, deleted: key });
  } catch (err) {
    console.error("Error deleting vertical:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}