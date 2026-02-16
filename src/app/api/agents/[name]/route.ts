import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const WORKSPACE = process.env.CLAWD_WORKSPACE || `${process.env.HOME}/clawd`;
const AGENTS_DIR = join(WORKSPACE, "agents");

// Validate agent name — alphanumeric, hyphens, underscores only
function isValidName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!isValidName(name)) {
    return NextResponse.json(
      { error: "Invalid agent name" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { name: newName, title, model, emoji } = body as {
      name?: string;
      title?: string;
      model?: string;
      emoji?: string;
    };

    const identityPath = join(AGENTS_DIR, name, "IDENTITY.md");

    // Read existing IDENTITY.md
    let content: string;
    try {
      content = await readFile(identityPath, "utf-8");
    } catch {
      // Create a new one if it doesn't exist
      content = `# ${name}\n\n- **Name:** ${name}\n- **Title:** \n- **Model:** \n- **Emoji:** \n- **Department:** \n`;
    }

    // Update fields in the content
    const updateField = (c: string, field: string, value: string): string => {
      // Match patterns like "- **Name:** value" or "**Name:** value"
      const regex = new RegExp(
        `(^[-\\s]*\\*{0,2}\\s*\\*{0,2}${field}:\\*{0,2})\\s*.*$`,
        "mi"
      );
      if (regex.test(c)) {
        return c.replace(regex, `$1 ${value}`);
      }
      // If field doesn't exist, append it after the first heading
      const headingEnd = c.indexOf("\n") + 1;
      return (
        c.slice(0, headingEnd) +
        `- **${field}:** ${value}\n` +
        c.slice(headingEnd)
      );
    };

    if (newName !== undefined) content = updateField(content, "Name", newName);
    if (title !== undefined) content = updateField(content, "Title", title);
    if (model !== undefined) content = updateField(content, "Model", model);
    if (emoji !== undefined) content = updateField(content, "Emoji", emoji);

    await writeFile(identityPath, content, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update agent", detail: String(error) },
      { status: 500 }
    );
  }
}
