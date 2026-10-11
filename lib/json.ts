import { z } from 'zod';

/**
 * Strips all <think>...</think> reasoning blocks from text.
 * Also handles unclosed leading <think> tags if the model truncated mid-thought.
 */
export function stripThinkBlocks(text: string): string {
  if (!text) return '';
  // Remove closed <think>...</think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Remove leading unclosed <think> tag if present
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');
  return cleaned.trim();
}

/**
 * Strips markdown code fences (```json ... ``` or ``` ... ```) if present.
 */
export function stripMarkdownFences(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  const fenceRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = trimmed.match(fenceRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Finds the first balanced JSON structure (either `{...}` or `[...]`) in a string.
 * This is resilient against leading or trailing conversational text from reasoning models.
 */
export function findBalancedJson(text: string): string | null {
  if (!text) return null;

  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  // If neither exists, no JSON container is present
  if (firstBrace === -1 && firstBracket === -1) {
    return null;
  }

  // Determine whether to search for an object or an array first
  let startIdx: number;
  let openChar: string;
  let closeChar: string;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    openChar = '{';
    closeChar = '}';
  } else {
    startIdx = firstBracket;
    openChar = '[';
    closeChar = ']';
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return text.slice(startIdx, i + 1);
        }
      }
    }
  }

  return null;
}

export type ParseJsonResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; raw: string };

/**
 * Robustly extracts and validates JSON against a Zod schema.
 * 1. Strips <think> blocks
 * 2. Strips markdown fences
 * 3. Extracts balanced JSON
 * 4. Parses JSON
 * 5. Validates with Zod
 */
export function extractAndValidateJson<T>(
  rawText: string,
  schema: z.ZodType<T>
): ParseJsonResult<T> {
  if (!rawText || typeof rawText !== 'string') {
    return {
      success: false,
      error: 'Empty or non-string input provided for JSON extraction',
      raw: String(rawText || ''),
    };
  }

  const withoutThink = stripThinkBlocks(rawText);
  const withoutFences = stripMarkdownFences(withoutThink);
  const extracted = findBalancedJson(withoutFences) || withoutFences;

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch (parseError: any) {
    return {
      success: false,
      error: `JSON syntax parse error: ${parseError.message}`,
      raw: rawText,
    };
  }

  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    const formattedErrors = validation.error.issues
      .map((issue) => `[${issue.path.join('.') || 'root'}]: ${issue.message}`)
      .join('; ');

    return {
      success: false,
      error: `Schema validation failed: ${formattedErrors}`,
      raw: rawText,
    };
  }

  return {
    success: true,
    data: validation.data,
  };
}
