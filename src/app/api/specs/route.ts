import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Missing 'path' parameter" }, { status: 400 });
    }

    // Security: Only allow paths within the specs directory
    if (filePath.includes("..") || !filePath.startsWith("/data/specs/")) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Construct the full path to the spec file
    const fullPath = path.join(process.cwd(), "public", filePath);

    try {
      const content = await fs.readFile(fullPath, "utf8");
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return NextResponse.json({ error: "Specification file not found" }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Failed to fetch spec file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}