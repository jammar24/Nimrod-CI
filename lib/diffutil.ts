import * as Diff from 'diff';
import { Finding, Patch } from './schemas';
import { SECURITY_FIXTURES } from './examples';
import { detectLanguage } from './detect';

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
  } catch {
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

/**
 * Ensures a unified diff string explicitly uses the real file path in its headers:
 * --- a/${realPath}
 * +++ b/${realPath}
 */
export function ensureDiffHeaderHasRealPath(unifiedDiff: string, realPath: string): string {
  if (!unifiedDiff || !realPath || realPath === 'unknown') return unifiedDiff;

  const cleanPath = realPath.replace(/^[ab]\//, '').replace(/^['"]|['"]$/g, '');
  const lines = unifiedDiff.split(/\r?\n/);
  let hasMinusHeader = false;
  let hasPlusHeader = false;

  const modifiedLines = lines.map((line) => {
    if (line.startsWith('--- ')) {
      hasMinusHeader = true;
      return `--- a/${cleanPath}`;
    }
    if (line.startsWith('+++ ')) {
      hasPlusHeader = true;
      return `+++ b/${cleanPath}`;
    }
    return line;
  });

  if (!hasMinusHeader || !hasPlusHeader) {
    return `--- a/${cleanPath}\n+++ b/${cleanPath}\n${unifiedDiff.trimStart()}`;
  }

  return modifiedLines.join('\n');
}

/**
 * Reconstructs the source code state from a submitted unified diff or code snippet.
 * Strips diff metadata headers and deleted lines (-), retaining context lines (' ') and added lines (+).
 * If the input is not a unified diff, returns it as-is.
 */
export function reconstructOriginalCodeFromDiff(diff: string): string {
  if (!diff || !diff.trim()) return '';

  const lines = diff.split(/\r?\n/);
  const isUnifiedDiff = lines.some(
    (l) => l.startsWith('@@ ') || l.startsWith('--- ') || l.startsWith('+++ ')
  );

  if (!isUnifiedDiff) {
    return diff;
  }

  const reconstructedLines: string[] = [];
  let inHunk = false;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      inHunk = true;
      continue;
    }
    if (!inHunk) {
      // Header lines (---, +++, diff --git, index, etc.)
      continue;
    }

    if (line.startsWith('+')) {
      // Line added in diff: strip leading '+'
      reconstructedLines.push(line.slice(1));
    } else if (line.startsWith('-')) {
      // Line deleted in diff: skip for the target state containing the changes
      continue;
    } else if (line.startsWith(' ')) {
      // Unchanged context line: strip leading space
      reconstructedLines.push(line.slice(1));
    } else if (line.startsWith('\\ No newline at end of file')) {
      continue;
    } else {
      // Unprefixed line
      reconstructedLines.push(line);
    }
  }

  if (reconstructedLines.length === 0) {
    // Fallback if no hunks were parsed
    return lines
      .filter((l) => !l.startsWith('---') && !l.startsWith('+++') && !l.startsWith('@@') && !l.startsWith('diff --git'))
      .map((l) => (l.startsWith('+') || l.startsWith('-') || l.startsWith(' ') ? l.slice(1) : l))
      .join('\n');
  }

  return reconstructedLines.join('\n');
}

/**
 * Resolves the original code to be passed into the patch and verify steps.
 * Rules:
 * 1. Never reuse a loaded example's stored originalCode unless the diff matches the example exactly.
 * 2. If the user edited or submitted a new diff, reconstruct the original code from the diff.
 */
export function resolveOriginalCode(diff: string, originalCode?: string): string {
  const trimmedDiff = (diff || '').trim();
  const trimmedOriginal = (originalCode || '').trim();

  // Check if diff exactly matches any security fixture
  const matchingFixture = SECURITY_FIXTURES.find(
    (f) => f.diff.trim() === trimmedDiff
  );

  if (matchingFixture) {
    // Diff matches fixture exactly: only reuse stored originalCode if valid
    if (!trimmedOriginal || trimmedOriginal === matchingFixture.originalCode.trim()) {
      return matchingFixture.originalCode;
    }
  }

  // Check if the passed originalCode is from ANY loaded fixture whose diff doesn't match
  const isStaleFixtureCode = SECURITY_FIXTURES.some(
    (f) => f.originalCode.trim() === trimmedOriginal && f.diff.trim() !== trimmedDiff
  );

  // If user provided a custom originalCode (e.g. in Before/After mode) and it's NOT a stale fixture code
  if (trimmedOriginal && !isStaleFixtureCode && trimmedOriginal !== trimmedDiff) {
    return originalCode!;
  }

  // The text is not the example's; reconstruct from diff
  const reconstructed = reconstructOriginalCodeFromDiff(diff);
  return reconstructed || diff;
}

/**
 * Extracts the modified file path from a unified diff header.
 */
export function extractFilePathFromDiff(diff: string): string | null {
  if (!diff) return null;
  const plusMatch = diff.match(/^\+\+\+\s+(?:[b]\/)?([^\s\r\n\t]+)/m);
  if (plusMatch && plusMatch[1] && plusMatch[1] !== '/dev/null') {
    return plusMatch[1].replace(/^[ab]\//, '').replace(/^['"]|['"]$/g, '');
  }
  const minusMatch = diff.match(/^---\s+(?:[a]\/)?([^\s\r\n\t]+)/m);
  if (minusMatch && minusMatch[1] && minusMatch[1] !== '/dev/null') {
    return minusMatch[1].replace(/^[ab]\//, '').replace(/^['"]|['"]$/g, '');
  }
  const gitMatch = diff.match(/^diff --git\s+[a]\/([^\s]+)\s+[b]\/([^\s]+)/m);
  if (gitMatch && gitMatch[2]) {
    return gitMatch[2].replace(/^[ab]\//, '').replace(/^['"]|['"]$/g, '');
  }
  return null;
}

export interface ConsistencyCheckResult {
  valid: boolean;
  reason?: string;
  findingLanguage?: string;
  patchLanguage?: string;
  findingFile?: string;
  patchFile?: string;
}

/**
 * Consistency check: validates that the language and file path of the patch
 * match the analyzed finding.
 */
export function checkPatchConsistency(
  finding: Finding,
  patch: Patch,
  expectedLanguage?: string,
  originalCode?: string
): ConsistencyCheckResult {
  // 1. Expected language from finding, original code, or explicit language option
  const targetCode = originalCode || finding.vulnerableSnippet || '';
  const detectedFindingLang = detectLanguage(targetCode, finding.file);
  const normalizedExpectedLang =
    expectedLanguage && expectedLanguage !== 'auto'
      ? expectedLanguage.toLowerCase()
      : detectedFindingLang;

  // 2. Patch language from patch unifiedDiff, patchedCode, and patch file path
  const patchFileFromDiff = extractFilePathFromDiff(patch.unifiedDiff);
  const detectedPatchLang = detectLanguage(
    patch.patchedCode || patch.unifiedDiff,
    patchFileFromDiff || undefined
  );

  // Compare language: Python vs JS/TS mismatch check
  const isFindingPython = normalizedExpectedLang === 'python';
  const isPatchPython = detectedPatchLang === 'python';

  if (isFindingPython !== isPatchPython) {
    return {
      valid: false,
      reason: `Language mismatch: finding is ${isFindingPython ? 'Python' : 'JavaScript/TypeScript'}, but patch is ${isPatchPython ? 'Python' : 'JavaScript/TypeScript'}`,
      findingLanguage: normalizedExpectedLang,
      patchLanguage: detectedPatchLang,
      findingFile: finding.file,
      patchFile: patchFileFromDiff || undefined,
    };
  }

  // 3. Compare file paths / extensions if finding specifies a real file
  if (finding.file && finding.file !== 'unknown' && patchFileFromDiff) {
    const normFindingFile = finding.file.replace(/^[ab]\//, '').toLowerCase();
    const normPatchFile = patchFileFromDiff.replace(/^[ab]\//, '').toLowerCase();

    const findingExt = normFindingFile.split('.').pop();
    const patchExt = normPatchFile.split('.').pop();

    if (findingExt && patchExt && findingExt !== patchExt) {
      return {
        valid: false,
        reason: `File extension mismatch: finding is in .${findingExt} (${finding.file}), but patch modifies .${patchExt} (${patchFileFromDiff})`,
        findingLanguage: normalizedExpectedLang,
        patchLanguage: detectedPatchLang,
        findingFile: finding.file,
        patchFile: patchFileFromDiff,
      };
    }

    const findingBase = normFindingFile.split('/').pop();
    const patchBase = normPatchFile.split('/').pop();
    if (findingBase && patchBase && findingBase !== patchBase) {
      return {
        valid: false,
        reason: `File name mismatch: finding is in "${findingBase}", but patch modifies "${patchBase}"`,
        findingLanguage: normalizedExpectedLang,
        patchLanguage: detectedPatchLang,
        findingFile: finding.file,
        patchFile: patchFileFromDiff,
      };
    }
  }

  return {
    valid: true,
    findingLanguage: normalizedExpectedLang,
    patchLanguage: detectedPatchLang,
  };
}

/**
 * Truncates and centers the code context around the vulnerable snippet,
 * keeping the overall payload compact to avoid model generation timeouts.
 */
export function getCondensedCodeContext(
  originalCode: string,
  vulnerableSnippet?: string,
  maxLines: number = 60
): string {
  if (!originalCode || originalCode.length < 1500) {
    return originalCode;
  }

  const lines = originalCode.split('\n');
  if (lines.length <= maxLines) {
    return originalCode;
  }

  const cleanSnippet = vulnerableSnippet
    ? vulnerableSnippet.trim().split('\n')[0]?.trim() || ''
    : '';
  let matchIndex = -1;

  if (cleanSnippet) {
    matchIndex = lines.findIndex((l) => l.includes(cleanSnippet));
  }

  if (matchIndex === -1) {
    return lines.slice(0, maxLines).join('\n') + '\n// ... [remaining code omitted for brevity]';
  }

  const half = Math.floor(maxLines / 2);
  const start = Math.max(0, matchIndex - half);
  const end = Math.min(lines.length, matchIndex + half);

  const prefix = start > 0 ? '// ... [preceding code omitted for brevity]\n' : '';
  const suffix = end < lines.length ? '\n// ... [remaining code omitted for brevity]' : '';

  return prefix + lines.slice(start, end).join('\n') + suffix;
}

