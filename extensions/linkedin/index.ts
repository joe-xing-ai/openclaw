import type { OpenClawPluginApi } from "openclaw/plugin-sdk/linkedin";
import {
  emptyPluginConfigSchema,
  getLinkedInAuthStorePath,
  resolveLinkedInAccessToken,
} from "openclaw/plugin-sdk/linkedin";
import { createLinkedInPostTool, createLinkedInStatusTool } from "./src/tool.js";

const plugin = {
  id: "linkedin",
  name: "LinkedIn",
  description:
    "Draft and publish LinkedIn posts. Auth via linkedin auth profile or LINKEDIN_ACCESS_TOKEN.",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.registerTool((ctx) => {
      const agentDir = ctx.agentDir;
      const getAccessToken = () => resolveLinkedInAccessToken(agentDir);
      return [
        createLinkedInPostTool({ getAccessToken }),
        createLinkedInStatusTool({ getAccessToken, agentDir }),
      ];
    });
  },
};

export default plugin;
