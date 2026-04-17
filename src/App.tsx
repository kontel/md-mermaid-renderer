import { useState, useEffect, useRef } from 'react';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ThemeDrawer } from './components/ThemeDrawer';
import { MermaidProvider, useMermaidContext } from './context/MermaidContext';
import type { MermaidRenderMode } from './context/MermaidContext';
import { copyPreview } from './utils/copyPreview';
import type { CopyImageFontSize, CopyStrategy, LabelWrapAggressiveness } from './utils/copyPreview';
import './App.css';

const STORAGE_KEY = 'md-mermaid-content';

const AVATAR_SRC =
  import.meta.env.DEV ? '/kontel-avatar.png' : `${import.meta.env.BASE_URL}kontel-avatar.png`;

function generateLargeFlow(): string {
  const rows = 20;
  const cols = 12;

  const stages = [
    'Ingest request',
    'Parse headers',
    'Authenticate JWT',
    'Validate payload schema against strict contract v2',
    'Rate limit?',
    'Enrich with tenant + user context',
    'Shard by tenant id',
    'Queue for async worker',
    'Transform',
    'Apply rules engine?',
    'Dedupe against recent window',
    'Persist to primary datastore',
    'Replicate cross-region asynchronously',
    'Emit domain event',
    'Invalidate caches',
    'Notify downstream consumers via broker',
    'Write audit trail with full request context',
    'Collect metrics + distributed traces',
    'Ack client',
    'Archive',
  ];

  const lanes = [
    'Payments',
    'Notifications',
    'Search index',
    'Analytics ingest',
    'Media transcode',
    'Auth service',
    'Inventory',
    'Billing recon',
    'Sync replication',
    'Event bus',
    'Cache warmer',
    'Audit logger',
  ];

  const shapeOf = (r: number, label: string): string => {
    const q = `"${label}"`;
    if (r === 5 || r === 10) return `{${q}}`;
    if (r === 12) return `[(${q})]`;
    if (r === 7 || r === 16) return `[[${q}]]`;
    if (r === 6 || r === 14) return `(${q})`;
    return `[${q}]`;
  };

  const labelOf = (r: number, c: number): string => {
    const stage = stages[r - 1];
    const lane = lanes[c - 1];
    const mix = (r * 31 + c * 17) % 13;
    if (mix === 0) return `${lane} / ${stage} — extended notes about retries, idempotency and compensation`;
    if (mix < 4) return `${lane} / ${stage}`;
    if (mix < 7) return stage;
    if (mix < 10) return `${lane} ${stage.toLowerCase()}`;
    return lane;
  };

  const lines: string[] = ['flowchart TD'];

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      lines.push(`    N${r}_${c}${shapeOf(r, labelOf(r, c))}`);
    }
  }

  for (let r = 1; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      lines.push(`    N${r}_${c} --> N${r + 1}_${c}`);
    }
  }

  for (const c of [1, 2, 7, 8, 11]) {
    lines.push(`    N3_${c} -.->|verify| N4_6`);
  }

  for (const [c, target] of [[2, 1], [4, 3], [9, 8], [10, 9]] as const) {
    lines.push(`    N5_${c} -->|reject| N6_${target}`);
  }

  for (const c of [1, 3, 5, 7, 9, 11]) {
    lines.push(`    N7_${c} --> N8_${c + 1}`);
  }

  lines.push('    N10_3 -.->|retry| N7_3');
  lines.push('    N10_8 -.->|retry| N7_8');

  for (const c of [1, 3, 5, 7, 9]) {
    lines.push(`    N12_${c} --> N13_12`);
  }

  for (let c = 1; c <= cols; c++) {
    if (c === 3 || c === 11) continue;
    const target = c % 2 === 0 ? 11 : 3;
    lines.push(`    N14_${c} -.-> N15_${target}`);
  }

  for (const target of [2, 5, 6, 8, 9]) {
    lines.push(`    N16_10 --> N17_${target}`);
  }

  for (let c = 1; c <= cols; c++) {
    if (c !== 12) lines.push(`    N18_${c} -.-> N19_12`);
  }

  return lines.join('\n');
}

const largeFlowDiagram = generateLargeFlow();

const defaultMarkdown = `# Markdown with Mermaid Demo

This is a **markdown** renderer with support for *inline* Mermaid diagrams.

## Features

- GitHub Flavored Markdown
- Mermaid diagram rendering
- Live preview

## Flowchart Example

\`\`\`mermaid
flowchart TD
    subgraph init["Setup & initialization<br/>of core services"]
        A[Start]
    end
    subgraph check["Check very long status text without line breaks"]
        B{Is it working?<br/>test}
    end
    subgraph actions["Actions<br/>& results"]
        C[Great!]
        D[Debug with long text without line breaks]
    end
    subgraph done["Finish"]
        E[End]
    end
    A --> B
    B -->|Yes| C
    B -->|No| D
    D --> B
    C --> E
\`\`\`

## Simple Flow Diagram

\`\`\`mermaid
flowchart LR
    A[Start] --> B{Choice}
    B -->|One| C[Step 1]
    B -->|Two| D[Step 2]
    C --> E[End]
    D --> E
\`\`\`

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant App
    participant Server
    User->>App: Enter markdown
    App->>App: Parse & render
    App->>Server: Save document
    Server-->>App: Confirmation
    App-->>User: Display preview
\`\`\`

## Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Table Example

| Feature | Status |
|---------|--------|
| Markdown | ✅ |
| Mermaid | ✅ |
| GFM | ✅ |

## Large Flow Diagram (12 × 20)

\`\`\`mermaid
${largeFlowDiagram}
\`\`\`

## Class Diagram

\`\`\`mermaid
classDiagram
    class MarkdownRenderer {
        +content: string
        +render(): void
    }
    class Mermaid {
        +chart: string
        +render(): SVG
    }
    MarkdownRenderer --> Mermaid : uses
\`\`\`
`;

function RenderModeSelector() {
  const { renderMode, setRenderMode, setDrawerOpen } = useMermaidContext();
  const isBeautiful = renderMode === 'beautiful-svg' || renderMode === 'beautiful-ascii';

  return (
    <div className="render-mode-selector">
      <label htmlFor="render-mode">Renderer:</label>
      <select
        id="render-mode"
        value={renderMode}
        onChange={(e) => setRenderMode(e.target.value as MermaidRenderMode)}
        title="Choose how Mermaid diagrams are rendered"
      >
        <option value="default">Default (mermaid.js)</option>
        <option value="beautiful-svg">Beautiful Mermaid (SVG)</option>
        <option value="beautiful-ascii">Beautiful Mermaid (ASCII)</option>
      </select>
      {isBeautiful && (
        <button
          className="theme-btn-trigger"
          onClick={() => setDrawerOpen(true)}
          title="Customize diagram colors and fonts"
        >
          Theme
        </button>
      )}
    </div>
  );
}

function CopyPreviewButton({ previewRef }: { previewRef: React.RefObject<HTMLDivElement | null> }) {
  const {
    labelWrapAggressiveness,
    setLabelWrapAggressiveness,
    copyImageFontSize,
    setCopyImageFontSize,
  } = useMermaidContext();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [strategy, setStrategy] = useState<CopyStrategy>('auto');

  const handleCopy = async () => {
    if (!previewRef.current) return;
    try {
      await copyPreview(previewRef.current, strategy, labelWrapAggressiveness, copyImageFontSize);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="copy-preview-group">
      <button
        className={`copy-preview-btn ${status !== 'idle' ? `copy-preview-btn--${status}` : ''}`}
        onClick={handleCopy}
        title="Copy preview to clipboard (rich HTML with diagrams as images)"
      >
        {status === 'idle' && 'Copy to clipboard'}
        {status === 'copied' && 'Copied!'}
        {status === 'failed' && 'Failed'}
      </button>
      <select
        className="copy-strategy-select"
        value={strategy}
        onChange={(e) => setStrategy(e.target.value as CopyStrategy)}
        title="How diagrams are converted to images for pasting"
        aria-label="Copy strategy"
      >
        <option value="auto">Auto</option>
        <option value="svg-pipeline">SVG (fast)</option>
        <option value="dom-capture">DOM (pixel-perfect)</option>
      </select>
      <select
        className="copy-strategy-select"
        value={labelWrapAggressiveness}
        onChange={(e) => setLabelWrapAggressiveness(e.target.value as LabelWrapAggressiveness)}
        title="How aggressively long label text wraps in copied diagram images"
        aria-label="Label wrap aggressiveness"
      >
        <option value="compact">Wrap: Compact</option>
        <option value="normal">Wrap: Normal</option>
        <option value="wide">Wrap: Wide</option>
      </select>
      <select
        className="copy-strategy-select"
        value={copyImageFontSize}
        onChange={(e) => setCopyImageFontSize(e.target.value as CopyImageFontSize)}
        title="Font size of text in copied/saved diagram images"
        aria-label="Copy image font size"
      >
        <option value="small">Font: Small</option>
        <option value="normal">Font: Normal</option>
        <option value="large">Font: Large</option>
      </select>
    </div>
  );
}

function AppContent() {
  const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'true';
  const previewRef = useRef<HTMLDivElement>(null);

  const [markdown, setMarkdown] = useState(() => {
    if (isPreviewMode) {
      return localStorage.getItem(STORAGE_KEY) || defaultMarkdown;
    }
    return defaultMarkdown;
  });

  useEffect(() => {
    if (!isPreviewMode) {
      localStorage.setItem(STORAGE_KEY, markdown);
    }
  }, [markdown, isPreviewMode]);

  const openPreviewTab = () => {
    localStorage.setItem(STORAGE_KEY, markdown);
    window.open(`${window.location.origin}${window.location.pathname}?preview=true`, '_blank');
  };

  if (isPreviewMode) {
    return (
      <div className="preview-only">
        <MarkdownRenderer content={markdown} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <h1>Markdown + Mermaid Renderer</h1>
          <a
            href="https://github.com/kontel"
            target="_blank"
            rel="noopener noreferrer"
            className="header-byline"
            title="kontel on GitHub"
          >
            <img
              src={AVATAR_SRC}
              alt=""
              className="header-avatar"
              width={20}
              height={20}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span>created by kontel</span>
          </a>
        </div>
        <div className="header-controls">
          <RenderModeSelector />
          <div className="header-divider" />
          <button
            className="open-preview-btn"
            onClick={openPreviewTab}
            title="Open a standalone preview tab for PDF export"
          >
            Open in a new tab
          </button>
        </div>
      </header>
      <main className="main">
        <div className="editor-pane">
          <div className="pane-header">Editor</div>
          <textarea
            className="editor"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Enter your markdown here..."
            spellCheck={false}
          />
        </div>
        <div className="preview-pane">
          <div className="pane-header">
            Preview
            <CopyPreviewButton previewRef={previewRef} />
          </div>
          <div className="preview" ref={previewRef}>
            <MarkdownRenderer content={markdown} />
          </div>
        </div>
      </main>
      <ThemeDrawer />
    </div>
  );
}

function App() {
  return (
    <MermaidProvider>
      <AppContent />
    </MermaidProvider>
  );
}

export default App;
