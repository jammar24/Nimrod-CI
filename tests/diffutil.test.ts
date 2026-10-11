import { describe, it, expect } from 'vitest';
import { applyPatchToCode, createUnifiedDiff } from '@/lib/diffutil';

describe('lib/diffutil: Patch application and diffing', () => {
  it('applies a standard unified diff cleanly', () => {
    const original = `const a = 1;\nconst b = 2;\n`;
    const diff = `--- a/file.js\n+++ b/file.js\n@@ -2,1 +2,1 @@\n-const b = 2;\n+const b = 42;\n`;

    const result = applyPatchToCode(original, diff);
    expect(result.success).toBe(true);
    expect(result.patchedCode).toContain('const b = 42;');
  });

  it('uses fallback patchedCode if diff fails to apply cleanly', () => {
    const original = `const a = 1;\nconst b = 2;\n`;
    const brokenDiff = `--- a/broken.js\n+++ b/broken.js\n@@ -99,1 +99,1 @@\n-nonexistent\n+fixed\n`;
    const fallbackCode = `const a = 1;\nconst b = 42;\n`;

    const result = applyPatchToCode(original, brokenDiff, fallbackCode);
    expect(result.success).toBe(true);
    expect(result.patchedCode).toBe(fallbackCode);
  });

  it('creates unified diff patch between strings', () => {
    const oldStr = 'function test() { return false; }';
    const newStr = 'function test() { return true; }';

    const patch = createUnifiedDiff('test.js', oldStr, newStr);
    expect(patch).toContain('--- test.js');
    expect(patch).toContain('+++ test.js');
    expect(patch).toContain('-function test() { return false; }');
    expect(patch).toContain('+function test() { return true; }');
  });
});
