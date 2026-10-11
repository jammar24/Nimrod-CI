# Sentinel-CI — Spec v2 (Next.js, solo TypeScript) para Antigravity

> Hackathon: Nebius x NVIDIA Global AI Hackathon (Devpost)
> Cierre: **viernes 30 oct 2026, 10:00 am PDT** (12:00 pm hora de Ecuador). Meta interna: enviar el **28 oct**.
> Track: **Coding and Agentic Engineering**. Participante individual.
> Esta versión reemplaza a la v1: todo en un solo proyecto Next.js + TypeScript (sin Python).

---

## 0. Cómo usar este documento

1. Crea la carpeta `sentinel-ci/`, ábrela en Antigravity y copia este archivo como `SPEC.md`.
2. Pega el **Prompt Maestro** (sección 15). Trabaja **por fases**, probando cada una antes de seguir.
3. Claves SOLO en `.env.local` (nunca en el repo ni en el navegador).
4. Desde el día 1 lleva el archivo `FEEDBACK.md` (sección 12): es tu material para el premio de feedback.

---

## 1. Estrategia de premios (qué buscamos ganar)

Eres de Santa Elena (Ecuador), así que **City Winner no aplica** (exige asistir a un evento presencial en una ciudad listada). Los objetivos reales:

| Prioridad | Premio | Qué exige | Cómo lo atacamos |
|---|---|---|---|
| 1 | **Track: Coding and Agentic Engineering** (NVIDIA Jetson Orin Nano) | Mejor proyecto del track | Agente que **escribe parches y los verifica** (paso agentic) |
| 2 | **Best Use of Tavily ($3,000)** | Llamada **funcional en runtime** a la API de Tavily | Tavily enriquece cada hallazgo con referencias (CWE/OWASP) en producción |
| 3 | **Most Valuable Feedback ($100 + swag, 10 ganadores)** | Completar bien la sección de feedback | `FEEDBACK.md` con hallazgos reales y concretos |
| Techo | **Overall (1º $20k / 2º $10k / 3º $6k)** | Puntaje alto en los 4 criterios | UI muy pulida + idea sólida + buen uso de Nemotron |

Reglas de combinación: un proyecto opta a **un** premio Overall **o** de Track, más un Bonus. Las reglas no aclaran si se pueden ganar Tavily y Feedback a la vez; igual conviene postular a ambos (cuestan poco).

**Criterios de jueces (4, igual peso):** Technological Implementation · Design · Potential Impact · Quality of the Idea. Etapa 1 es pass/fail: debe ser un intento genuino del track y usar de verdad Nebius + un modelo NVIDIA.

---

## 2. Reglas oficiales que el proyecto DEBE cumplir (checklist de descalificación)

- [ ] Software funcional que hace **llamadas runtime a Nebius Token Factory** (o corre en Nebius AI Cloud).
- [ ] Usa **al menos un modelo open source de NVIDIA (Nemotron)**. Llama/GPT-OSS/Qwen NO cuentan.
- [ ] **URL de demo funcionando**, gratis y sin restricciones para jueces hasta el fin del judging (15 dic 2026). Si hay login, poner credenciales en las instrucciones (nosotras: sin login).
- [ ] **Repo público** (GitHub/GitLab/Bitbucket) con **licencia open source visible** (MIT) en *About*.
- [ ] **README** con setup y ejecución, destacando cómo se usó Nemotron, dónde Token Factory aceleró el flujo y otros servicios Nebius.
- [ ] **Video < 3 min**, público en **YouTube**, mostrando el proyecto funcionando, sin música/marcas con copyright.
- [ ] **Texto descriptivo**, **track seleccionado**, **feedback** sobre Nebius/NVIDIA.
- [ ] **Todo en inglés** (README, descripción, video, instrucciones).
- [ ] Trabajo original; respetar licencias de librerías de terceros.
- [ ] Verificar tu elegibilidad en la sección 3 de las reglas antes de registrarte.

---

## 3. Producto

**Sentinel-CI** — *An agentic security reviewer that finds vulnerabilities in your diff, writes the patch, and proves the patch works.*

**Problema:** los PRs se revisan rápido y las vulnerabilidades se cuelan; los SAST clásicos dan falsos positivos y no arreglan nada.

**Pipeline del agente (5 pasos):**
1. **Triage** — detecta qué hunks del diff son riesgosos (modelo rápido).
2. **Analyze** — hallazgos estructurados: CWE, severidad, línea, explicación, escenario de explotación (modelo principal).
3. **Enrich** — Tavily busca referencias actuales por hallazgo.
4. **Patch** — parche mínimo en diff unificado (modelo principal).
5. **Verify** — aplica el parche, valida sintaxis, **re-analiza** el código parcheado; si falla, reintenta (máx. 2). Es el paso que lo hace "agentic".
6. **Report** — veredicto (block/review/pass), score de riesgo, export.

---

## 4. Stack (decidido, no reabrir)

| Capa | Elección |
|---|---|
| Framework | **Next.js (App Router) + TypeScript** |
| Estilos | **Tailwind CSS** (+ componentes propios o shadcn/ui) |
| API/servidor | **Route Handlers** de Next.js (`app/api/*/route.ts`) |
| LLM | SDK **`openai`** (npm) apuntando a Nebius Token Factory |
| Validación | **Zod** (esquemas + validación de salida del modelo) |
| Diff | **`diff`** (jsdiff) para generar y aplicar parches; `react-diff-viewer-continued` para mostrarlos |
| Sintaxis JS/TS | **`acorn`** (JS) y API de **`typescript`** (`transpileModule` con diagnósticos) |
| Búsqueda | **`@tavily/core`** |
| Tests | **Vitest** |
| Despliegue | **Vercel** (o Nebius Serverless Endpoint con Docker como alternativa) |
| Licencia | **MIT** |
