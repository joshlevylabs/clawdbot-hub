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
  try {
    const testRes = await fetch(
      `${SUPABASE_URL}/rest/v1/initiatives?limit=0`,
      { headers: { ...headers, Prefer: "count=exact" }, cache: "no-store" }
    );
    
    return testRes.ok;
  } catch (err) {
    return false;
  }
}

// GET — return all initiatives
export async function GET() {
  try {
    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Initiatives table not found", 
        initiatives: [],
        tableExists: false 
      }, { status: 503 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/initiatives?select=*&order=name.asc`,
      { headers, cache: "no-store" }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase fetch error:", err);
      return NextResponse.json({ error: "Failed to fetch initiatives" }, { status: 500 });
    }
    
    const initiatives = await res.json();
    return NextResponse.json({ initiatives, tableExists: true });
  } catch (err) {
    console.error("Error fetching initiatives:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create a new initiative
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, name, description, verticals, status, priority } = body;

    if (!key || !name) {
      return NextResponse.json(
        { error: "Missing required fields: key, name" },
        { status: 400 }
      );
    }

    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Initiatives table not found - please create tables manually" 
      }, { status: 503 });
    }

    const initiative = {
      key,
      name,
      description: description || "",
      verticals: verticals || [],
      status: status || "active",
      priority: priority || "medium",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/initiatives`,
      {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(initiative),
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase create error:", err);
      return NextResponse.json({ error: "Failed to create initiative" }, { status: 500 });
    }
    
    const created = await res.json();
    return NextResponse.json({ initiative: created[0] || created, success: true });
  } catch (err) {
    console.error("Error creating initiative:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — update an initiative
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, name, description, verticals, status, priority } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Missing required field: key" },
        { status: 400 }
      );
    }

    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Initiatives table not found - please create tables manually" 
      }, { status: 503 });
    }

    const updates = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(verticals && { verticals }),
      ...(status && { status }),
      ...(priority && { priority }),
      updated_at: new Date().toISOString()
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/initiatives?key=eq.${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(updates),
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase update error:", err);
      return NextResponse.json({ error: "Failed to update initiative" }, { status: 500 });
    }
    
    const updated = await res.json();
    return NextResponse.json({ initiative: updated[0] || updated, success: true });
  } catch (err) {
    console.error("Error updating initiative:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — delete an initiative
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
        error: "Initiatives table not found - please create tables manually" 
      }, { status: 503 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/initiatives?key=eq.${encodeURIComponent(key)}`,
      {
        method: "DELETE",
        headers,
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase delete error:", err);
      return NextResponse.json({ error: "Failed to delete initiative" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, deleted: key });
  } catch (err) {
    console.error("Error deleting initiative:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}