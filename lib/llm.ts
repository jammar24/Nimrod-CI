import OpenAI from 'openai';
import { z } from 'zod';
import { extractAndValidateJson, isTruncationError, stripThinkBlocks } from './json';
import { getValidatedEnv, requireNebiusApiKey } from './env';

export interface LlmCallOptions<T> {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmCallResult<T> {
  data: T;
  modelUsed: string;
  durationMs: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  hadCorrectiveRetry: boolean;
  rawOutput: string;
}

/**
 * Returns a configured OpenAI client configured for Nebius Token Factory.
 * Verifies that the code is executing on the server.
 */
export function getNebiusClient(): OpenAI {
  const apiKey = requireNebiusApiKey();
  const env = getValidatedEnv();

  return new OpenAI({
    apiKey,
    baseURL: env.NEBIUS_BASE_URL,
  });
}

/**
 * Resolves model names and configuration from validated environment variables.
 */
export function getModelConfig() {
  const env = getValidatedEnv();
  return {
    primary: env.NEBIUS_MODEL_PRIMARY,
    fast: env.NEBIUS_MODEL_FAST,
    maxDiffChars: env.MAX_DIFF_CHARS,
  };
}

/**
 * Extracts raw textual content from an OpenAI choice object,
 * safely handling reasoning models that place tokens into reasoning_content
 * or return empty message.content.
 */
function extractRawResponseText(choice: unknown): string {
  if (!choice || typeof choice !== 'object' || !('message' in choice)) {
    return '';
  }

  const message = (choice as { message?: unknown }).message as Record<
    string,
    unknown
  >;
  if (!message) {
    return '';
  }

  let text = message.content ? String(message.content).trim() : '';

  // If content is empty or contains only thinking, check reasoning fields
  if (!text) {
    const reasoning =
      message.reasoning_content ??
      message.reasoning ??
      message.reasoningContent ??
      (choice as Record<string, unknown>).reasoning;

    if (reasoning) {
      text = String(reasoning).trim();
    }
  }

  return text;
}

/**
 * Executes a call to an NVIDIA Nemotron reasoning model on Nebius Token Factory,
 * extracts and validates JSON, and performs corrective retries if validation fails.
 *
 * Truncation handling: Nemotron reasoning models spend tokens "thinking" before
 * emitting the JSON payload. If the response is cut off by the token budget
 * (finish_reason === "length" or an unterminated-string parse error), the retry
 * is executed with a DOUBLED max_tokens budget so the full JSON can be emitted.
 * Without this, a corrective retry with the same cap truncates again and the
 * pipeline fails with "Unterminated string in JSON".
 */
export async function callNemotronJson<T>(
  options: LlmCallOptions<T>,
  clientOverride?: OpenAI
): Promise<LlmCallResult<T>> {
  const client = clientOverride || getNebiusClient();
  const startTime = Date.now();

  const MAX_TOTAL_ATTEMPTS = 3;
  const TOKEN_CEILING = 16000;
  const baseTokens = options.maxTokens ?? 2048;

  let attemptTokens = baseTokens;
  let hadCorrectiveRetry = false;
  let rawText = '';
  let parseResult:
    | { success: true; data: T }
    | { success: false; error: string; raw: string }
    | null = null;
  let usage: LlmCallResult<T>['tokens'];

  const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: options.systemPrompt },
    { role: 'user', content: options.userPrompt },
  ];

  let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = baseMessages;

  for (let attempt = 1; ; attempt++) {
    const response = await client.chat.completions.create({
      model: options.model,
      messages,
      temperature: attempt === 1 ? options.temperature ?? 0.1 : 0.05,
      max_tokens: attemptTokens,
    });

    const choice = response.choices?.[0];
    rawText = extractRawResponseText(choice);
    parseResult = extractAndValidateJson(rawText, options.schema);

    if (parseResult.success) {
      if (response.usage) {
        usage = {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens,
        };
      }
      break;
    }

    // Detect output truncation via finish_reason or the parse-error signature.
    const finishReason = choice?.finish_reason;
    const truncated =
      finishReason === 'length' || isTruncationError(parseResult.error);

    // Non-truncation failures get the standard corrective retry (max 2 calls).
    // Truncation failures may escalate the token budget (max 3 calls total).
    if (!truncated && attempt >= 2) {
      throw new Error(
        `Failed to parse valid JSON from Nemotron model (${options.model}) after ${attempt} attempt(s) ` +
          `(invalid output, max_tokens=${attemptTokens}). Validation error: ${parseResult.error}. ` +
          `Raw output was: ${rawText}`
      );
    }
    if (attempt >= MAX_TOTAL_ATTEMPTS) {
      throw new Error(
        `Failed to parse valid JSON from Nemotron model (${options.model}) after ${attempt} attempt(s) ` +
          `(truncated output, max_tokens=${attemptTokens}). Validation error: ${parseResult.error}. ` +
          `Raw output was: ${rawText}`
      );
    }

    if (truncated) {
      attemptTokens = Math.min(attemptTokens * 2, TOKEN_CEILING);
    }

    hadCorrectiveRetry = true;

    const cleanedPrev = stripThinkBlocks(rawText).slice(0, 1500);
    const truncationNote = truncated
      ? `CRITICAL: Your previous response was cut off because it exceeded the token budget (finish_reason: "length"). ` +
        `The JSON string was left unterminated. Regenerate the COMPLETE response. ` +
        `Think briefly and keep the JSON compact: do not repeat unnecessary context or whitespace.\n`
      : `Your previous response failed validation with error: ${parseResult.error}.\n` +
        `Your previous output was:\n${cleanedPrev}\n\n`;

    const correctiveUserPrompt =
      truncationNote +
      'Please correct your output now. Output ONLY valid JSON strictly adhering to the schema. Do not write markdown blocks or explanations.';

    messages = [
      ...baseMessages,
      { role: 'assistant', content: rawText },
      { role: 'user', content: correctiveUserPrompt },
    ];
  }

  const durationMs = Date.now() - startTime;

  if (!parseResult || !parseResult.success) {
    // Unreachable: the loop above either breaks on success or throws.
    throw new Error(
      `Failed to parse valid JSON from Nemotron model (${options.model}).`
    );
  }

  return {
    data: parseResult.data,
    modelUsed: options.model,
    durationMs,
    tokens: usage,
    hadCorrectiveRetry,
    rawOutput: rawText,
  };
}
