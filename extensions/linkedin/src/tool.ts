import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/linkedin";
import { getLinkedInAuthStorePath } from "openclaw/plugin-sdk/linkedin";
import { createLinkedInPost, getLinkedInMe } from "./api.js";

type AgentToolResult = {
  content: Array<{ type: string; text: string }>;
  details?: unknown;
};

const visibilityEnum = ["PUBLIC", "CONNECTIONS", "PRIVATE"] as const;

export const LinkedInPostToolSchema = Type.Object(
  {
    text: Type.String({
      description: "Full text of the LinkedIn post (commentary).",
    }),
    draft: Type.Optional(
      Type.Boolean({
        description: "If true, create as draft only (not published). Default false.",
      }),
    ),
    visibility: Type.Optional(
      Type.Unsafe<"PUBLIC" | "CONNECTIONS" | "PRIVATE">({
        type: "string",
        enum: visibilityEnum,
        description: "Post visibility. Default PUBLIC.",
      }),
    ),
  },
  { additionalProperties: false },
);

function json(payload: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

/** Build status result with a clear one-line summary so the agent can relay the actual error. */
function statusResult(payload: {
  authenticated: boolean;
  error?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
}): AgentToolResult {
  const summary = payload.authenticated
    ? `LinkedIn: authenticated as ${[payload.firstName, payload.lastName].filter(Boolean).join(" ") || payload.id || "user"}.`
    : `LinkedIn: not authenticated. ${payload.error ?? "Unknown error."}`;
  const text = `${summary}\n\n${JSON.stringify(payload, null, 2)}`;
  return { content: [{ type: "text", text }], details: payload };
}

export type CreateLinkedInPostToolOptions = {
  /** Resolve LinkedIn access token (e.g. from auth profiles); already bound to agent context. */
  getAccessToken: () => Promise<string | null>;
};

export function createLinkedInPostTool(options: CreateLinkedInPostToolOptions): AnyAgentTool {
  const { getAccessToken } = options;
  return {
    name: "linkedin_post",
    label: "LinkedIn Post",
    description:
      "Draft or publish a LinkedIn post. Use draft: true to save as draft only; omit or draft: false to publish. Requires LinkedIn auth (store token in auth profile provider linkedin).",
    parameters: LinkedInPostToolSchema,
    execute: async (
      _toolCallId: string,
      params: { text: string; draft?: boolean; visibility?: "PUBLIC" | "CONNECTIONS" | "PRIVATE" },
      _signal?: AbortSignal,
      _onUpdate?: unknown,
    ): Promise<AgentToolResult> => {
      const token = await getAccessToken();
      if (!token) {
        return json({
          error:
            "LinkedIn not authenticated. Add a linkedin auth profile (token or OAuth) for this agent.",
        });
      }
      try {
        if (params.draft) {
          const result = await createLinkedInPost(token, {
            text: params.text,
            visibility: params.visibility ?? "PUBLIC",
            draft: true,
          });
          return json({
            success: true,
            draft: true,
            postId: result.xRestliId ?? result.id,
            message: "Post saved as draft.",
          });
        }
        const result = await createLinkedInPost(token, {
          text: params.text,
          visibility: params.visibility ?? "PUBLIC",
          draft: false,
        });
        return json({
          success: true,
          published: true,
          postId: result.xRestliId ?? result.id,
          message: "Post published.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return json({ error: message });
      }
    },
  };
}

export type LinkedInStatusToolOptions = {
  getAccessToken: () => Promise<string | null>;
  /** Agent dir used to resolve auth store path (for diagnostics when token is missing). */
  agentDir?: string;
};

export function createLinkedInStatusTool(options: LinkedInStatusToolOptions): AnyAgentTool {
  const { getAccessToken, agentDir } = options;
  return {
    name: "linkedin_status",
    label: "LinkedIn Status",
    description: "Check LinkedIn authentication and current user info.",
    parameters: Type.Object({}, { additionalProperties: false }),
    execute: async (
      _toolCallId: string,
      _params: Record<string, unknown>,
      _signal?: AbortSignal,
      _onUpdate?: unknown,
    ): Promise<AgentToolResult> => {
      let token: string | null = null;
      try {
        token = await getAccessToken();
      } catch (err) {
        const authPath = getLinkedInAuthStorePath(agentDir);
        const message = err instanceof Error ? err.message : String(err);
        const msg = `${message} Auth store path: ${authPath}`;
        console.warn("[linkedin] linkedin_status: token resolution failed:", msg);
        return statusResult({ authenticated: false, error: msg });
      }
      if (!token) {
        const authPath = getLinkedInAuthStorePath(agentDir);
        const msg = `No LinkedIn auth profile found. Add a linkedin token in auth profiles or set LINKEDIN_ACCESS_TOKEN. Auth store path: ${authPath}`;
        console.warn("[linkedin] linkedin_status: no token:", msg);
        return statusResult({ authenticated: false, error: msg });
      }
      try {
        const me = await getLinkedInMe(token);
        const firstName =
          typeof me.firstName === "string"
            ? me.firstName
            : (me.firstName as { localized?: Record<string, string> } | undefined)?.localized
                ?.en_US;
        const lastName =
          typeof me.lastName === "string"
            ? me.lastName
            : (me.lastName as { localized?: Record<string, string> } | undefined)?.localized?.en_US;
        return statusResult({
          authenticated: true,
          id: me.id,
          firstName,
          lastName,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[linkedin] linkedin_status: API error:", message);
        return statusResult({ authenticated: false, error: message });
      }
    },
  };
}
