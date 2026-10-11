import * as acorn from 'acorn';
import ts from 'typescript';

export interface SyntaxCheckResult {
  valid: boolean;
  error?: string;
  engineUsed: 'acorn' | 'typescript' | 'none';
  notes?: string;
}

/**
 * Checks syntax validity for JavaScript code using acorn parser.
 */
export function checkJavaScriptSyntax(code: string): SyntaxCheckResult {
  // Try parsing as ES module first
  try {
    acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });
    return { valid: true, engineUsed: 'acorn' };
  } catch (moduleError: any) {
    // Fall back to script mode (common for snippets with return outside functions)
    try {
      acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'script',
      });
      return { valid: true, engineUsed: 'acorn' };
    } catch (scriptError: any) {
      return {
        valid: false,
        error: `JavaScript syntax error: ${moduleError.message}`,
        engineUsed: 'acorn',
      };
    }
  }
}

/**
 * Checks syntax validity for TypeScript code using TypeScript compiler diagnostics.
 */
export function checkTypeScriptSyntax(code: string): SyntaxCheckResult {
  try {
    const result = ts.transpileModule(code, {
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        noEmit: true,
      },
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      const syntaxErrors = result.diagnostics.filter(
        (d) => d.category === ts.DiagnosticCategory.Error
      );

      if (syntaxErrors.length > 0) {
        const firstError = syntaxErrors[0];
        const message =
          typeof firstError.messageText === 'string'
            ? firstError.messageText
            : firstError.messageText.messageText;

        return {
          valid: false,
          error: `TypeScript syntax error: ${message}`,
          engineUsed: 'typescript',
        };
      }
    }

    return { valid: true, engineUsed: 'typescript' };
  } catch (err: any) {
    return {
      valid: false,
      error: `TypeScript check failed: ${err.message}`,
      engineUsed: 'typescript',
    };
  }
}

/**
 * Evaluates syntax based on programming language.
 */
export function checkSyntax(
  code: string,
  language: string = 'javascript'
): SyntaxCheckResult {
  const normalizedLang = (language || '').toLowerCase().trim();

  if (normalizedLang === 'typescript' || normalizedLang === 'ts') {
    return checkTypeScriptSyntax(code);
  }

  if (normalizedLang === 'javascript' || normalizedLang === 'js') {
    return checkJavaScriptSyntax(code);
  }

  if (normalizedLang === 'python' || normalizedLang === 'py') {
    return {
      valid: true,
      engineUsed: 'none',
      notes: 'Python syntax validation delegated to Nemotron model re-analysis.',
    };
  }

  // Auto or other: attempt TS (which supersets JS)
  const tsCheck = checkTypeScriptSyntax(code);
  if (tsCheck.valid) return tsCheck;

  return checkJavaScriptSyntax(code);
}
