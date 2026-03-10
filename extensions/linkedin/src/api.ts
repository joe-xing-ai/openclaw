/**
 * LinkedIn REST API client for posting.
 * Uses Posts API (https://api.linkedin.com/rest/posts) and v2/me for author URN.
 */

const LINKEDIN_API_BASE = "https://api.linkedin.com";
// YYYYMM format; use a currently supported Marketing/Posts API version (202402 was sunset).
const LINKEDIN_VERSION = "202510";

/** HTTP headers must be ASCII; Bearer tokens with non-ASCII cause "ByteString" errors. */
function assertTokenAscii(token: string): void {
  for (let i = 0; i < token.length; i++) {
    if (token.charCodeAt(i) > 255) {
      throw new Error(
        `LinkedIn access token contains a non-ASCII character at position ${i} (code ${token.charCodeAt(i)}). ` +
          "Re-paste the token from the LinkedIn OAuth response or run scripts/linkedin/get-token.sh to get a fresh token.",
      );
    }
  }
}

export type LinkedInMeResponse = {
  id?: string;
  firstName?: string | { localized?: Record<string, string> };
  lastName?: string | { localized?: Record<string, string> };
  profilePicture?: unknown;
};

/** OpenID Connect userinfo response (used when /v2/me returns 403). */
export type LinkedInUserInfoResponse = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  email?: string;
  email_verified?: boolean;
};

export type CreatePostBody = {
  author: string;
  commentary: string;
  visibility: "PUBLIC" | "CONNECTIONS" | "PRIVATE";
  distribution: {
    feedDistribution: "MAIN_FEED" | "NONE";
    targetEntities?: unknown[];
    thirdPartyDistributionChannels?: unknown[];
  };
  lifecycleState: "PUBLISHED" | "DRAFT";
  isReshareDisabledByAuthor?: boolean;
};

export type CreatePostResponse = {
  id?: string;
  xRestliId?: string;
};

/**
 * Fetch member info from OpenID Connect userinfo (works with openid+profile scope).
 * GET https://api.linkedin.com/v2/userinfo
 */
async function getLinkedInUserInfo(accessToken: string): Promise<LinkedInUserInfoResponse> {
  const res = await fetch(`${LINKEDIN_API_BASE}/v2/userinfo`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn /v2/userinfo failed: ${res.status} ${body}`);
  }
  return (await res.json()) as LinkedInUserInfoResponse;
}

/**
 * Fetch the authenticated member's ID (for use as post author URN).
 * Uses OpenID Connect /v2/userinfo (requires openid+profile scope).
 */
export async function getLinkedInMe(accessToken: string): Promise<LinkedInMeResponse> {
  assertTokenAscii(accessToken);
  const userinfo = await getLinkedInUserInfo(accessToken);
  if (userinfo.sub) {
    return {
      id: userinfo.sub,
      firstName: userinfo.given_name,
      lastName: userinfo.family_name,
    };
  }
  throw new Error("LinkedIn userinfo missing sub");
}

/**
 * Create a post via LinkedIn REST Posts API.
 * POST https://api.linkedin.com/rest/posts
 * Requires w_member_social scope for member (person) posts.
 */
export async function createLinkedInPost(
  accessToken: string,
  params: { text: string; visibility?: "PUBLIC" | "CONNECTIONS" | "PRIVATE"; draft?: boolean },
): Promise<CreatePostResponse> {
  const { text, visibility = "PUBLIC", draft = false } = params;
  const me = await getLinkedInMe(accessToken);
  const authorId = me.id;
  if (!authorId) {
    throw new Error("LinkedIn me response missing id");
  }
  const author = `urn:li:person:${authorId}`;

  // Use MAIN_FEED for both draft and published; NONE is for Direct Sponsored Content and requires adContext/dscAdAccount.
  const body: CreatePostBody = {
    author,
    commentary: text,
    visibility,
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: draft ? "DRAFT" : "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch(`${LINKEDIN_API_BASE}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Linkedin-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const postId = res.headers.get("x-restli-id") ?? undefined;
  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`LinkedIn create post failed: ${res.status} ${bodyText}`);
  }
  return { id: postId, xRestliId: postId };
}
