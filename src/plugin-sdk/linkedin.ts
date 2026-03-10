// Plugin-sdk surface for the bundled linkedin extension.
// Resolve LinkedIn token from auth profiles; tool types and API for posting.

export type { AnyAgentTool } from "../plugins/types.js";
export { emptyPluginConfigSchema } from "../plugins/config-schema.js";
export { getLinkedInAuthStorePath, resolveLinkedInAccessToken } from "../agents/model-auth.js";
