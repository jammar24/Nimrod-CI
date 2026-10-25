import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { callNemotronJson } from '@/lib/llm';
import { isTruncationError } from '@/lib/json';

describe('lib/llm: callNemotronJson with Mocked OpenAI Client', () => {
  const TestSchema = z.object({
    status: z.string(),
    issuesFound: z.number(),
  });

  it('handles clean JSON response directly', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: '{"status": "clean", "issuesFound": 0}',
                },
              },
            ],
            usage: {
              prompt_tokens: 15,
              completion_tokens: 10,
              total_tokens: 25,
            },
          }),
        },
      },
    } as any;

    const result = await callNemotronJson(
      {
        model: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
        systemPrompt: 'System',
        userPrompt: 'User',
        schema: TestSchema,
      },
      mockClient
    );

    expect(result.data.status).toBe('clean');
    expect(result.data.issuesFound).toBe(0);
    expect(result.hadCorrectiveRetry).toBe(false);
    expect(result.modelUsed).toBe('nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B');
    expect(result.tokens?.total).toBe(25);
  });

  it('handles Nemotron <think> blocks in message.content', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content:
                    '<think>Analyzing code diff carefully...\nNo issues found.</think>\n```json\n{"status": "ok", "issuesFound": 0}\n```',
                },
              },
            ],
          }),
        },
      },
    } as any;

    const result = await callNemotronJson(
      {
        model: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
        systemPrompt: 'System',
        userPrompt: 'User',
        schema: TestSchema,
      },
      mockClient
    );

    expect(result.data.status).toBe('ok');
    expect(result.data.issuesFound).toBe(0);
  });

  it('handles empty message.content by reading reasoning_content fallback', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: '', // Empty content
                  reasoning_content: 'Thought process finished. Output:\n{"status": "verified", "issuesFound": 2}',
                },
              },
            ],
          }),
        },
      },
    } as any;

    const result = await callNemotronJson(
      {
        model: 'nvidia/nemotron-3-super-120b-a12b',
        systemPrompt: 'System',
        userPrompt: 'User',
        schema: TestSchema,
      },
      mockClient
    );

    expect(result.data.status).toBe('verified');
    expect(result.data.issuesFound).toBe(2);
  });

  it('performs one corrective retry when first response fails schema validation', async () => {
    const mockCreate = vi
      .fn()
      // First attempt: invalid schema (issuesFound is a string instead of number)
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{"status": "retry-needed", "issuesFound": "two"}',
            },
          },
        ],
      })
      // Second attempt (corrective retry): valid schema
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{"status": "recovered", "issuesFound": 2}',
            },
          },
        ],
      });

    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as any;

    const result = await callNemotronJson(
      {
        model: 'nvidia/nemotron-3-super-120b-a12b',
        systemPrompt: 'System',
        userPrompt: 'User',
        schema: TestSchema,
      },
      mockClient
    );

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.hadCorrectiveRetry).toBe(true);
    expect(result.data.status).toBe('recovered');
    expect(result.data.issuesFound).toBe(2);
  });

  it('throws descriptive error if retry also fails validation', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Invalid non-json conversational reply',
          },
        },
      ],
    });

    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as any;

    await expect(
      callNemotronJson(
        {
          model: 'nvidia/nemotron-3-super-120b-a12b',
          systemPrompt: 'System',
          userPrompt: 'User',
          schema: TestSchema,
        },
        mockClient
      )
    ).rejects.toThrow(/Failed to parse valid JSON from Nemotron model/);

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  describe('truncation handling (finish_reason: "length")', () => {
    it('retries with a doubled max_tokens budget when output is truncated', async () => {
      // In JS source the payload itself contains an unterminated JSON string
      // (the JSON was cut off mid-string when the token budget ran out).
      const truncatedPayload = '{"status": "truncated mid-str';
      const mockCreate = vi
        .fn()
        // First attempt: truncated mid-JSON (token budget exhausted)
        .mockResolvedValueOnce({
          choices: [
            {
              finish_reason: 'length',
              message: { content: truncatedPayload },
            },
          ],
        })
        // Retried with a bigger budget: complete JSON
        .mockResolvedValueOnce({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: '{"status": "complete", "issuesFound": 3}',
              },
            },
          ],
        });

      const mockClient = {
        chat: { completions: { create: mockCreate } },
      } as any;

      const result = await callNemotronJson(
        {
          model: 'nvidia/nemotron-3-super-120b-a12b',
          systemPrompt: 'System',
          userPrompt: 'User',
          schema: TestSchema,
          maxTokens: 1500,
        },
        mockClient
      );

      expect(mockCreate).toHaveBeenCalledTimes(2);
      // The retry must request double the token budget
      expect(mockCreate.mock.calls[0][0].max_tokens).toBe(1500);
      expect(mockCreate.mock.calls[1][0].max_tokens).toBe(3000);
      // The corrective retry prompt must discuss the truncation
      const corrective = mockCreate.mock.calls[1][0].messages[3].content;
      expect(corrective).toMatch(/finish_reason/i);
      expect(result.hadCorrectiveRetry).toBe(true);
      expect(result.data.status).toBe('complete');
      expect(result.data.issuesFound).toBe(3);
    });

    it('treats an unterminated-string parse error as truncation even without finish_reason', async () => {
      const mockCreate = vi
        .fn()
        .mockResolvedValueOnce({
          choices: [
            {
              message: { content: '{"status": "abc' }, // no finish_reason sent by provider
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: { content: '{"status": "abc", "issuesFound": 1}' },
            },
          ],
        });

      const mockClient = {
        chat: { completions: { create: mockCreate } },
      } as any;

      const result = await callNemotronJson(
        {
          model: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
          systemPrompt: 'System',
          userPrompt: 'User',
          schema: TestSchema,
        },
        mockClient
      );

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result.data.status).toBe('abc');
    });

    it('gives up after three attempts when the output stays truncated', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            finish_reason: 'length',
            message: { content: '{"status": "cut' },
          },
        ],
      });

      const mockClient = {
        chat: { completions: { create: mockCreate } },
      } as any;

      await expect(
        callNemotronJson(
          {
            model: 'nvidia/nemotron-3-super-120b-a12b',
            systemPrompt: 'System',
            userPrompt: 'User',
            schema: TestSchema,
          },
          mockClient
        )
      ).rejects.toThrow(/Failed to parse valid JSON from Nemotron model/);

      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });
});

describe('lib/llm: truncation error signature detection', () => {
  it('recognizes classic truncation parse errors', () => {
    expect(isTruncationError('JSON syntax parse error: Unterminated string in JSON at position 1235')).toBe(true);
    expect(isTruncationError('Unexpected end of JSON input')).toBe(true);
  });

  it('does not misclassify genuine malformed-JSON errors as truncation', () => {
    expect(isTruncationError("Unexpected token 'I', \"Invalid non-json\" is not valid JSON")).toBe(false);
    expect(isTruncationError('Schema validation failed: [root]: Required')).toBe(false);
    expect(isTruncationError('')).toBe(false);
  });
});
