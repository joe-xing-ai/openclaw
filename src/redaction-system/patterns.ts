/**
 * Patterns that match content that looks like tokens, keys, or secrets.
 * Each pattern should have a single capturing group that captures the suspicious value.
 * Patterns are applied line-by-line; use bounded quantifiers only.
 */

export type PatternRule = {
  category: import("./types.js").SuspiciousCategory;
  /** RegExp with one capturing group for the suspicious substring. */
  regex: RegExp;
};

/** Minimum length for a matched substring to be reported (avoids short placeholders). */
export const MIN_MATCH_LENGTH = 12;

function rule(category: import("./types.js").SuspiciousCategory, regex: RegExp): PatternRule {
  return { category, regex };
}

export function getPatternRules(): PatternRule[] {
  const min = MIN_MATCH_LENGTH;
  return [
    rule(
      "env_assignment",
      new RegExp(
        `\\b(?:[A-Z][A-Z0-9_]*)?(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|OAUTH_CODE|CLIENT_SECRET)[A-Z0-9_]*\\s*[=:]\\s*["']([^"'\\s]{${min},200})["']`,
        "g",
      ),
    ),
    rule(
      "json_token_field",
      new RegExp(
        `"(?:apiKey|token|secret|password|accessToken|refreshToken|client_secret|clientSecret)"\\s*:\\s*"([^"]{${min},500})"`,
        "g",
      ),
    ),
    rule("bearer_token", /Bearer\s+([A-Za-z0-9._\-+=]{20,500})/g),
    rule("long_base64_like", /([A-Za-z0-9+/]{40,}={0,2})/g),
    rule("client_secret_like", /["']([A-Za-z0-9._\-+/]{20,}=+)\s*["']/g),
    rule(
      "known_token_prefix",
      /\b(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z\-_]{20,}|AQ[A-Za-z0-9_-]{30,}|WPL_[A-Za-z0-9.+=_-]{20,})/g,
    ),
    rule("oauth_code_like", /["'](AQ[A-Za-z0-9_-]{50,})["']/g),
  ];
}

export function maskSnippet(value: string, keepStart = 6, keepEnd = 4): string {
  if (value.length <= keepStart + keepEnd) {
    return "...";
  }
  return `${value.slice(0, keepStart)}...${value.slice(-keepEnd)}`;
}
