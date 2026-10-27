'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../../components/ThemeToggle';
import {
  ArrowLeft,
  Terminal,
  Activity,
  Cpu,
  Search,
  Code2,
  FileCheck,
  GitPullRequest,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Zap,
  Server,
  Globe,
  Menu,
  X,
} from 'lucide-react';

// ─────────────────────────────────────────
// Translations
// ─────────────────────────────────────────
const T = {
  en: {
    homeBtn: 'Home',
    launchReviewer: 'Launch Reviewer',
    review: 'Review',
    heroTag: 'Nebius Token Factory · NVIDIA Nemotron Architecture',
    heroTitle: 'Developer Documentation & REST API',
    heroSubtitle: 'Complete technical specification for integrating Nimrod-CI into your CI/CD pipelines, IDEs, and security workflows.',
    primaryReasoning: 'Primary Reasoning',
    fastTriage: 'Fast Triage & Verify',
    threatIntel: 'Threat Intelligence',
    compilerGate: 'Compiler Safety Gate',
    tabEndpoints: 'REST Endpoints',
    tabPipeline: '5-Stage Pipeline',
    tabSchema: 'Report & SARIF Schema',
    tabIntegrations: 'CI/CD & Code Samples',
    restApiTitle: 'REST API Specification',
    restApiSub: 'All endpoints accept standard JSON payloads over HTTPS and return structured, schema-validated JSON responses.',
    copyCurl: 'Copy cURL',
    copied: 'Copied cURL!',
    copyLabel: 'Copy',
    copiedLabel: 'Copied',
    requestBody: 'Request Body (JSON)',
    responsePayload: 'Response Payload (200 OK)',
    paramsSchema: 'Parameters & Schema',
    fieldCol: 'Field',
    typeCol: 'Type',
    requiredCol: 'Required',
    descCol: 'Description',
    requiredYes: 'Yes',
    requiredOptional: 'Optional',
    pipelineTitle: 'Autonomous Agentic Architecture',
    pipelineSub: 'How Nimrod-CI orchestrates multi-agent static security reasoning to eliminate false positives and produce verified fixes.',
    stage1Title: 'Stage 1: Hunk Triage',
    stage1Desc: 'Evaluates added/modified diff hunks. Filters out purely benign commits (comments, documentation, test refactors) and extracts specific line windows marked as suspicious. Prevents wasting expensive reasoning tokens on safe modifications.',
    stage1Meta: 'Latency: ~1.2s · Output: Array of RiskyHunk markers',
    stage2Title: 'Stage 2: Deep SAST Vulnerability Reasoning',
    stage2Desc: 'Runs multi-hop reasoning over control and data flow. Identifies tainted inputs, sinks, and CWE patterns (CWE-89, CWE-79, CWE-798, CWE-22, CWE-502). Generates realistic exploit scenarios demonstrating why the flaw is actionable.',
    stage2Meta: 'Latency: ~3.8s · Reasoning: 120B parameter model with chain-of-thought',
    stage3Title: 'Stage 3: Live Threat Intelligence Enrichment',
    stage3Desc: 'Connects directly to real-time search to retrieve OWASP Prevention Cheat Sheets, NIST bulletins, and language-specific remediation guides. Operates under strict fail-soft architecture so pipeline execution never aborts if search is unavailable.',
    stage3Meta: 'Latency: ~1.4s · Fallback: Gracefully continues with model reasoning',
    stage4Title: 'Stage 4: Autonomous Patch Synthesis',
    stage4Desc: 'Generates a minimal, production-ready unified diff patch adhering strictly to existing coding styles. Enforces hard safety rules: never proposes dynamic code evaluation (eval, new Function, shell=True). Preserves the exact target file path in the diff header.',
    stage4Meta: 'Format: Standard unified diff (--- a/file / +++ b/file) + full patched file',
    stage5Title: 'Stage 5: AST Syntax Verification & Re-Analysis',
    stage5Desc: 'Applies the synthesized patch in memory and executes AST syntax parsing (JavaScript/TypeScript). A differential security re-analysis evaluates whether the original flaw or any new weakness was introduced. Retries up to 2 times with feedback.',
    stage5Meta: 'Guarantee: Non-breaking syntax + verified vulnerability resolution + PR safety gate',
    schemaTitle: 'Report & OASIS SARIF v2.1.0 Schemas',
    schemaSub: 'Nimrod-CI produces structured JSON security reviews and native SARIF v2.1.0 exports compatible with GitHub Code Scanning.',
    nimrodSchema: 'Unified NimrodReport Schema',
    sarifTitle: 'OASIS SARIF v2.1.0 Export',
    sarifSub: 'Exported directly via the UI or CI/CD script for automatic ingestion into GitHub Security Code Scanning tab.',
    integrationsTitle: 'Automated CI/CD Quality Gate',
    integrationsSub: 'Integrate Nimrod-CI as a blocking gate on Pull Requests using GitHub Actions or native CLI scripts.',
    ghaWorkflow: 'GitHub Actions Workflow',
    copyWorkflow: 'Copy Workflow',
    copiedWorkflow: 'Copied',
    nodeExample: 'Node.js / TypeScript Example',
    pythonExample: 'Python Example',
    footerPowered: 'Powered by Nebius Token Factory · NVIDIA Nemotron · Tavily Search',
    footerGithub: 'GitHub Repository',
    footerMit: 'MIT License',
    ep0Title: 'Service Health & Diagnostics',
    ep0Engine: 'System Monitoring',
    ep0Desc: 'Returns real-time status of the service, active NVIDIA Nemotron models, environment variable readiness, and endpoint registry.',
    ep1Title: 'Vulnerability Test Fixtures',
    ep1Engine: 'Security Datasets',
    ep1Desc: 'Provides curated security test fixtures (SQL Injection, Hardcoded API Keys, DOM XSS, Path Traversal, Insecure Deserialization, and Benign controls).',
    ep2Title: 'Rapid Hunk Triage & Screening',
    ep2Desc: 'Quickly screens unified diffs to identify high-risk code hunks and filter out harmless styling/refactoring changes before expensive reasoning.',
    ep3Title: 'Deep SAST Reasoning & Full Pipeline',
    ep3Desc: 'Executes comprehensive static vulnerability reasoning using NVIDIA Nemotron. Optionally passes fullPipeline: true to receive a complete NimrodReport with verdict and score.',
    ep4Title: 'Tavily Threat Intelligence & OWASP Enrichment',
    ep4Desc: 'Enriches detected findings with authoritative CWE and OWASP remediation guidelines, security advisories, and industry documentation. Operates with fail-soft architecture.',
    ep5Title: 'Autonomous Patch Synthesis (Hard Safety Rules)',
    ep5Desc: 'Generates a minimal, non-breaking unified diff and patched source code file. Governed by strict safety rules: never proposes eval, new Function, or shell=True. Enforces the real target file path in the unified diff header.',
    ep6Title: 'AST Syntax Verification & Model Re-Analysis',
    ep6Desc: 'Verifies the synthesized patch through a two-stage gate: AST compiler syntax check followed by model re-analysis for any residual weakness. Returns resolved: false with CWE and line in notes, feeding back to /api/patch for an automated retry (up to 2 iterations).',
    ep7Title: 'GitHub PR Inspection & Diff Fetching',
    ep7Engine: 'GitHub REST API v3',
    ep7Desc: 'Parses any GitHub Pull Request URL, fetches PR metadata, unified diff, and primary modified source files directly from GitHub.',
    ep8Title: 'GitHub Automated Patch PR Submission',
    ep8Engine: 'GitHub Git Data API',
    ep8Desc: 'Creates a security remediation branch, commits the verified patch, and opens an automated Pull Request with full analysis notes directly on GitHub.',
    p_diff: 'Unified code diff (max 20,000 characters)',
    p_language: 'Source language (e.g. javascript, typescript, python)',
    p_riskyHunks: 'Optional hunks pre-filtered by Triage',
    p_fullPipeline: 'If true, returns complete report with verdict, risk score, and stats',
    p_findings: 'List of Finding objects returned by /api/analyze',
    p_finding: 'Finding object to remediate',
    p_originalCode: 'Full or hunk source code',
    p_feedback: 'Verification feedback with CWE and line number for iterative self-repair',
    p_patch: 'Synthesized Patch object',
    p_originalCodeFull: 'Original source code',
    p_iteration: 'Current loop iteration (1 to 2, server-enforced max)',
    p_url: 'GitHub PR URL (e.g. https://github.com/jammar24/Nimrod-CI/pull/1)',
    p_token: 'Optional GitHub Personal Access Token (for private repos or higher rate limits)',
    p_action: 'Must be "create-pr" or "fetch-pr"',
    p_owner: 'Repository owner handle',
    p_repo: 'Repository name',
    p_filePath: 'Relative path of patched file',
    p_patchedContent: 'Complete source code with security fix applied',
    p_tokenRequired: 'GitHub Personal Access Token (PAT) with repo scope',
  },
  es: {
    homeBtn: 'Inicio',
    launchReviewer: 'Iniciar Revisor',
    review: 'Revisar',
    heroTag: 'Nebius Token Factory · Arquitectura NVIDIA Nemotron',
    heroTitle: 'Documentación para Desarrolladores & REST API',
    heroSubtitle: 'Especificación técnica completa para integrar Nimrod-CI en tus pipelines CI/CD, IDEs y flujos de trabajo de seguridad.',
    primaryReasoning: 'Razonamiento Principal',
    fastTriage: 'Triage Rápido & Verificación',
    threatIntel: 'Inteligencia de Amenazas',
    compilerGate: 'Puerta de Seguridad del Compilador',
    tabEndpoints: 'Endpoints REST',
    tabPipeline: 'Pipeline de 5 Etapas',
    tabSchema: 'Esquema de Reporte & SARIF',
    tabIntegrations: 'CI/CD & Ejemplos de Código',
    restApiTitle: 'Especificación de la REST API',
    restApiSub: 'Todos los endpoints aceptan payloads JSON estándar sobre HTTPS y devuelven respuestas JSON estructuradas y validadas por esquema.',
    copyCurl: 'Copiar cURL',
    copied: '¡cURL copiado!',
    copyLabel: 'Copiar',
    copiedLabel: 'Copiado',
    requestBody: 'Cuerpo de Solicitud (JSON)',
    responsePayload: 'Respuesta (200 OK)',
    paramsSchema: 'Parámetros & Esquema',
    fieldCol: 'Campo',
    typeCol: 'Tipo',
    requiredCol: 'Requerido',
    descCol: 'Descripción',
    requiredYes: 'Sí',
    requiredOptional: 'Opcional',
    pipelineTitle: 'Arquitectura Agéntica Autónoma',
    pipelineSub: 'Cómo Nimrod-CI orquesta el razonamiento de seguridad estático multi-agente para eliminar falsos positivos y producir correcciones verificadas.',
    stage1Title: 'Etapa 1: Triage de Hunks',
    stage1Desc: 'Evalúa los hunks del diff añadidos/modificados. Filtra commits puramente benignos (comentarios, documentación, refactorizaciones de tests) y extrae ventanas de líneas específicas marcadas como sospechosas. Evita desperdiciar tokens de razonamiento costosos en modificaciones seguras.',
    stage1Meta: 'Latencia: ~1.2s · Salida: Arreglo de marcadores RiskyHunk',
    stage2Title: 'Etapa 2: Razonamiento Profundo de Vulnerabilidades SAST',
    stage2Desc: 'Ejecuta razonamiento multi-salto sobre flujo de control y datos. Identifica entradas contaminadas, sinks y patrones CWE (CWE-89, CWE-79, CWE-798, CWE-22, CWE-502). Genera escenarios de explotación realistas que demuestran por qué el fallo es accionable.',
    stage2Meta: 'Latencia: ~3.8s · Razonamiento: modelo de 120B parámetros con chain-of-thought',
    stage3Title: 'Etapa 3: Enriquecimiento con Inteligencia de Amenazas en Vivo',
    stage3Desc: 'Se conecta directamente a búsqueda en tiempo real para recuperar Hojas de Trucos de Prevención OWASP, boletines NIST y guías de remediación específicas del lenguaje. Opera bajo arquitectura fail-soft estricta para que la ejecución del pipeline nunca aborte si la búsqueda no está disponible.',
    stage3Meta: 'Latencia: ~1.4s · Fallback: Continúa graciosamente con razonamiento del modelo',
    stage4Title: 'Etapa 4: Síntesis Autónoma de Parches',
    stage4Desc: 'Genera un parche diff unificado mínimo y listo para producción, adhiriéndose estrictamente a los estilos de código existentes. Aplica reglas de seguridad estrictas: nunca propone evaluación dinámica de código (eval, new Function, shell=True). Preserva la ruta exacta del archivo destino en el encabezado del diff.',
    stage4Meta: 'Formato: Unified diff estándar (--- a/archivo / +++ b/archivo) + archivo parcheado completo',
    stage5Title: 'Etapa 5: Verificación de Sintaxis AST & Re-Análisis',
    stage5Desc: 'Aplica el parche sintetizado en memoria y ejecuta análisis sintáctico AST (JavaScript/TypeScript). Un re-análisis diferencial de seguridad evalúa si se introdujo el fallo original o alguna nueva debilidad. Reintenta hasta 2 veces con retroalimentación.',
    stage5Meta: 'Garantía: Sintaxis no rompedora + resolución de vulnerabilidad verificada + puerta de seguridad PR',
    schemaTitle: 'Esquemas de Reporte & OASIS SARIF v2.1.0',
    schemaSub: 'Nimrod-CI produce revisiones de seguridad JSON estructuradas y exportaciones nativas SARIF v2.1.0 compatibles con GitHub Code Scanning.',
    nimrodSchema: 'Esquema Unificado NimrodReport',
    sarifTitle: 'Exportación OASIS SARIF v2.1.0',
    sarifSub: 'Exportado directamente desde la UI o script CI/CD para ingesta automática en la pestaña de Escaneo de Código de Seguridad de GitHub.',
    integrationsTitle: 'Puerta de Calidad CI/CD Automatizada',
    integrationsSub: 'Integra Nimrod-CI como puerta bloqueante en Pull Requests usando GitHub Actions o scripts CLI nativos.',
    ghaWorkflow: 'Flujo de Trabajo de GitHub Actions',
    copyWorkflow: 'Copiar Workflow',
    copiedWorkflow: 'Copiado',
    nodeExample: 'Ejemplo Node.js / TypeScript',
    pythonExample: 'Ejemplo Python',
    footerPowered: 'Impulsado por Nebius Token Factory · NVIDIA Nemotron · Tavily Search',
    footerGithub: 'Repositorio GitHub',
    footerMit: 'Licencia MIT',
    ep0Title: 'Estado del Servicio & Diagnósticos',
    ep0Engine: 'Monitoreo del Sistema',
    ep0Desc: 'Devuelve el estado en tiempo real del servicio, los modelos NVIDIA Nemotron activos, la disponibilidad de variables de entorno y el registro de endpoints.',
    ep1Title: 'Fixtures de Pruebas de Vulnerabilidad',
    ep1Engine: 'Conjuntos de Datos de Seguridad',
    ep1Desc: 'Proporciona fixtures de pruebas de seguridad curadas (Inyección SQL, Claves API Hardcodeadas, DOM XSS, Path Traversal, Deserialización Insegura y controles Benignos).',
    ep2Title: 'Triage Rápido de Hunks & Cribado',
    ep2Desc: 'Examina rápidamente diffs unificados para identificar hunks de código de alto riesgo y filtrar cambios de estilo/refactorización inofensivos antes del razonamiento costoso.',
    ep3Title: 'Razonamiento SAST Profundo & Pipeline Completo',
    ep3Desc: 'Ejecuta razonamiento de vulnerabilidad estática exhaustivo usando NVIDIA Nemotron. Opcionalmente pasa fullPipeline: true para recibir un NimrodReport completo con veredicto y puntuación.',
    ep4Title: 'Inteligencia de Amenazas Tavily & Enriquecimiento OWASP',
    ep4Desc: 'Enriquece los hallazgos detectados con directrices CWE y OWASP autorizadas, avisos de seguridad y documentación de la industria. Opera con arquitectura fail-soft.',
    ep5Title: 'Síntesis Autónoma de Parches (Reglas de Seguridad Estrictas)',
    ep5Desc: 'Genera un diff unificado mínimo y no rompedor. Gobernado por reglas de seguridad estrictas: nunca propone eval, new Function, o shell=True. Aplica la ruta real del archivo destino en el encabezado del diff unificado.',
    ep6Title: 'Verificación de Sintaxis AST & Re-Análisis del Modelo',
    ep6Desc: 'Verifica el parche sintetizado mediante una puerta de dos etapas: verificación de sintaxis AST seguida de re-análisis del modelo para cualquier debilidad residual. Devuelve resolved: false con CWE y línea en notas, retroalimentando a /api/patch para un reintento automático (hasta 2 iteraciones).',
    ep7Title: 'Inspección de PR de GitHub & Obtención de Diff',
    ep7Engine: 'GitHub REST API v3',
    ep7Desc: 'Analiza cualquier URL de Pull Request de GitHub, obtiene metadatos del PR, diff unificado y archivos fuente modificados principales directamente desde GitHub.',
    ep8Title: 'Envío Automatizado de PR de Parche a GitHub',
    ep8Engine: 'GitHub Git Data API',
    ep8Desc: 'Crea una rama de remediación de seguridad, hace commit del parche verificado y abre un Pull Request automatizado con notas de análisis completas directamente en GitHub.',
    p_diff: 'Diff de código unificado (máx. 20,000 caracteres)',
    p_language: 'Lenguaje fuente (ej. javascript, typescript, python)',
    p_riskyHunks: 'Hunks opcionales pre-filtrados por Triage',
    p_fullPipeline: 'Si es true, devuelve reporte completo con veredicto, puntuación de riesgo y estadísticas',
    p_findings: 'Lista de objetos Finding devueltos por /api/analyze',
    p_finding: 'Objeto Finding a remediar',
    p_originalCode: 'Código fuente completo o de hunk',
    p_feedback: 'Retroalimentación de verificación con CWE y número de línea para auto-reparación iterativa',
    p_patch: 'Objeto Patch sintetizado',
    p_originalCodeFull: 'Código fuente original',
    p_iteration: 'Iteración de bucle actual (1 a 2, máximo impuesto por el servidor)',
    p_url: 'URL de PR de GitHub (ej. https://github.com/jammar24/Nimrod-CI/pull/1)',
    p_token: 'Token de Acceso Personal de GitHub opcional (para repos privados o límites de tasa más altos)',
    p_action: 'Debe ser "create-pr" o "fetch-pr"',
    p_owner: 'Handle del propietario del repositorio',
    p_repo: 'Nombre del repositorio',
    p_filePath: 'Ruta relativa del archivo parcheado',
    p_patchedContent: 'Código fuente completo con la corrección de seguridad aplicada',
    p_tokenRequired: 'Token de Acceso Personal de GitHub (PAT) con alcance repo',
  },
} as const;

type Lang = 'en' | 'es';

interface EndpointSpec {
  method: 'GET' | 'POST';
  path: string;
  titleKey: keyof typeof T.en;
  engineKey?: keyof typeof T.en;
  engineRaw?: string;
  descKey: keyof typeof T.en;
  requestSnippet?: string;
  responseSnippet: string;
  curlSnippet: string;
  params?: { name: string; typeStr: string; required: boolean; descKey: keyof typeof T.en }[];
}

export default function DocsPage() {
  const [models, setModels] = useState<{ fast: string; primary: string }>({
    fast: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
    primary: 'nvidia/nemotron-3-super-120b-a12b',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'pipeline' | 'schema' | 'integrations'>('endpoints');
  const [lang, setLang] = useState<Lang>('en');

  const t = T[lang];

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => { if (data?.models) setModels(data.models); })
      .catch(() => {});
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const endpoints: EndpointSpec[] = [
    {
      method: 'GET', path: '/api/health', titleKey: 'ep0Title', engineKey: 'ep0Engine', descKey: 'ep0Desc',
      responseSnippet: `{\n  "status": "ok",\n  "service": "Nimrod-CI",\n  "version": "1.0.0",\n  "models": {\n    "primary": "nvidia/nemotron-3-super-120b-a12b",\n    "fast": "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"\n  },\n  "endpoints": [ ... ]\n}`,
      curlSnippet: `curl -s https://nimrod-ci.vercel.app/api/health | jq .`,
    },
    {
      method: 'GET', path: '/api/examples', titleKey: 'ep1Title', engineKey: 'ep1Engine', descKey: 'ep1Desc',
      responseSnippet: `{\n  "examples": [\n    {\n      "id": "sqli",\n      "title": "SQL Injection in User Authentication",\n      "category": "CWE-89",\n      "severity": "critical",\n      "language": "javascript"\n    }\n  ]\n}`,
      curlSnippet: `curl -s https://nimrod-ci.vercel.app/api/examples | jq .`,
    },
    {
      method: 'POST', path: '/api/triage', titleKey: 'ep2Title', engineRaw: 'models.fast', descKey: 'ep2Desc',
      params: [
        { name: 'diff', typeStr: 'string', required: true, descKey: 'p_diff' },
        { name: 'language', typeStr: 'string', required: false, descKey: 'p_language' },
      ],
      requestSnippet: `{\n  "diff": "--- a/api/login.js\\n+++ b/api/login.js\\n@@ -10,3 +10,3 @@\\n- const q = 'SELECT * FROM users WHERE id = ' + userId;\\n+ const q = \`SELECT * FROM users WHERE id = \${userId}\`;",\n  "language": "javascript"\n}`,
      responseSnippet: `{\n  "needsDeepAnalysis": true,\n  "confidence": 0.98,\n  "riskyHunks": [\n    {\n      "file": "api/login.js",\n      "lineStart": 10,\n      "flagReason": "Possible SQL injection: unescaped template literal parameter."\n    }\n  ]\n}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/triage \\\n  -H "Content-Type: application/json" \\\n  -d '{"diff": "...", "language": "javascript"}'`,
    },
    {
      method: 'POST', path: '/api/analyze', titleKey: 'ep3Title', engineRaw: 'models.primary', descKey: 'ep3Desc',
      params: [
        { name: 'diff', typeStr: 'string', required: true, descKey: 'p_diff' },
        { name: 'language', typeStr: 'string', required: false, descKey: 'p_language' },
        { name: 'riskyHunks', typeStr: 'array', required: false, descKey: 'p_riskyHunks' },
        { name: 'fullPipeline', typeStr: 'boolean', required: false, descKey: 'p_fullPipeline' },
      ],
      requestSnippet: `{\n  "diff": "--- a/auth.js\\n+++ b/auth.js\\n@@ -14,2 +14,2 @@\\n- const query = 'SELECT * FROM users WHERE id = $1';\\n+ const query = 'SELECT * FROM users WHERE id = ' + req.body.id;",\n  "language": "javascript",\n  "fullPipeline": true\n}`,
      responseSnippet: `{\n  "findings": [{\n    "id": "fnd_001",\n    "severity": "critical",\n    "title": "SQL Injection via String Concatenation",\n    "cwe": "CWE-89"\n  }],\n  "report": {\n    "verdict": "block",\n    "riskScore": 90\n  }\n}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/analyze \\\n  -H "Content-Type: application/json" \\\n  -d '{"diff": "...", "language": "javascript", "fullPipeline": true}'`,
    },
    {
      method: 'POST', path: '/api/enrich', titleKey: 'ep4Title', engineRaw: 'Tavily Search API', descKey: 'ep4Desc',
      params: [
        { name: 'findings', typeStr: 'array', required: true, descKey: 'p_findings' },
        { name: 'language', typeStr: 'string', required: false, descKey: 'p_language' },
      ],
      requestSnippet: `{\n  "findings": [{\n    "id": "fnd_001",\n    "title": "SQL Injection in User Authentication",\n    "cwe": "CWE-89",\n    "severity": "critical"\n  }],\n  "language": "javascript"\n}`,
      responseSnippet: `{\n  "findings": [{\n    "id": "fnd_001",\n    "cwe": "CWE-89",\n    "references": [{\n      "title": "OWASP SQL Injection Prevention Cheat Sheet",\n      "url": "https://cheatsheetseries.owasp.org/..."\n    }]\n  }]\n}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/enrich \\\n  -H "Content-Type: application/json" \\\n  -d '{"findings": [{"id": "fnd_001", "title": "SQL Injection", "cwe": "CWE-89", "severity": "critical"}]}'`,
    },
    {
      method: 'POST', path: '/api/patch', titleKey: 'ep5Title', engineRaw: 'models.primary', descKey: 'ep5Desc',
      params: [
        { name: 'finding', typeStr: 'object', required: true, descKey: 'p_finding' },
        { name: 'originalCode', typeStr: 'string', required: true, descKey: 'p_originalCode' },
        { name: 'language', typeStr: 'string', required: false, descKey: 'p_language' },
        { name: 'feedback', typeStr: 'string', required: false, descKey: 'p_feedback' },
      ],
      requestSnippet: `{\n  "finding": { "id": "fnd_001", "title": "SQL Injection", "cwe": "CWE-89", "severity": "critical" },\n  "originalCode": "function getUser(id) {\\n  return db.query('SELECT * FROM users WHERE id=' + id);\\n}",\n  "language": "javascript"\n}`,
      responseSnippet: `{\n  "patch": {\n    "findingId": "fnd_001",\n    "unifiedDiff": "--- a/getUser.js\\n+++ b/getUser.js\\n@@ -2,2 +2,2 @@\\n-  return db.query('SELECT...' + id);\\n+  return db.query('SELECT... $1', [id]);",\n    "rationale": "Replaced string concatenation with parameterized SQL query placeholder."\n  }\n}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/patch \\\n  -H "Content-Type: application/json" \\\n  -d '{"finding": {"id": "fnd_001", "cwe": "CWE-89"}, "originalCode": "db.query(\\"SELECT \\" + id);", "language": "javascript"}'`,
    },
    {
      method: 'POST', path: '/api/verify', titleKey: 'ep6Title', engineRaw: 'models.acorn', descKey: 'ep6Desc',
      params: [
        { name: 'finding', typeStr: 'object', required: true, descKey: 'p_finding' },
        { name: 'patch', typeStr: 'object', required: true, descKey: 'p_patch' },
        { name: 'originalCode', typeStr: 'string', required: true, descKey: 'p_originalCodeFull' },
        { name: 'language', typeStr: 'string', required: false, descKey: 'p_language' },
        { name: 'iteration', typeStr: 'number', required: false, descKey: 'p_iteration' },
      ],
      requestSnippet: `{\n  "finding": { "id": "fnd_001", "cwe": "CWE-89", "severity": "critical" },\n  "patch": { "findingId": "fnd_001", "patchedCode": "db.query('SELECT * FROM users WHERE id = $1', [id]);" },\n  "originalCode": "db.query('SELECT * FROM users WHERE id=' + id);",\n  "language": "javascript",\n  "iteration": 1\n}`,
      responseSnippet: `{\n  "verification": {\n    "findingId": "fnd_001",\n    "patchApplied": true,\n    "syntaxValid": true,\n    "reanalysis": { "resolved": true, "notes": "Parameterized query successfully neutralizes SQL injection vector." },\n    "iterations": 1,\n    "status": "verified"\n  }\n}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/verify \\\n  -H "Content-Type: application/json" \\\n  -d '{"finding": {"id":"f1","cwe":"CWE-89"}, "patch": {"findingId":"f1","patchedCode":"..."}, "originalCode":"...", "language":"javascript"}'`,
    },
    {
      method: 'GET', path: '/api/github', titleKey: 'ep7Title', engineKey: 'ep7Engine', descKey: 'ep7Desc',
      params: [
        { name: 'url', typeStr: 'string', required: true, descKey: 'p_url' },
        { name: 'token', typeStr: 'string', required: false, descKey: 'p_token' },
      ],
      responseSnippet: `{\n  "success": true,\n  "data": {\n    "owner": "jammar24",\n    "repo": "Nimrod-CI",\n    "pullNumber": 1,\n    "title": "Fix SQL injection in authentication route",\n    "diff": "--- a/routes/users.js\\n+++ b/routes/users.js\\n...",\n    "files": [{ "filename": "routes/users.js", "status": "modified" }]\n  }\n}`,
      curlSnippet: `curl -s "https://nimrod-ci.vercel.app/api/github?url=https://github.com/jammar24/Nimrod-CI/pull/1" | jq .`,
    },
    {
      method: 'POST', path: '/api/github', titleKey: 'ep8Title', engineKey: 'ep8Engine', descKey: 'ep8Desc',
      params: [
        { name: 'action', typeStr: 'string', required: true, descKey: 'p_action' },
        { name: 'owner', typeStr: 'string', required: true, descKey: 'p_owner' },
        { name: 'repo', typeStr: 'string', required: true, descKey: 'p_repo' },
        { name: 'filePath', typeStr: 'string', required: true, descKey: 'p_filePath' },
        { name: 'patchedContent', typeStr: 'string', required: true, descKey: 'p_patchedContent' },
        { name: 'token', typeStr: 'string', required: true, descKey: 'p_tokenRequired' },
      ],
      requestSnippet: `{\n  "action": "create-pr",\n  "owner": "jammar24",\n  "repo": "Nimrod-CI",\n  "baseBranch": "main",\n  "newBranch": "nimrod-ci/fix-sqli",\n  "filePath": "routes/users.js",\n  "patchedContent": "const query = 'SELECT * FROM users WHERE id = $1';",\n  "prTitle": "[Nimrod-CI] Security Patch: Fix SQL injection",\n  "token": "ghp_xxxxxxxxxxxx"\n}`,
      responseSnippet: `{\n  "success": true,\n  "data": {\n    "prNumber": 42,\n    "prUrl": "https://github.com/jammar24/Nimrod-CI/pull/42",\n    "branch": "nimrod-ci/fix-sqli"\n  }\n}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/github \\\n  -H "Content-Type: application/json" \\\n  -d '{"action": "create-pr", "owner": "jammar24", "repo": "Nimrod-CI", "filePath": "auth.js", "patchedContent": "...", "token": "ghp_xxx"}'`,
    },
  ];

  const resolveEngine = (ep: EndpointSpec): string => {
    if (ep.engineKey) return t[ep.engineKey] as string;
    if (ep.engineRaw === 'models.fast') return models.fast;
    if (ep.engineRaw === 'models.primary') return models.primary;
    if (ep.engineRaw === 'models.acorn') return `Acorn/TS Compiler + ${models.fast}`;
    return ep.engineRaw ?? '';
  };

  const tabList = [
    { key: 'endpoints' as const, icon: Server, label: `${t.tabEndpoints} (${endpoints.length})` },
    { key: 'pipeline' as const, icon: Activity, label: t.tabPipeline },
    { key: 'schema' as const, icon: BookOpen, label: t.tabSchema },
    { key: 'integrations' as const, icon: Terminal, label: t.tabIntegrations },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/30 transition-colors">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Brand */}
          <Link href="/" className="flex items-center space-x-2.5 group cursor-pointer hover:opacity-90 transition-opacity shrink-0" title="Nimrod-CI Home">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center p-1 shrink-0 group-hover:scale-105 transition-transform">
              <img src="/logo-shield.png" alt="Nimrod-CI Shield" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">Nimrod-CI</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md whitespace-nowrap">
                Docs &amp; API
              </span>
            </div>
          </Link>

          {/* Desktop controls */}
          <div className="hidden sm:flex items-center space-x-2 shrink-0">
            <Link
              href="/"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 dark:bg-zinc-900/80 transition-all shadow-xs cursor-pointer"
              title={t.homeBtn}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">{t.homeBtn}</span>
            </Link>

            <button
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              type="button"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 hover:border-zinc-300 dark:hover:border-zinc-500 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 dark:bg-zinc-900/80 transition-all cursor-pointer shadow-xs"
              title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === 'en' ? 'ES' : 'EN'}</span>
            </button>

            <Link
              href="/analyze"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-all shadow-xs whitespace-nowrap flex items-center gap-1.5 shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden md:inline">{t.launchReviewer}</span>
              <span className="md:hidden">{t.review}</span>
            </Link>

            <ThemeToggle />
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              type="button"
              className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900"
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
            <ThemeToggle />
            <button
              type="button"
              aria-label="Toggle menu"
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 pb-4 pt-3 space-y-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t.homeBtn}</span>
            </Link>
            <Link
              href="/analyze"
              className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{t.launchReviewer}</span>
            </Link>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative border-b border-zinc-200 dark:border-zinc-800/60 bg-gradient-to-b from-zinc-50 dark:from-zinc-900/50 via-white dark:via-zinc-950 to-white dark:to-zinc-950 py-12 sm:py-16 lg:py-20 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs font-mono mb-4 max-w-full overflow-hidden">
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse shrink-0" />
            <span className="truncate">{t.heroTag}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4 px-2">{t.heroTitle}</h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8 px-2">{t.heroSubtitle}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            {[
              { icon: Cpu, color: 'text-emerald-500 dark:text-emerald-400', label: t.primaryReasoning, value: models.primary, valueColor: 'text-emerald-600 dark:text-emerald-300' },
              { icon: Zap, color: 'text-cyan-500 dark:text-cyan-400', label: t.fastTriage, value: models.fast, valueColor: 'text-cyan-600 dark:text-cyan-300' },
              { icon: Search, color: 'text-purple-500 dark:text-purple-400', label: t.threatIntel, value: 'Tavily Search API', valueColor: 'text-purple-600 dark:text-purple-300' },
              { icon: FileCheck, color: 'text-amber-500 dark:text-amber-400', label: t.compilerGate, value: 'Acorn / TS AST Engine', valueColor: 'text-amber-600 dark:text-amber-300' },
            ].map(({ icon: Icon, color, label, value, valueColor }) => (
              <div key={label} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 transition-colors">
                <div className={`text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span>{label}</span>
                </div>
                <div className={`text-xs font-mono font-semibold truncate ${valueColor}`} title={value}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tabs ── */}
      <div className="sticky top-16 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto py-2 sm:py-3 gap-1 sm:gap-2 text-sm font-medium scrollbar-hide">
            {tabList.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm shrink-0 ${
                  activeTab === key
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── TAB 1: REST ENDPOINTS ── */}
        {activeTab === 'endpoints' && (
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{t.restApiTitle}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t.restApiSub}</p>
            </div>
            <div className="space-y-8">
              {endpoints.map((ep, idx) => (
                <div key={idx} id={ep.path.replace('/api/', 'api-')} className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 p-6 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-800/60">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider ${ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'}`}>
                        {ep.method}
                      </span>
                      <code className="text-base sm:text-lg font-mono font-semibold text-zinc-800 dark:text-zinc-100">{ep.path}</code>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-200/60 dark:bg-zinc-800/60 px-2 py-0.5 rounded">{resolveEngine(ep)}</span>
                    </div>
                    <button onClick={() => handleCopy(ep.curlSnippet, `curl-${idx}`)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-mono text-zinc-600 dark:text-zinc-300 transition-colors self-start sm:self-auto cursor-pointer" title={t.copyCurl}>
                      {copiedId === `curl-${idx}` ? (<><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">{t.copied}</span></>) : (<><Copy className="w-3.5 h-3.5" /><span>{t.copyCurl}</span></>)}
                    </button>
                  </div>

                  <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed mb-6">{t[ep.descKey] as string}</p>

                  {ep.params && ep.params.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 font-mono">{t.paramsSchema}</h4>
                      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
                        <table className="w-full text-left text-xs min-w-[480px]">
                          <thead className="bg-zinc-100/80 dark:bg-zinc-900/80 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                              <th className="py-2.5 px-3 sm:px-4 font-mono">{t.fieldCol}</th>
                              <th className="py-2.5 px-3 sm:px-4 font-mono hidden sm:table-cell">{t.typeCol}</th>
                              <th className="py-2.5 px-3 sm:px-4 font-mono hidden sm:table-cell">{t.requiredCol}</th>
                              <th className="py-2.5 px-3 sm:px-4">{t.descCol}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-mono">
                            {ep.params.map((p, pIdx) => (
                              <tr key={pIdx} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30">
                                <td className="py-2.5 px-3 sm:px-4 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{p.name}</td>
                                <td className="py-2.5 px-3 sm:px-4 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">{p.typeStr}</td>
                                <td className="py-2.5 px-3 sm:px-4 hidden sm:table-cell">{p.required ? <span className="text-amber-600 dark:text-amber-400 font-bold">{t.requiredYes}</span> : <span className="text-zinc-400 dark:text-zinc-500">{t.requiredOptional}</span>}</td>
                                <td className="py-2.5 px-3 sm:px-4 font-sans text-zinc-600 dark:text-zinc-300">{t[p.descKey] as string}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {ep.requestSnippet && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{t.requestBody}</span>
                          <button onClick={() => handleCopy(ep.requestSnippet!, `req-${idx}`)} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-white flex items-center gap-1 cursor-pointer">
                            {copiedId === `req-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === `req-${idx}` ? t.copiedLabel : t.copyLabel}</span>
                          </button>
                        </div>
                        <pre className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto leading-relaxed max-h-64">{ep.requestSnippet}</pre>
                      </div>
                    )}
                    <div className={ep.requestSnippet ? '' : 'lg:col-span-2'}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{t.responsePayload}</span>
                        <button onClick={() => handleCopy(ep.responseSnippet, `res-${idx}`)} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-white flex items-center gap-1 cursor-pointer">
                          {copiedId === `res-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === `res-${idx}` ? t.copiedLabel : t.copyLabel}</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto leading-relaxed max-h-64">{ep.responseSnippet}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 2: PIPELINE ── */}
        {activeTab === 'pipeline' && (
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{t.pipelineTitle}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t.pipelineSub}</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {[
                { icon: Zap, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', metaColor: 'text-emerald-600 dark:text-emerald-400', badge: `Model: ${models.fast}`, title: t.stage1Title, desc: t.stage1Desc, meta: t.stage1Meta },
                { icon: Cpu, bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-600 dark:text-cyan-400', metaColor: 'text-cyan-600 dark:text-cyan-400', badge: `Model: ${models.primary}`, title: t.stage2Title, desc: t.stage2Desc, meta: t.stage2Meta },
                { icon: Search, bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-600 dark:text-purple-400', metaColor: 'text-purple-600 dark:text-purple-400', badge: 'Engine: Tavily Search API', title: t.stage3Title, desc: t.stage3Desc, meta: t.stage3Meta },
                { icon: Code2, bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', metaColor: 'text-blue-600 dark:text-blue-400', badge: `Model: ${models.primary}`, title: t.stage4Title, desc: t.stage4Desc, meta: t.stage4Meta },
                { icon: FileCheck, bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', metaColor: 'text-amber-600 dark:text-amber-400', badge: `Engine: Acorn / TS + ${models.fast}`, title: t.stage5Title, desc: t.stage5Desc, meta: t.stage5Meta },
              ].map(({ icon: Icon, bg, border, text, metaColor, badge, title, desc, meta }) => (
                <div key={title} className="p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start transition-colors">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${bg} border ${border} flex items-center justify-center ${text} shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
                      <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 self-start sm:self-auto max-w-full sm:max-w-[260px] truncate">{badge}</span>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
                    <div className={`text-xs font-mono pt-1 ${metaColor}`}>{meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: SCHEMA ── */}
        {activeTab === 'schema' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{t.schemaTitle}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t.schemaSub}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">{t.nimrodSchema}</h3>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">JSON Object</span>
                </div>
                <pre className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto leading-relaxed max-h-[500px]">
{`{
  "id": "nimrod_1713370000000_abc123",
  "timestamp": "2026-10-17T21:00:00.000Z",
  "verdict": "block", // "pass" | "review" | "block"
  "riskScore": 90,     // 0 to 100
  "summary": "1 critical vulnerability detected: SQL Injection in auth.js",
  "findings": [
    {
      "id": "fnd_001",
      "file": "routes/auth.js",
      "lineStart": 14,
      "lineEnd": 16,
      "severity": "critical",
      "title": "SQL Injection in User Authentication",
      "cwe": "CWE-89",
      "explanation": "Untrusted request body is concatenated into query.",
      "exploitScenario": "Attacker supplies ' OR '1'='1 to bypass login.",
      "references": [
        {
          "title": "OWASP SQL Injection Prevention",
          "url": "https://cheatsheetseries.owasp.org/..."
        }
      ]
    }
  ],
  "patches": [
    {
      "findingId": "fnd_001",
      "unifiedDiff": "--- a/routes/auth.js\\n+++ b/routes/auth.js\\n...",
      "patchedCode": "...",
      "rationale": "Parameterized query replaces string concatenation."
    }
  ],
  "verifications": [
    {
      "findingId": "fnd_001",
      "patchApplied": true,
      "syntaxValid": true,
      "reanalysis": { "resolved": true, "notes": "Query placeholder eliminates SQL injection." },
      "iterations": 1,
      "status": "verified"
    }
  ],
  "stats": { "totalFindings": 1, "critical": 1, "high": 0, "medium": 0, "low": 0, "verifiedPatches": 1 }
}`}
                </pre>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">{t.sarifTitle}</h3>
                  <span className="text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">GitHub Compatible</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{t.sarifSub}</p>
                <pre className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto leading-relaxed max-h-[460px]">
{`{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "Nimrod-CI",
          "version": "1.0.0",
          "informationUri": "https://github.com/jammar24/Nimrod-CI",
          "rules": [
            {
              "id": "CWE-89",
              "name": "SQLInjection",
              "shortDescription": { "text": "SQL Injection in User Authentication" },
              "defaultConfiguration": { "level": "error" }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "CWE-89",
          "message": { "text": "SQL Injection: Untrusted parameter..." },
          "level": "error",
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": { "uri": "routes/auth.js" },
                "region": { "startLine": 14, "endLine": 16 }
              }
            }
          ]
        }
      ]
    }
  ]
}`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: CI/CD & INTEGRATIONS ── */}
        {activeTab === 'integrations' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{t.integrationsTitle}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t.integrationsSub}</p>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 transition-colors">
              <div className="flex items-start sm:items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white whitespace-nowrap">{t.ghaWorkflow}</h3>
                  </div>
                  <span className="text-[10px] sm:text-xs font-mono text-zinc-400 dark:text-zinc-500 truncate">.github/workflows/nimrod-review.yml</span>
                </div>
                <button
                  onClick={() => handleCopy(`name: Nimrod-CI Security Gate\n\non:\n  pull_request:\n    branches: [main, master]\n\njobs:\n  review:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n      security-events: write\n      pull-requests: write\n\n    steps:\n      - name: Checkout Repository\n        uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: 22\n\n      - name: Run Nimrod-CI Headless Reviewer\n        env:\n          NEBIUS_API_KEY: \${{ secrets.NEBIUS_API_KEY }}\n          TAVILY_API_KEY: \${{ secrets.TAVILY_API_KEY }}\n          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}\n        run: |\n          node scripts/ci-review.mjs\n\n      - name: Upload SARIF to GitHub Security Tab\n        if: always()\n        uses: github/codeql-action/upload-sarif@v3\n        with:\n          sarif_file: sentinel-report.sarif`, 'gha')}
                  className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2.5 py-1 rounded transition-colors"
                >
                  {copiedId === 'gha' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === 'gha' ? t.copiedWorkflow : t.copyWorkflow}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto leading-relaxed max-h-[420px]">
{`name: Nimrod-CI Security Gate

on:
  pull_request:
    branches: [main, master]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      pull-requests: write

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Run Nimrod-CI Headless Reviewer
        env:
          NEBIUS_API_KEY: \${{ secrets.NEBIUS_API_KEY }}
          TAVILY_API_KEY: \${{ secrets.TAVILY_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          node scripts/ci-review.mjs

      - name: Upload SARIF to GitHub Security Tab
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: sentinel-report.sarif`}
              </pre>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 transition-colors">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                  <span>{t.nodeExample}</span>
                </h4>
                <pre className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto leading-relaxed">
{`const res = await fetch('https://nimrod-ci.vercel.app/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    diff: gitDiffString,
    language: 'javascript',
    fullPipeline: true
  })
});

const { findings, report } = await res.json();
if (report.verdict === 'block') {
  console.error('Merge Blocked: High severity vulnerability');
  process.exit(1);
}`}
                </pre>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 transition-colors">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  <span>{t.pythonExample}</span>
                </h4>
                <pre className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto leading-relaxed">
{`import requests

payload = {
    "diff": git_diff_content,
    "language": "python",
    "fullPipeline": True
}

resp = requests.post("https://nimrod-ci.vercel.app/api/analyze", json=payload)
data = resp.json()

if data.get("report", {}).get("verdict") == "block":
    print(f"Risk Score: {data['report']['riskScore']}/100")
    raise SystemExit("Security gate check failed!")`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 py-10 mt-16 sm:mt-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center p-0.5 shrink-0">
              <img src="/logo-shield.png" alt="Nimrod-CI Shield" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">Nimrod-CI</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">v1.0.0</span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium text-center px-4">{t.footerPowered}</div>
          <div className="flex items-center space-x-4 sm:space-x-6 text-sm text-zinc-500 dark:text-zinc-400">
            <a href="https://github.com/jammar24/Nimrod-CI" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1">
              <span>{t.footerGithub}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span>{t.footerMit}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
