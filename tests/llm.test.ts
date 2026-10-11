import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { callNemotronJson } from '@/lib/llm';

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
});
