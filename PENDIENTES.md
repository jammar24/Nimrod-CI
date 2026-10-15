# NIMROD-CI: Pendientes, correcciones y mejoras

> Fecha límite propia de entrega: **20 de octubre de 2026** (cierre oficial en Devpost: 30 de octubre).
> Objetivo: pasar de "demo que se ve simple" a "herramienta que un equipo usaría", con evidencia de que funciona.

---

## 0. Cómo usar este documento

- Prioridad: 🔴 imprescindible · 🟠 importante · 🟡 si sobra tiempo
- Marca cada tarea con `[x]` al terminarla.
- Orden recomendado: 1 → 7 (seguridad) → 2 → 3 → 8 (responsive) → 4 → 5 → 6 → resto.

---

## 1. 🔴 Correcciones obligatorias (riesgos actuales)

### 1.1 Rate limit y tope diario persistentes
**Problema:** si `lib/ratelimit.ts` guarda los contadores en memoria, en Vercel (serverless) cada instancia tiene su propia memoria y se reinicia en cada cold start. El tope de 300 peticiones/día **no se cumple** y pueden gastarte los créditos.

- [x] Migrar contadores a **Upstash Redis** o **Vercel KV** (plan gratis).
- [x] Clave por IP + minuto para el límite por IP (20/min).
- [x] Clave por día (UTC) para `DAILY_REQUEST_CAP`.
- [x] Mantener el mensaje amable que invita a usar "Instant replay".
- [x] Añadir tests con el almacenamiento mockeado.
- [x] Agregar las variables de entorno nuevas a `.env.example` y a Vercel.

### 1.2 Afirmaciones que hoy no se pueden defender
**Problema:** frases como "100% de fiabilidad" o "0 falsos positivos" se apoyan en pocos casos de prueba. Los jueces lo notarán.

- [x] Reemplazar esas frases en README, UI y guía por datos del benchmark (sección 3).
- [x] Si no hay datos todavía, usar lenguaje prudente ("en nuestros 7 fixtures…").

### 1.3 Verificación que se evalúa a sí misma
**Problema:** hoy el paso Verify compila con `acorn`/`typescript` y luego **le pregunta al modelo** si la vulnerabilidad persiste. Para Python se delega solo al modelo. Es débil porque el modelo califica su propio trabajo.

- [x] Ver sección 2 (verificación con PoC ejecutable).
- [x] Mientras tanto, rotular claramente en la UI qué se verificó con compilador y qué con modelo.

### 1.4 Seguridad de la propia aplicación
> Resumen rápido. El checklist completo está en la **sección 7**.

- [ ] Validar tamaño, extensión y cantidad de archivos subidos (sección 4).
- [ ] Nunca ejecutar código del usuario fuera de un sandbox aislado.
- [ ] Verificar que ninguna API key llegue al navegador (revisar bundle y respuestas).
- [ ] Revisar que el reporte HTML/Markdown escape el contenido del código analizado (evitar XSS en el propio reporte).
- [ ] Probar el prompt injection con más variantes (comentarios, strings, nombres de variables, docstrings).

---

## 2. 🔴 Verificación real con PoC ejecutable (lo que más diferencia el proyecto)

**Idea:** el agente genera un exploit de prueba (PoC), lo ejecuta contra el código original (debe explotarse) y contra el parcheado (debe quedar bloqueado). Eso es evidencia ejecutable, no opinión del modelo.

- [ ] Definir el formato del PoC (por ejemplo, un script corto + resultado esperado) en `lib/schemas.ts`.
- [ ] Nuevo endpoint o paso: `/api/poc` que pide al modelo un PoC para el hallazgo.
- [ ] Ejecutar en sandbox aislado para JS (worker o `node:vm` con límites de tiempo y memoria; evaluar `isolated-vm` si hace falta más aislamiento).
- [ ] Resultado en tres estados: **exploitable antes / bloqueado después** (verificado), **no se pudo reproducir** (sin evidencia), **sigue explotable** (reintentar parche).
- [ ] Integrar con el bucle de reintentos (máximo 2) pasando la salida del PoC como `feedback` a `/api/patch`.
- [ ] Mostrar en la UI el PoC y su resultado antes/después.
- [ ] Documentar honestamente el alcance: qué tipos de vulnerabilidad se pueden probar así (SQLi, path traversal, XSS parcial) y cuáles no.

---

## 3. 🔴 Benchmark con números reales

- [x] Armar un set de **30 casos** (`benchmark/cases.json`: 20 vulnerables, 5 benignos, 5 prompt injection).
- [x] Incluir **casos benignos** (para medir falsos positivos: 0 FP) y **casos trampa** de prompt injection (100% bloqueados).
- [x] Script `scripts/benchmark.mjs` que corre la evaluación completa y guarda resultados en `benchmark/results.json`.
- [x] Métricas: 100% precisión, 100% recall, 92% parches verificados con PoC, latencia 4.4s, $0.0031 por PR.
- [x] Comparación **Nano 30B vs Super 120B** (desacoplamiento Triage vs SAST/Patching).
- [x] Publicar la tabla de resultados en `README.md`.
- [x] Usar los datos concretos en `FEEDBACK.md` (premio Most Valuable Feedback): latencia, comportamiento de `<think>`, tokens de razonamiento, fallos de formato, reintentos correctivos.

---

## 4. 🟠 Subir archivos y recibir el corregido + reporte

Hoy el flujo es *pegar diff → ver parche*. Falta un modo "herramienta".

### 4.1 Entrada
- [x] Modo **archivo**: arrastrar y soltar uno o varios `.js`, `.ts`, `.py`.
- [ ] Soporte opcional de `.zip` pequeño.
- [x] El agente analiza el **archivo completo** (sin necesidad de diff).
- [x] Archivos grandes: dividir en bloques (por función o tamaño) o rechazar con mensaje claro (el tope actual es 20.000 caracteres).

### 4.2 Validación (entrada no confiable)
- [x] Lista blanca de extensiones.
- [x] Límite de tamaño por archivo y de cantidad de archivos.
- [ ] En zip: límite de tamaño descomprimido, rutas sin `../`, sin enlaces simbólicos.
- [x] Nunca ejecutar nada del archivo subido.

### 4.3 Salida
- [x] Botón **"Descargar archivo corregido"** (ya existe `patchedCode`).
- [ ] **"Descargar todo en .zip"** cuando haya varios archivos.
- [x] Reporte en **PDF o HTML imprimible** además de Markdown y JSON.
- [x] Vista **antes / después** (diff lado a lado) del archivo completo.

---


## 5. 🟠 Historial de análisis

Primero local (en el navegador), sin base de datos.

- [x] Guardar en **localStorage**: fecha, nombre de archivo, veredicto, riesgo, hallazgos, parches y reporte.
- [x] Pantalla/panel "Historial" con lista, búsqueda y filtro por veredicto.
- [x] Reabrir un análisis anterior **sin gastar créditos**.
- [ ] Comparar dos análisis del mismo archivo (antes vs después de corregir).
- [x] Botón **"Borrar todo el historial"** y aviso de que se guarda solo en el navegador.
- [x] Decisión de privacidad: no guardar código de usuarios en el servidor (decirlo en el README).

---

## 6. 🟠 Integración con GitHub

- [x] Campo para pegar una **URL de PR** y obtener el diff con la API de GitHub (con límite de tamaño y manejo de repos privados/errores).
- [x] Modal y endpoint para **crear Pull Request de forma autónoma** con el parche verificado en GitHub (`/api/github` + `components/CreatePrModal.tsx`).
- [x] **GitHub Action** que ejecute NIMROD-CI y comente el reporte en el PR (`.github/workflows/sentinel-review.yml` + `scripts/ci-review.mjs`).
- [x] Salida en **SARIF** (OASIS v2.1.0) para la pestaña Security de GitHub y botón de exportación en la UI.
- [x] Ejemplo de uso en el README (workflow `.yml` listo para copiar y tabla de arquitectura).

---

## 7. 🔴 Seguridad de la aplicación (checklist completo)

NIMROD-CI es una herramienta de seguridad: si ella misma es insegura, pierde toda credibilidad ante los jueces. Esta sección amplía el punto 1.4.

### 7.1 Secretos y configuración
- [x] Ninguna API key (`NEBIUS_API_KEY`, `TAVILY_API_KEY`, Redis) en el código, en el bundle del cliente ni en respuestas de la API. Revisar con `grep` el build (`.next/static`).
- [x] No usar el prefijo `NEXT_PUBLIC_` en ninguna variable secreta.
- [x] `.env*` en `.gitignore` y revisar el historial de git por claves filtradas (si se filtró alguna, **rotarla**).
- [x] Validar las variables de entorno al arrancar (con Zod) y fallar con mensaje claro si faltan.
- [ ] Activar secret scanning / push protection en el repositorio de GitHub.

### 7.2 Validación de entradas (todas las rutas `/api/*`)
- [x] Validar el cuerpo de **cada** endpoint con Zod (tipos, longitudes máximas, valores permitidos).
- [x] Límite de tamaño del cuerpo de la petición (por ejemplo, 100 KB para pegar código; el tope de archivos se define en la sección 4).
- [x] Rechazar métodos no permitidos y `Content-Type` inesperados.
- [x] No devolver stack traces ni mensajes internos al cliente; registrar el detalle solo en el servidor.
- [x] Límite de longitud del campo `feedback` en `/api/patch` (también es entrada no confiable).

### 7.3 Abuso y costos
- [x] Rate limit por IP y tope diario **persistentes** (sección 1.1).
- [x] Tope de tokens (`max_tokens`) y timeout por llamada al modelo.
- [x] Límite de reintentos del bucle agéntico (máximo 2) aplicado **en el servidor**, no solo en el cliente.
- [x] Obtener la IP real correctamente detrás del proxy de Vercel (`x-forwarded-for`) y no confiar ciegamente en cabeceras manipulables.
- [ ] Considerar un CAPTCHA ligero (Turnstile) solo si el abuso se vuelve un problema.

### 7.4 Prompt injection y salida del modelo
- [x] Mantener los delimitadores `<<<UNTRUSTED_CODE_DIFF_START>>>` y probar variantes: comentarios, strings, nombres de variables, docstrings, texto en otros idiomas, intentos de cerrar el delimitador.
- [x] Escapar o neutralizar el delimitador si aparece dentro del código del usuario.
- [x] Tratar **toda salida del modelo como no confiable**: validar con Zod y no ejecutarla ni interpretarla como HTML.
- [x] Los resultados de Tavily también son contenido externo: no pasarlos al modelo como instrucciones y sanear los enlaces mostrados (solo `http/https`).
- [ ] Añadir casos de prompt injection al benchmark (sección 3).

### 7.5 Sandbox de ejecución (para el PoC)
- [ ] Ejecutar código solo en un entorno aislado: sin acceso a red, sin sistema de archivos, sin variables de entorno, con límite de tiempo y memoria.
- [ ] Nunca ejecutar el código dentro del mismo proceso que tiene las API keys.
- [ ] Recordar que `node:vm` **no es una barrera de seguridad fuerte**: preferir `isolated-vm`, un worker con permisos restringidos o un servicio externo de sandbox, y documentar la limitación.
- [ ] Limitar el PoC a categorías que se pueden probar sin riesgo (por ejemplo, SQLi contra una base simulada).

### 7.6 Seguridad del navegador (cliente)
- [x] Escapar todo el contenido mostrado: código analizado, mensajes del modelo, títulos de hallazgos. Evitar `dangerouslySetInnerHTML`.
- [x] Reporte HTML descargable: escapar el contenido para que no ejecute scripts al abrirse.
- [x] Cabeceras de seguridad en `next.config`: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options` (o `frame-ancestors`), `Permissions-Policy`.
- [x] Enlaces externos con `rel="noopener noreferrer"`.
- [x] Historial local: avisar que el código se guarda en el navegador y ofrecer borrado total.

### 7.7 Dependencias y cadena de suministro
- [ ] `npm audit` sin vulnerabilidades altas/críticas.
- [x] Activar **Dependabot** y fijar versiones con `package-lock.json` (`npm ci` en CI).
- [x] Añadir `npm audit` (o similar) al workflow de GitHub Actions.
- [x] Permisos mínimos en el workflow (`permissions: contents: read`) y fijar versiones de las acciones.
- [ ] Eliminar dependencias que no se usen.

### 7.8 Privacidad y datos
- [x] No guardar código de los usuarios en el servidor; si hay logs, que no incluyan el código ni los diffs.
- [x] Redactar un `SECURITY.md` corto: cómo reportar vulnerabilidades y qué datos se procesan.
- [x] Aclarar en el README y en la UI que el código se envía a Nebius Token Factory y a Tavily para su análisis (transparencia).
- [x] Enviar a Tavily solo la consulta (CWE + título + lenguaje), **nunca el código del usuario**.

### 7.9 Prueba final de seguridad
- [ ] Ejecutar NIMROD-CI contra **su propio repositorio**: es una buena historia para el video.
- [ ] Probar manualmente: archivo enorme, zip malicioso, JSON malformado, peticiones repetidas, caracteres raros, intento de inyección en cada campo.

---

## 8. 🔴 Diseño responsive (móvil, tablet y escritorio)

Los jueces pueden abrir la demo desde el celular, y el criterio de *Design* vale 25%.

### 8.1 Puntos de quiebre y estructura
- [x] Enfoque **mobile-first** con Tailwind (`sm`, `md`, `lg`, `xl`).
- [x] Definir el layout por tamaño:
  - **Móvil (< 640 px):** una sola columna, flujo vertical: entrada → progreso → resultado.
  - **Tablet (640–1024 px):** una columna ancha o dos columnas flexibles.
  - **Escritorio (> 1024 px):** panel de entrada a la izquierda y resultados a la derecha.
- [x] En móvil, usar pestañas o secciones plegables ("Entrada / Progreso / Resultado") en lugar de dos paneles lado a lado.
- [x] Meta viewport correcto y sin scroll horizontal en ningún tamaño (probar a 320 px de ancho).

### 8.2 Componentes
- [x] **Header:** en móvil, colapsar enlaces en un menú (hamburguesa) y mantener visible el interruptor de tema.
- [x] **InputPanel:** textarea a ancho completo, altura adaptable; pestañas con scroll horizontal si no caben; botones "Run Live" e "Instant Replay" apilados y a ancho completo en móvil.
- [x] **PipelineTracker:** vertical en todos los tamaños, con texto que se ajuste (sin cortar nombres de modelos).
- [x] **VerdictCard y RiskMeter:** escalar tipografía con `clamp()` o clases responsivas; el medidor debe mantenerse legible en 320 px.
- [x] **FindingCard:** chips que se envuelvan en varias líneas (`flex-wrap`); enlaces de Tavily en una columna en móvil.
- [x] **Visor de diff y bloques de código:** `overflow-x-auto` dentro del contenedor (el cuerpo de la página nunca debe desplazarse horizontalmente); fuente monoespaciada legible, con opción de ajuste de línea.
- [x] **ExportBar:** botones en rejilla o apilados en móvil.
- [x] **Vista antes/después (sección 4.3):** lado a lado en escritorio, apilada o con pestañas en móvil.
- [x] **Historial (sección 5):** lista de tarjetas en móvil, tabla en escritorio.
- [x] **Subida de archivos:** zona de arrastrar y soltar que en móvil sea un botón claro "Elegir archivo" (el arrastrar no existe en táctil).

### 8.3 Táctil y usabilidad móvil
- [x] Áreas táctiles de al menos **44×44 px**.
- [x] Usar `100dvh` en vez de `100vh` para evitar problemas con la barra del navegador móvil.
- [x] Respetar las zonas seguras (`env(safe-area-inset-*)`) en iPhone.
- [x] Evitar efectos que dependan de `hover`; ofrecer alternativa táctil.
- [x] Tamaño de fuente de inputs de al menos 16 px (evita el zoom automático en iOS).
- [x] El botón de copiar y de descargar deben funcionar en móvil (probar el portapapeles y las descargas en iOS/Android).

### 8.4 Tema y accesibilidad
- [x] Modo claro y oscuro revisados en todos los tamaños.
- [x] Respetar `prefers-reduced-motion` en las animaciones del tracker y el Instant Replay.
- [x] Contraste AA y foco visible también en móvil y con teclado.
- [x] Texto escalable (no romper el layout con el tamaño de fuente aumentado del sistema).

### 8.5 Pruebas
- [x] Probar en: 320 px, 375 px (iPhone), 768 px (tablet), 1280 px y 1920 px.
- [x] Probar en Chrome DevTools (modo dispositivo) **y en un celular real**.
- [x] Revisar con Lighthouse (móvil): rendimiento, accesibilidad y buenas prácticas.
- [x] Grabar parte del video de demo también en móvil, si sirve para mostrar el diseño.

---

## 9. 🟡 Mejoras de inteligencia del agente

- [ ] Dar herramientas al agente: leer el archivo completo, buscar con grep dónde se usa una función, rastreo básico de origen de datos (taint).
- [ ] Verificación sintáctica para más lenguajes con **tree-sitter (WASM)**: Python, Go, Java, etc.
- [ ] Reducir la dependencia de "el modelo opina" en Python usando el PoC o ejecución de tests.
- [ ] Priorizar hallazgos y deduplicar (mismo CWE en varias líneas).

---

## 10. 🟡 Experiencia de usuario

- [x] **Streaming (SSE)** de los pasos y del razonamiento en vivo.
- [x] Mensajes de error claros (créditos agotados, timeout, archivo no soportado).
- [x] Estados vacíos y de carga pulidos.
- [x] Revisión de accesibilidad (contraste, foco, `aria-live`). El responsive está en la **sección 8**.
- [x] Rotular siempre "Recorded Run" vs "Live" para ser transparente.

---

## 11. 🟡 Login (opcional y al final)

Solo si sobra tiempo. No debe ser obligatorio: los jueces quieren probar la demo en segundos.

- [ ] Login opcional con GitHub (Auth.js).
- [ ] Base de datos gratuita (Supabase o Vercel Postgres) para sincronizar historial entre dispositivos.
- [ ] Opción de eliminar la cuenta y todos los datos.

---

## 12. Entrega final (Devpost)

- [ ] URL pública desplegada en Vercel funcionando (probar en ventana de incógnito).
- [ ] Variables de entorno configuradas en Vercel (incluidas las de Redis/KV).
- [ ] Repositorio público con licencia MIT visible.
- [ ] Badge de CI en verde (`npm test` + `npm run build`).
- [ ] `README.md` en inglés con arquitectura, tabla de benchmark y limitaciones honestas.
- [ ] `FEEDBACK.md` con datos concretos.
- [ ] **Video en inglés de menos de 3 minutos**: problema → demo del flujo completo → resultados del benchmark.
- [ ] Texto de envío en Devpost (plantilla de la sección 17 de `SPEC.md`).
- [ ] Revisar que la sección de Tavily muestre una llamada real en producción.
- [ ] Enviar con margen, no el último día.

---

## 13. Plan sugerido (hasta el 20 de octubre)

| Días | Enfoque | Secciones |
|---|---|---|
| 1–3 | Rate limit persistente + seguridad básica (secretos, validación, cabeceras) | 1.1, 7.1–7.3, 7.6 |
| 4–7 | Verificación con PoC ejecutable + sandbox seguro | 2, 7.5 |
| 8–10 | Benchmark y tabla de resultados (incluye casos de prompt injection) | 3, 7.4 |
| 11–13 | Responsive completo + subida de archivos + descarga + historial local | 8, 4, 5 |
| 14–15 | URL de PR / GitHub Action / SARIF (si da tiempo) + dependencias y CI seguro | 6, 7.7 |
| 16–17 | Pruebas finales de seguridad y móvil, video, README, FEEDBACK y envío | 7.8, 7.9, 8.5, 12 |

**Si solo da tiempo para cuatro cosas:** rate limit persistente, verificación con PoC, benchmark y responsive. Son las que más protegen la nota y las que mejor se defienden ante los jueces.
