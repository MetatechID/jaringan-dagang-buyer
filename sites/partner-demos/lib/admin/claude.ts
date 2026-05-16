/** Claude API wrapper — single helper for the vibe-coding chat.
 *
 *  Prompt shape per turn:
 *    system (cached):  storefront tour + sandboxed paths + tone rules
 *    user:             prior conversation + new message + current state of
 *                      relevant files (also cached when possible)
 *    assistant:        natural-language response PLUS a JSON tool-call
 *                      describing the file changes to apply
 *
 *  We use Claude's `tool_use` shape so the model emits structured patches
 *  instead of fenced code blocks we'd have to parse out.
 */

import Anthropic from "@anthropic-ai/sdk";

import { allowedRoots, checkWritablePath } from "./sandbox";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const MODEL = process.env.ADMIN_CLAUDE_MODEL || "claude-sonnet-4-6";

export interface VibeChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VibeFileChange {
  path: string;
  content: string;        // full new file contents
  why: string;            // short explanation for the user-facing diff label
}

export interface VibeChatResult {
  message: string;        // natural-language reply for the chat
  changes: VibeFileChange[];
}

const SYSTEM = `You are the in-store vibe editor for Safiya Food's Beli Aman storefront.
The shop owner edits their *real production* Next.js storefront by chatting
with you in Indonesian or English. Your patches go straight into a GitHub
draft branch and become a Vercel preview deploy they can click into.

# Hard rules
1. ONLY edit files inside these paths:
${allowedRoots().map((p) => `   - ${p}`).join("\n")}
2. Never edit the BAP (apps/beli-aman-bap/**) or the /api/admin/** routes.
3. Always emit COMPLETE file contents for every file you touch. We diff
   server-side; never emit fragments or "unchanged" placeholders.
4. Keep brand colors and the existing layout patterns unless the customer
   explicitly asks to change them.
5. Prefer to insert/modify near existing /* @vibe:NAME */ anchors. Anchors
   persist across revisions — never delete them.
6. When the customer asks to add analytics (Google Analytics, Facebook
   Pixel, TikTok Pixel), insert next/script <Script> tags into
   sites/partner-demos/app/layout.tsx near @vibe:analytics-head.
7. If a request would require editing outside the allowed paths, REFUSE
   politely and explain. Do not invent file paths.
8. Respond in the same language the customer used (Indonesian if asked
   in Indonesian).
9. Keep your natural-language reply short — 1-3 sentences — then call the
   apply_changes tool with the actual edits.

# Available tool
You MUST call apply_changes when you propose edits. Each entry is the
FULL new contents of one file plus a one-line "why" for the diff label.
If you have nothing to change (e.g. you're just answering a question),
call apply_changes with an empty array.
`;

const TOOL_APPLY = {
  name: "apply_changes",
  description: "Apply file changes to the tenant's storefront. Each change is the COMPLETE new content of a single file.",
  input_schema: {
    type: "object" as const,
    properties: {
      changes: {
        type: "array",
        description: "List of file changes. Empty array if no edit is needed.",
        items: {
          type: "object",
          properties: {
            path:    { type: "string", description: "Repository-relative file path. Must be inside the allowed sandbox." },
            content: { type: "string", description: "Complete new file contents. Never partial." },
            why:     { type: "string", description: "One short line for the diff label, in the customer's language." },
          },
          required: ["path", "content", "why"],
        },
      },
    },
    required: ["changes"],
  },
};

export async function chatTurn(
  conversation: VibeChatMessage[],
  fileContext: Array<{ path: string; content: string }>,
): Promise<VibeChatResult> {
  const fileBlob = fileContext
    .map((f) => `<file path="${f.path}">\n${f.content}\n</file>`)
    .join("\n\n");

  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    // Static instructions — cacheable for the session.
    { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    // File context — also cacheable; refreshes if files change.
    {
      type: "text",
      text: `# Current storefront snapshot\n\n${fileBlob || "(no files attached)"}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  const messages: Anthropic.Messages.MessageParam[] = conversation.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemBlocks,
    tools: [TOOL_APPLY],
    tool_choice: { type: "any" },
    messages,
  });

  let text = "";
  let changes: VibeFileChange[] = [];
  for (const block of resp.content) {
    if (block.type === "text") text += block.text;
    if (block.type === "tool_use" && block.name === "apply_changes") {
      const input = block.input as { changes?: VibeFileChange[] };
      changes = input.changes ?? [];
    }
  }

  // Sandbox check: drop any path outside the allowed roots.
  const safe: VibeFileChange[] = [];
  const rejected: string[] = [];
  for (const c of changes) {
    const check = checkWritablePath(c.path);
    if (check.ok) safe.push({ ...c, path: check.path });
    else rejected.push(`${c.path} (${check.reason})`);
  }
  if (rejected.length > 0) {
    text += `\n\n⚠ Beberapa edit ditolak karena di luar sandbox: ${rejected.join(", ")}`;
  }
  return { message: text.trim(), changes: safe };
}
