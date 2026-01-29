# AGENTS.md

This file provides guidance for AI agents working on this codebase.

## Project Overview

A React SPA for rendering Markdown with inline Mermaid diagram support. Built with Vite + React + TypeScript.

## Architecture

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Main app with editor/preview layout
├── App.css                     # Global styles
├── components/
│   ├── MarkdownRenderer.tsx    # Markdown parsing with react-markdown
│   └── Mermaid.tsx             # Mermaid diagram rendering component
└── context/
    └── MermaidContext.tsx      # React context for render mode state
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

## Development Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server
pnpm build      # Production build
pnpm preview    # Preview production build
```

## Deployment

Deployed to GitHub Pages via GitHub Actions. Base path is `/md-mermaid-renderer/`.

## Coding Conventions

- TypeScript with strict mode
- React functional components with hooks
- CSS in App.css (no CSS-in-JS)
- Prefer type imports (`import type { X }`) for types only
