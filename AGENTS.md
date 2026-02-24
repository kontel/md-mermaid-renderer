# AGENTS.md

This file provides guidance for AI agents working on this codebase.

## Core Engineering Principles

1. **Clarity over cleverness** — Write code that's maintainable, not impressive
2. **Explicit over implicit** — No magic. Make behavior obvious
3. **Composition over inheritance** — Small units that combine
4. **Fail fast, fail loud** — Surface errors at the source
5. **Delete code** — Less code = fewer bugs. Question every addition
6. **Verify, don't assume** — Run it. Test it. Prove it works

## Project Overview

A React SPA for rendering Markdown with inline Mermaid diagram support. Built with Vite + React + TypeScript.

## Architecture

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Main app with editor/preview layout
├── App.css                     # Global styles
├── components/
│   ├── DiagramActions.tsx      # Copy/Save diagram as PNG (extracted for testability)
│   ├── MarkdownRenderer.tsx    # Markdown parsing with react-markdown
│   └── Mermaid.tsx             # Mermaid diagram rendering component
├── context/
│   ├── MermaidContext.tsx      # React context for render mode state
│   ├── themeConfig.ts          # Theme types and default config (pure)
│   └── mermaidStorage.ts       # localStorage keys, validators, loadThemeConfig (pure, testable)
├── lib/
│   ├── mermaidTheme.ts         # buildThemeOptions, computeBeautifulRender (pure, testable)
│   └── markdownCodeBlock.ts    # parseCodeBlock, isMermaidBlock (pure, testable)
├── utils/
│   └── copyPreview.ts           # Diagram PNG export; exports pure helpers for tests
└── test/
    └── setup.ts                # Vitest + Testing Library setup
```

## Key Components

### Mermaid.tsx
Renders mermaid diagrams with three modes:
- `default`: Uses mermaid.js directly
- `beautiful-svg`: Uses beautiful-mermaid for styled SVG
- `beautiful-ascii`: Uses beautiful-mermaid for ASCII/Unicode output

### MermaidContext.tsx
Provides render mode state across the app. Persists selection to localStorage under key `md-mermaid-render-mode`.

### MarkdownRenderer.tsx
Uses react-markdown with:
- `remark-gfm` for GitHub Flavored Markdown
- `rehype-raw` for raw HTML passthrough
- Custom code component that routes `mermaid` language blocks to the Mermaid component
- Code-block routing uses `parseCodeBlock` / `isMermaidBlock` from `lib/markdownCodeBlock` (pure, unit-tested)

## Development Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server
pnpm build      # Production build (Vite only)
pnpm typecheck  # Type-check (tsc -b)
pnpm test       # Run tests (Vitest)
pnpm test:watch # Run tests in watch mode
pnpm preview    # Preview production build
```

## Deployment

Deployed to GitHub Pages via GitHub Actions. Base path is `/md-mermaid-renderer/`.

## Coding Conventions

- TypeScript with strict mode
- React functional components with hooks
- CSS in App.css (no CSS-in-JS)
- Prefer type imports (`import type { X }`) for types only

## Cursor Cloud specific instructions

### Services

This is a single client-side React SPA — no backend, no Docker, no external services. The only service to run is the Vite dev server (`pnpm dev`). All development commands are listed in the "Development Commands" section above.

### Caveats

- **esbuild build scripts**: pnpm's security feature blocks esbuild's postinstall by default. The `pnpm.onlyBuiltDependencies` field in `package.json` whitelists `esbuild` so `pnpm install` correctly installs its native binary. If this field is missing, run `pnpm install` then `pnpm rebuild esbuild` may not work — the field must be present before install.
- **`pnpm typecheck` shows errors from `beautiful-mermaid`**: All typecheck failures come from the third-party `beautiful-mermaid` package in `node_modules`, not from project source. This is a known upstream issue.
- **`pnpm lint` reports 1 error**: A pre-existing `react-refresh/only-export-components` warning in `src/context/MermaidContext.tsx`. Not introduced by agent changes.
- **Dev server base path**: The app is served at `/md-mermaid-renderer/` (not root `/`), matching the GitHub Pages deployment config in `vite.config.ts`. Use `http://localhost:5173/md-mermaid-renderer/` when testing locally.
