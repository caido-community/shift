---
name: agent-context-management
description: Manages AI agent context window usage - truncation rules, clear truncation markers, and tools for chunked reading or search. Use when building or modifying agent context, system prompts, user messages, or tools that inject large content into the LLM.
---

# Agent Context Management

## Overview

AI agents operate within a fixed context window. System prompts, user messages, tool outputs, and injected context (HTTP requests, responses, skills, etc.) all consume tokens. Exceeding the limit causes failures or degraded behavior.

**Core principle**: Truncate when necessary, but never silently. Always make truncation visible and give the agent a path to access full data when needed.

## What to Be Careful About

- **System prompt**: Keep instructions concise. Avoid redundant or verbose sections.
- **Context blocks**: HTTP requests, responses, learnings, payload blobs, environment variables.
- **User messages**: Long pasted content or multi-turn history.
- **Tool outputs**: Large strings returned from tools (responses, binary output, workflow results).
- **Skills and agent instructions**: Can grow unbounded if many are selected.

## Truncation Rules

### 1. Always Add a Clear Truncation Marker

When truncating, append an explicit marker so the agent knows content was cut:

```
...[truncated]...
```

or with metadata:

```
[...truncated. 45000 characters remaining. Response ID: abc123]
```

Include:
- That truncation occurred
- How much was omitted (characters/bytes)
- Any identifier needed to fetch more (e.g. response ID, blob ID)

### 2. Prefer Head + Tail Over Head-Only

For long content, show both start and end so the agent sees structure:

```
[first N chars]...[truncated]...[last M chars]
```

This helps with HTTP requests (headers + body tail), JSON, and similar structured data.

### 3. Truncation Marker Template

```typescript
const TRUNCATION_MARKER = "\n...[truncated]...\n";

function truncateContextValue(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const remaining = maxLength - TRUNCATION_MARKER.length;
  const headLength = Math.ceil(remaining / 2);
  const tailLength = Math.max(0, remaining - headLength);
  return `${value.slice(0, headLength)}${TRUNCATION_MARKER}${value.slice(value.length - tailLength)}`;
}
```

## Provide Access to Full Data

If you truncate, the agent must be able to retrieve the rest. Implement one or more of:

### Chunked Reading

Expose a tool that reads a range (offset, limit) of the full content:

```
RequestRangeRead(offset: number, limit: number) → content, totalLength, truncated
ResponseRangeRead(responseId, startIndex, endIndex) → content, truncated
```

Document in the system prompt that truncated content can be inspected via these tools.

### Search

For large responses or logs, provide search so the agent can find relevant sections:

```
ResponseSearch(responseId, pattern) → [{ startIndex, endIndex, context }]
```

Then use chunked read around the matches.

### Blob Storage

For generated content the agent needs to reference later (e.g. large payloads):

```
PayloadBlobCreate(content) → blobId
```

Store full content server-side; inject only `blobId`, length, and a short preview into context. The agent references `§§§Blob§blobId§§§` in tool inputs to substitute the full content when needed.

## System Prompt Guidance

When truncation is possible, add explicit instructions:

```
If the visible <current_http_request> appears truncated, use RequestRangeRead with offset and limit to inspect additional request chunks before applying precise raw edits.
```

For responses:

```
Responses may be truncated. Use ResponseSearch to find patterns, then ResponseRangeRead with startIndex/endIndex to read specific sections.
```

## Checklist

- [ ] Truncation uses a visible marker (never silent cut)
- [ ] Marker includes remaining size or identifier when useful
- [ ] Head + tail used for structured content
- [ ] Tool exists for chunked reading of truncated content
- [ ] Search tool available when content is large and searchable
- [ ] Blob/payload storage for generated content that exceeds context
- [ ] System prompt tells the agent how to access full data when truncated
