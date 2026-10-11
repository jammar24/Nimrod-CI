'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';
import { Footer } from '../components/Footer';
import { ShieldCheck, GitPullRequest, Menu, X, CheckCircle, Code2, Cpu, Globe } from 'lucide-react';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const isEs = lang === 'es';

  const t = {
    howItWorks: isEs ? 'Cómo funciona' : 'How it works',
    docs: isEs ? 'Documentación' : 'Docs',
    api: 'API',
    team: isEs ? 'Equipo' : 'Team',
    tryNow: isEs ? 'Probar ahora' : 'Try it now',
    heroBadge: isEs ? 'Revisor de Seguridad Agéntico' : 'Agentic Security Reviewer',
    heroTitle1: isEs ? 'Un revisor de seguridad agéntico que ' : 'An agentic security reviewer that ',
    heroTitleGradient: isEs ? 'encuentra la vulnerabilidad' : 'finds the vulnerability',
    heroTitle2: isEs ? ', escribe el parche y prueba que funciona.' : ', writes the patch and proves it works.',
    heroSubtitle: isEs
      ? 'Automatiza tu flujo de seguridad con IA. Sentinel-CI analiza tus Pull Requests, detecta fallas críticas, las verifica en sandbox y genera soluciones garantizadas.'
      : 'Automate your security workflow with AI. Sentinel-CI analyzes your pull requests, identifies critical flaws, verifies them in a sandbox, and proposes guaranteed fixes.',
    readDocs: isEs ? 'Leer documentación' : 'Read Documentation',
    howItWorksTitle: isEs ? 'Cómo funciona' : 'How It Works',
    howItWorksSubtitle: isEs
      ? 'Un pipeline completamente autónomo que transforma cómo auditas el código seguro.'
      : 'A fully autonomous pipeline that transforms how you handle code security.',
    step1Title: isEs ? 'Pega un Diff' : 'Paste a Diff',
    step1Desc: isEs
      ? 'Proporciona un diff de código o conecta tu repositorio. Extraemos los cambios y los preparamos para un análisis profundo.'
      : 'Provide a code diff or connect your repository. We extract the changes and prepare them for deep analysis.',
    step2Title: isEs ? 'Pipeline Agéntico' : 'Agent Pipeline',
    step2Desc: isEs
      ? 'Nuestro pipeline de 5 fases impulsado por Nemotron ejecuta: Triaje, Análisis Profundo, Enriquecimiento Web, Parcheo y Verificación en Sandbox.'
      : 'Our 5-step Nemotron-powered pipeline runs: Triage, Deep Analysis, Web Enrichment, Patching, and Sandbox Verification.',
    step3Title: isEs ? 'Parche Verificado' : 'Verified Patch',
    step3Desc: isEs
      ? 'Recibe un parche seguro garantizado y verificado mediante análisis AST sintáctico y ejecución aislada — listo para mergear.'
      : 'Receive a guaranteed secure patch verified through AST parsing and sandboxed execution — ready to merge.',
    patchVerified: isEs ? 'Parche Verificado' : 'Patch Verified',
    readyToMerge: isEs ? 'Listo para producción' : 'Ready to merge',
    builtByTitle: isEs ? 'Equipo y Creador' : 'Built by',
    teamRole: isEs ? 'Ingeniero de Seguridad & Desarrollador Full-Stack' : 'Security Engineer & Full-Stack Developer',
    teamBio: isEs
      ? 'Creador de Sentinel-CI para el Hackathon Nebius x NVIDIA. Especialista en ingeniería de agentes autónomos, validación AST y hardening de aplicaciones críticas.'
      : 'Creator of Sentinel-CI for the Nebius x NVIDIA Hackathon. Focused on autonomous agentic workflows, AST safety validation, and critical application hardening.'
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/30">

      {/* ── Sticky Navbar ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <Link href="/" className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">Sentinel-CI</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-white transition-colors">{t.howItWorks}</a>
            <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-white transition-colors">{t.docs}</Link>
            <Link href="/docs#api" className="hover:text-zinc-900 dark:hover:text-white transition-colors">{t.api}</Link>
            <a href="#team" className="hover:text-zinc-900 dark:hover:text-white transition-colors">{t.team}</a>
            <a
              href="https://github.com/jammar24/-sentinel-ci"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <GitPullRequest className="w-4 h-4" />
              <span>GitHub</span>
            </a>

            {/* Language switcher button */}
            <button
              onClick={() => setLang(isEs ? 'en' : 'es')}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
              title={isEs ? 'Switch to English' : 'Cambiar a Español'}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>{isEs ? 'EN' : 'ES'}</span>
            </button>

            <ThemeToggle />
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              href="/analyze"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all"
            >
              {t.tryNow}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setLang(isEs ? 'en' : 'es')}
              type="button"
              className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              {isEs ? 'EN' : 'ES'}
            </button>
            <button
              type="button"
              aria-label="Toggle menu"
              className="p-2 text-zinc-600 dark:text-zinc-400"
              onClick={toggleMenu}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 pb-4 pt-3 space-y-4">
            <a href="#how-it-works" className="block text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white" onClick={toggleMenu}>{t.howItWorks}</a>
            <Link href="/docs" className="block text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white" onClick={toggleMenu}>{t.docs}</Link>
            <Link href="/docs#api" className="block text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white" onClick={toggleMenu}>{t.api}</Link>
            <a href="#team" className="block text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white" onClick={toggleMenu}>{t.team}</a>
            <div className="flex items-center gap-4 pt-1">
              <Link
                href="/analyze"
                className="flex-1 text-center px-4 py-2 rounded-lg bg-emerald-500 text-zinc-950 font-semibold"
                onClick={toggleMenu}
              >
                {t.tryNow}
              </Link>
              <ThemeToggle />
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          {/* background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent -z-10" />

          {/* Pure-CSS fade-up — no SSR mismatch */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center sentinel-hero-container">
            <h1 className="sentinel-fade-up text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6" style={{ animationDelay: '0ms' }}>
              {t.heroTitle1}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400">
                {t.heroTitleGradient}
              </span>
              {t.heroTitle2}
            </h1>
            <p className="sentinel-fade-up text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto" style={{ animationDelay: '150ms' }}>
              {t.heroSubtitle}
            </p>
            <div className="sentinel-fade-up flex flex-col sm:flex-row justify-center items-center gap-4" style={{ animationDelay: '300ms' }}>
              <Link
                href="/analyze"
                className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-base transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
              >
                {t.tryNow}
              </Link>
              <Link
                href="/docs"
                className="px-8 py-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-base transition-all"
              >
                {t.readDocs}
              </Link>
            </div>
          </div>
        </section>

        {/* ── 3-Step Walkthrough ──────────────────────────────────────── */}
        <section id="how-it-works" className="py-24 bg-zinc-50 dark:bg-zinc-900/30 border-y border-zinc-200 dark:border-zinc-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">{t.howItWorksTitle}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                {t.howItWorksSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 — Paste a Diff */}
              <motion.div
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden group"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Code2 className="w-24 h-24 text-zinc-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold mb-6">1</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">{t.step1Title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                  {t.step1Desc}
                </p>
                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800/50 font-mono text-xs">
                  <span className="text-rose-500 dark:text-rose-400">- eval(userInput);</span><br />
                  <span className="text-emerald-600 dark:text-emerald-400">+ JSON.parse(userInput);</span>
                </div>
              </motion.div>

              {/* Step 2 — Agent Pipeline */}
              <motion.div
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden group"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Cpu className="w-24 h-24 text-zinc-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold mb-6">2</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">{t.step2Title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                  {t.step2Desc}
                </p>
                <div className="space-y-2">
                  {[
                    isEs ? 'Triaje' : 'Triage',
                    isEs ? 'Análisis Profundo' : 'Deep Analysis',
                    isEs ? 'Enriquecimiento' : 'Enrichment',
                    isEs ? 'Generación de Parche' : 'Patching',
                    isEs ? 'Verificación AST + PoC' : 'Verification'
                  ].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-1.5 rounded-lg">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i < 2 ? 'bg-emerald-500' : 'border-2 border-zinc-300 dark:border-zinc-600'}`} />
                      {step}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Step 3 — Verified Patch */}
              <motion.div
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden group"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShieldCheck className="w-24 h-24 text-emerald-500" />
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold mb-6">3</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">{t.step3Title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                  {t.step3Desc}
                </p>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {t.patchVerified}<br />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400/70 font-normal">{t.readyToMerge}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Team ────────────────────────────────────────────────────── */}
        <section id="team" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">{t.builtByTitle}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto mb-12">
              {isEs
                ? 'Conoce a la mente detrás del desarrollo y la arquitectura de Sentinel-CI'
                : 'Meet the team behind the development and architecture of Sentinel-CI'}
            </p>

            <div className="inline-block max-w-md w-full p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur-md shadow-xl transition-all hover:border-emerald-500/40">
              <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden mb-5 ring-4 ring-emerald-500/20 border-2 border-emerald-500/40 shadow-inner">
                <Image
                  src="/team-jamar.jpg"
                  alt="Jamar Masias"
                  fill
                  sizes="112px"
                  className="object-cover object-center"
                  priority
                />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Jamar Masias</h3>
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold my-2">
                @3m3r4l
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                {t.teamRole}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                {t.teamBio}
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href="https://github.com/jammar24"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors shadow-sm"
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  GitHub Profile
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Unified Footer ──────────────────────────────────────────── */}
      <Footer lang={lang} />
    </div>
  );
}

