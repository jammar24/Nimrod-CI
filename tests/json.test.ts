import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  stripThinkBlocks,
  stripMarkdownFences,
  findBalancedJson,
  extractAndValidateJson,
} from '@/lib/json';

describe('lib/json: Robust JSON extraction & Nemotron cleaning', () => {
  it('strips closed <think> blocks completely', () => {
    const raw = '<think>I need to analyze this diff carefully.\nLine 4 looks bad.</think>{"status":"ok"}';
    const cleaned = stripThinkBlocks(raw);
    expect(cleaned).toBe('{"status":"ok"}');
  });

  it('strips multiline and case-insensitive <think> blocks', () => {
    const raw = 'Before <THINK>\nDeep thought step 1...\nDeep thought step 2...\n</THINK> After';
    const cleaned = stripThinkBlocks(raw);
    expect(cleaned).toBe('Before  After');
  });

  it('strips unclosed leading <think> tag if output truncated', () => {
    const raw = '<think>Still thinking about line 4...';
    const cleaned = stripThinkBlocks(raw);
    expect(cleaned).toBe('');
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"findings": []}\n```';
    const cleaned = stripMarkdownFences(raw);
    expect(cleaned).toBe('{"findings": []}');
  });

  it('finds balanced JSON objects surrounded by conversational prose', () => {
    const raw = 'Here is the requested analysis:\n{"key": "value"}\nHope this helps!';
    const json = findBalancedJson(raw);
    expect(json).toBe('{"key": "value"}');
  });

  it('finds balanced JSON arrays surrounded by text', () => {
    const raw = 'Listing:\n[{"id": 1}, {"id": 2}]\nEnd of list.';
    const json = findBalancedJson(raw);
    expect(json).toBe('[{"id": 1}, {"id": 2}]');
  });

  it('handles strings with escaped quotes inside JSON', () => {
    const raw = '{"snippet": "const msg = \\"hello\\";", "safe": true}';
    const json = findBalancedJson(raw);
    expect(json).toBe(raw);
  });

  it('extractAndValidateJson extracts, parses and validates against Zod schema', () => {
    const schema = z.object({
      count: z.number(),
      active: z.boolean(),
    });

    const raw = '<think>Calculating...</think>\n```json\n{"count": 42, "active": true}\n```';
    const result = extractAndValidateJson(raw, schema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(42);
      expect(result.data.active).toBe(true);
    }
  });

  it('returns failure with detailed error on invalid schema match', () => {
    const schema = z.object({
      count: z.number(),
    });

    const raw = '{"count": "not-a-number"}';
    const result = extractAndValidateJson(raw, schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Schema validation failed');
      expect(result.error).toContain('count');
    }
  });
});
