import { type ReplayEntryQuery } from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";
import { generateObject } from "ai";
import { z } from "zod";

import { useConfigStore } from "@/stores/config";
import { type FrontendSDK } from "@/types";
import { createModel } from "@/utils";

const outputSchema = z.object({
  name: z.string(),
});

const RENAME_SYSTEM_PROMPT = `
You are a helpful assistant that specializes in creating concise, meaningful names for browser tabs based on their content. Your job is to analyze the provided content and generate a short, descriptive name that would be appropriate for a browser tab.

Keep these guidelines in mind:
- Names should be concise but descriptive
- Avoid unnecessary words like "the", "a", "an" unless crucial for meaning
- Focus on the main topic or action
- Keep names under 50 characters
- Use proper capitalization
- If the content is a form or input, reflect that in the name
- For API endpoints, unless the user says not to, include the endpoint type (GET, POST, etc.) if relevant
- Also, unless the user says not to, include the path (with slashes) unless it's quite long, then only include the most relevant part such as /update/user or /delete/user

Now that you know your job, the user can also specify their preferences for how you rename the tabs. If they provide instructions, please follow them while still keeping the above guidelines in mind.

You will be given a replay entry. Please generate a name for the entry based on the content.
You also have access to the user's instructions for how to rename the tabs, which you should follow.

Follow strictly this output schema in your response:
"""
${JSON.stringify(z.toJSONSchema(outputSchema))}
"""

Never include any other text in your response. ALWAYS respond with valid JSON following the schema above.
Include the suggested tab name in the "name" field.

Example:

INPUT:
<entry>
  {
    "id": "123",
    "url": "https://www.google.com",
    "raw": "GET /search?q=google HTTP/1.1\r\nHost: www.google.com\r\nUser-Agent: curl/8.1.0\r\nAccept: */*"
  }
</entry>

<instructions>
  Follow this format: $HOST/$PATH
</instructions>

<user>
  Generate a name for the replay entry.
</user>

OUTPUT:
{
  "name": "www.google.com/search"
}

`.trim();

export async function generateName(sdk: FrontendSDK, entry: ReplayEntryQuery) {
  const configStore = useConfigStore();
  const model = createModel(sdk, configStore.renamingModel);

  const prompt = `
  <entry>
  ${JSON.stringify(entry)}
  </entry>

  <instructions>
  ${configStore.aiSessionRenaming.instructions}
  </instructions>

  <user>
  Generate a name for the replay entry.
  </user>
  `;

  const { object } = await generateObject({
    model,
    prompt,
    system: RENAME_SYSTEM_PROMPT,
    schema: outputSchema,
  });

  return object.name;
}
