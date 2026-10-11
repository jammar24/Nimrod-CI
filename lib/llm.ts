import OpenAI from 'openai';
import { z } from 'zod';
import { extractAndValidateJson, stripThinkBlocks } from './json';
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
function extractRawResponseText(choice: any): string {
  if (!choice || !choice.message) {
    return '';
  }

  const message = choice.message;
  let text = message.content ? String(message.content).trim() : '';

  // If content is empty or contains only thinking, check reasoning fields
  if (!text) {
    const reasoning =
      message.reasoning_content ??
      message.reasoning ??
      message.reasoningContent ??
      choice.reasoning;

    if (reasoning) {
      text = String(reasoning).trim();
    }
  }

  return text;
}

/**
 * Executes a call to an NVIDIA Nemotron reasoning model on Nebius Token Factory,
 * extracts and validates JSON, and performs at most one corrective retry if Zod validation fails.
 */
export async function callNemotronJson<T>(
  options: LlmCallOptions<T>,
  clientOverride?: OpenAI
): Promise<LlmCallResult<T>> {
  const client = clientOverride || getNebiusClient();
  const startTime = Date.now();
  let hadCorrectiveRetry = false;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: options.systemPrompt },
    { role: 'user', content: options.userPrompt },
  ];

  const firstResponse = await client.chat.completions.create({
    model: options.model,
    messages,
    temperature: options.temperature ?? 0.1,
    max_tokens: options.maxTokens ?? 2048,
  });

  const firstChoice = firstResponse.choices?.[0];
  let rawText = extractRawResponseText(firstChoice);
  let parseResult = extractAndValidateJson(rawText, options.schema);

  // If first attempt failed schema validation, execute ONE corrective retry
  if (!parseResult.success) {
    hadCorrectiveRetry = true;
    const cleanedPrev = stripThinkBlocks(rawText).slice(0, 1500);

    const correctiveUserPrompt =
      `Your previous response failed validation with error: ${parseResult.error}.\n` +
      `Your previous output was:\n${cleanedPrev}\n\n` +
      'Please correct your output now. Output ONLY valid JSON strictly adhering to the schema. Do not write markdown blocks or explanations.';

    const retryResponse = await client.chat.completions.create({
      model: options.model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
        { role: 'assistant', content: rawText },
        { role: 'user', content: correctiveUserPrompt },
      ],
      temperature: 0.05,
      max_tokens: options.maxTokens ?? 2048,
    });

    const retryChoice = retryResponse.choices?.[0];
    const retryText = extractRawResponseText(retryChoice);
    rawText = retryText;
    parseResult = extractAndValidateJson(retryText, options.schema);

    if (!parseResult.success) {
      throw new Error(
        `Failed to parse valid JSON from Nemotron model (${options.model}) after corrective retry. Validation error: ${parseResult.error}. Raw output was: ${retryText}`
      );
    }
  }

  const durationMs = Date.now() - startTime;
  const usage = firstResponse.usage;

  return {
    data: parseResult.data,
    modelUsed: options.model,
    durationMs,
    tokens: usage
      ? {
          prompt: usage.prompt_tokens,
          completion: usage.completion_tokens,
          total: usage.total_tokens,
        }
      : undefined,
    hadCorrectiveRetry,
    rawOutput: rawText,
  };
}
