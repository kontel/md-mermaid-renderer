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
├── content/
│   └── samples.ts              # Editor tab documents (Basic, Large flow, Gallery, Charts, New in v11)
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
│   ├── markdownCodeBlock.ts    # parseCodeBlock, isMermaidBlock (pure, testable)
│   ├── copyTargets.ts          # Per-target paste profiles: fonts, spacing, image caps (pure data)
│   ├── copyDocument.ts         # Applies a profile to a cloned DOM (jsdom-testable)
│   ├── mermaidStyle.ts         # Diagram style presets + design tokens (pure, testable)
│   ├── svgExport.ts            # foreignObject → SVG <text> rewrite for PNG export (pure string)
│   └── changelogStorage.ts     # "What's new" dismissal, per version
├── utils/
│   └── copyPreview.ts           # Diagram PNG export + clipboard; exports pure helpers for tests
└── test/
    └── setup.ts                # Vitest + Testing Library setup
```

## Key Components

### Mermaid.tsx
Renders mermaid diagrams with three modes:
- `default`: Uses mermaid.js directly
- `beautiful-svg`: Uses beautiful-mermaid for styled SVG
- `beautiful-ascii`: Uses beautiful-mermaid for ASCII/Unicode output

beautiful-mermaid only handles the flowchart family, so the two `beautiful-*`
modes **fall back to mermaid.js** for anything else (gantt, mindmap, venn, …)
rather than erroring. Fallback renders are labelled in the UI and the label is
stripped from copied and printed output.

Newer diagram types (venn, cynefin, swimlane, treeView, wardley, ishikawa,
railroad) register their detectors lazily. The module awaits
`registerExternalDiagrams([], { lazyLoad: true })` before the first render —
without it, a page mounting several diagrams at once races registration and the
losers report "No diagram type detected" until you navigate away and back.

When adding a sample diagram to `content/samples.ts`, render it before
committing; several types are beta and their syntax is not always what the
release notes imply.

### MermaidContext.tsx
Provides render mode state across the app. Persists selection to localStorage under key `md-mermaid-render-mode`.

### Diagram styling (lib/mermaidStyle.ts)
15 presets for the mermaid.js renderer — `theme` + `look` pairs, some layering
`themeVariables` on mermaid's `base` theme. `classic` is the default and passes
through untouched.

Two rules the module enforces:
- Only the `base` theme reads `themeVariables`; the named themes hardcode their
  palettes. So **any** design-token override switches the config to `base`,
  otherwise the control would silently do nothing.
- Swatch colours in the picker are sampled from real renders, not guessed.

The styling panel is a sibling of `.main` inside `.workspace`, so opening it
shrinks the panes rather than covering the preview being restyled. It reverts to
an overlay below 900px. Its open animation must never carry layout — animating
`flex-basis` left the panel collapsed in backgrounded tabs, where animations
don't run.

### PNG export (lib/svgExport.ts)
Drawing an SVG that contains a `<foreignObject>` onto a canvas taints it, so
`toDataURL` throws. mermaid puts every HTML label in a foreignObject, so the
export rewrites each one into a native `<text>` — which means re-implementing
line breaks, wrapping and centring by hand. It is pure string-in/string-out
precisely so the regex work can be tested directly instead of only through a
canvas.

Two things to preserve when touching it:
- **Faithfulness beats correctness.** mermaid mangles numeric character
  references in labels (`&#39;` reaches the DOM as `&'`). The export reproduces
  that rather than repairing it — a PNG that disagrees with the preview is worse
  than one that matches.
- The edge-label test only inspects a ±160 character window around each
  foreignObject. A wider scan misclassifies node labels and draws a second
  border around them.

### Outlook (lib/outlookCompat.ts)
Outlook on Windows renders mail with **Word**, not a browser engine, and fails
silently — no console, no error, just wrong output. Gmail can look perfect while
Outlook is broken, so the email profile is written against Word's constraints and
`outlookCompat.ts` lints the generated HTML for the traps that have actually bitten:

- `mso-line-height-rule:exactly` is an **absolute** measure to Word. Pairing it
  with a unitless `line-height:1.65` renders as ~1.65pt and collapses the text.
  Every email line-height is therefore in px.
- Word ignores `max-width` and scales attribute-less images by system DPI, so
  images carry explicit `width` **and** `height`.
- Borders and padding on `<div>` are unreliable; the diagram card is a
  single-cell `<table>` (`figureCellStyle`) because Word lays tables out predictably.
- CSS table widths get dropped and CSS backgrounds on rows/cells are patchy, so
  both are mirrored onto `width` and `bgcolor` attributes.

Run `pnpm test:outlook`. The lint is not a renderer: clean means none of the
known traps are present, not that Word matches Gmail.

**The one thing it cannot fix:** diagrams are `data:` URI images, and Outlook
desktop does not resolve those when pasting HTML. That is a client limitation, not
a markup bug — the audit reports it as a warning so it stays visible.

### Copy targets (lib/copyTargets.ts + lib/copyDocument.ts)
"Copy preview" writes HTML styled for the system it will be pasted into, because every
target strips CSS differently. All styling travels inline — there is no stylesheet on the
clipboard.

| Target | Notes |
|---|---|
| Rich text | Google Docs, Word, Slack. Mirrors the app's look. |
| Email | Web-safe fonts only, light code blocks (dark mode inverts dark ones), `mso-*` hints for Outlook, table attributes, images displayed at ≤600px. |
| Confluence | Structural HTML only — the editor discards CSS and re-styles by tag. Diagram wrappers become `<p>`, layout divs are unwrapped, `language-*` classes survive for the code macro. |
| Markdown source | `text/plain` only; the raw editor content. |

Adding a target means adding one `CopyTargetProfile` — no changes to the render pipeline.
`maxImageWidth` caps how large a diagram *displays*; `maxRenderWidth` caps PNG resolution,
trading zoom detail against clipboard payload size.

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
