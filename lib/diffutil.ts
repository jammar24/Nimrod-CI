import * as Diff from 'diff';

export interface ApplyPatchResult {
  success: boolean;
  patchedCode: string;
  error?: string;
}

/**
 * Attempts to apply a unified diff patch to the original source code.
 * If the unified diff cannot be applied directly (e.g. slight line offset in hunk headers),
 * falls back to the LLM-provided patchedCode if supplied and non-empty.
 */
export function applyPatchToCode(
  originalCode: string,
  unifiedDiff: string,
  fallbackPatchedCode?: string
): ApplyPatchResult {
  if (!originalCode && !fallbackPatchedCode) {
    return {
      success: false,
      patchedCode: '',
      error: 'Original code is empty',
    };
  }

  // Attempt standard unified diff application using jsdiff
  try {
    const applied = Diff.applyPatch(originalCode, unifiedDiff);
    if (typeof applied === 'string' && applied.trim() !== '') {
      return {
        success: true,
        patchedCode: applied,
      };
    }
  } catch (err: any) {
    // If standard applyPatch threw an exception, check fallback
  }

  // If jsdiff failed to apply cleanly but model provided full patchedCode, use it
  if (fallbackPatchedCode && fallbackPatchedCode.trim() !== '') {
    return {
      success: true,
      patchedCode: fallbackPatchedCode,
    };
  }

  return {
    success: false,
    patchedCode: originalCode,
    error: 'Unified diff could not be applied cleanly to the original code',
  };
}

/**
 * Creates a unified diff string between original and patched code.
 */
export function createUnifiedDiff(
  filename: string,
  oldStr: string,
  newStr: string
): string {
  return Diff.createPatch(filename, oldStr, newStr, 'original', 'patched');
}
