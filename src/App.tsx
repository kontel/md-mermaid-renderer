import { useState, useEffect, useRef, useCallback } from 'react';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ThemeDrawer } from './components/ThemeDrawer';
import { HighlightedEditor } from './components/HighlightedEditor';
import { MermaidProvider, useMermaidContext } from './context/MermaidContext';
import type { MermaidRenderMode } from './context/MermaidContext';
import { copyPreview } from './utils/copyPreview';
import type { CopyImageFontSize, CopyStrategy, LabelWrapAggressiveness } from './utils/copyPreview';
import { COPY_TARGETS, copyTargetProfile } from './lib/copyTargets';
import type { CopyTarget } from './lib/copyTargets';
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

const mainMarkdown = `# Markdown with Mermaid Demo

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

const largeFlowMarkdown = `# Large Flow Diagram (12 × 20)

A heavy flow used to exercise rendering performance. Isolated in its own tab so edits in the basic demo don't force it to re-render.

\`\`\`mermaid
${largeFlowDiagram}
\`\`\`
`;

const galleryMarkdown = `# Diagram Gallery

A quick tour of Mermaid's other diagram types — beyond the flowcharts, sequence, and class diagrams in the Basic tab.

## State Diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: fetch
    Loading --> Success: 200
    Loading --> Error: fail
    Success --> Idle: reset
    Error --> Idle: retry
    Success --> [*]
\`\`\`

## Entity Relationship

\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : listed_in
    CUSTOMER {
        string name
        string email
    }
    ORDER {
        int id
        date placed_at
    }
\`\`\`

## Gantt Chart

\`\`\`mermaid
gantt
    title Release plan
    dateFormat YYYY-MM-DD
    section Design
    Mockups    :done,   2026-04-01, 5d
    Review     :active, 2026-04-06, 2d
    section Build
    Implement  :        2026-04-08, 7d
    QA         :        2026-04-15, 3d
\`\`\`

## Pie Chart

\`\`\`mermaid
pie title Traffic sources
    "Organic" : 45
    "Referral" : 30
    "Direct" : 15
    "Social" : 10
\`\`\`

## User Journey

\`\`\`mermaid
journey
    title A day at the keyboard
    section Morning
      Stand-up:     3: Me
      Code review:  4: Me
    section Afternoon
      Debug session: 2: Me
      Ship it:       5: Me
\`\`\`

## Mindmap

\`\`\`mermaid
mindmap
  root((Mermaid))
    Flowcharts
      Shapes
      Arrows
    Sequence
      Actors
      Messages
    Other
      Gantt
      Pie
      State
\`\`\`

## Git Graph

\`\`\`mermaid
gitGraph
    commit
    commit
    branch feature
    commit
    commit
    checkout main
    merge feature
    commit
\`\`\`
`;

type TabId = 'main' | 'large' | 'gallery';

const TABS: { id: TabId; label: string; defaultContent: string; storageKey: string }[] = [
  { id: 'main', label: 'Basic', defaultContent: mainMarkdown, storageKey: 'md-mermaid-content-main' },
  { id: 'large', label: 'Large flow', defaultContent: largeFlowMarkdown, storageKey: 'md-mermaid-content-large' },
  { id: 'gallery', label: 'Gallery', defaultContent: galleryMarkdown, storageKey: 'md-mermaid-content-gallery' },
];

const RENDER_MODES: { value: MermaidRenderMode; label: string; hint: string }[] = [
  { value: 'default', label: 'Default', hint: 'Standard mermaid.js' },
  { value: 'beautiful-svg', label: 'Beautiful', hint: 'Themed SVG rendering' },
  { value: 'beautiful-ascii', label: 'ASCII', hint: 'Text/ASCII rendering' },
];

function RenderModeSelector() {
  const { renderMode, setRenderMode, setDrawerOpen } = useMermaidContext();
  const isBeautiful = renderMode === 'beautiful-svg' || renderMode === 'beautiful-ascii';

  return (
    <>
      <div className="segmented" role="group" aria-label="Diagram renderer">
        {RENDER_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={renderMode === m.value}
            onClick={() => setRenderMode(m.value)}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>
      {isBeautiful && (
        <button
          className="theme-btn-trigger"
          onClick={() => setDrawerOpen(true)}
          title="Customize diagram colors and fonts"
        >
          Theme
        </button>
      )}
    </>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CopyPreviewButton({
  previewRef,
  markdownSource,
}: {
  previewRef: React.RefObject<HTMLDivElement | null>;
  markdownSource: string;
}) {
  const {
    labelWrapAggressiveness,
    setLabelWrapAggressiveness,
    copyImageFontSize,
    setCopyImageFontSize,
    copyTarget,
    setCopyTarget,
  } = useMermaidContext();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [strategy, setStrategy] = useState<CopyStrategy>('auto');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [popoverOpen]);

  const profile = copyTargetProfile(copyTarget);

  const handleCopy = async () => {
    if (!previewRef.current) return;
    try {
      await copyPreview(previewRef.current, {
        target: copyTarget,
        strategy,
        wrapAggressiveness: labelWrapAggressiveness,
        copyImageFontSize,
        markdownSource,
      });
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    setTimeout(() => setStatus('idle'), 2000);
  };

  const btnLabel =
    status === 'copied' ? 'Copied!' :
    status === 'failed' ? 'Failed' :
    copyTarget === 'rich' ? 'Copy' : `Copy · ${profile.label}`;

  return (
    <div className="copy-preview-group" ref={groupRef}>
      <button
        className={`copy-preview-btn ${status !== 'idle' ? `copy-preview-btn--${status}` : ''}`}
        onClick={handleCopy}
        title={`Copy preview for ${profile.label} — ${profile.hint}`}
      >
        <CopyIcon />
        {btnLabel}
      </button>
      <button
        className="copy-settings-btn"
        onClick={() => setPopoverOpen((o) => !o)}
        aria-expanded={popoverOpen}
        aria-haspopup="true"
        title="Copy settings"
      >
        <GearIcon />
      </button>
      {popoverOpen && (
        <div className="copy-popover" role="dialog" aria-label="Copy settings">
          <div className="copy-popover-row">
            <label htmlFor="copy-target">Paste into</label>
            <select
              id="copy-target"
              value={copyTarget}
              onChange={(e) => setCopyTarget(e.target.value as CopyTarget)}
              title="Tunes fonts, spacing and image sizing for the system you're pasting into"
            >
              {COPY_TARGETS.map((t) => (
                <option key={t} value={t}>
                  {copyTargetProfile(t).label}
                </option>
              ))}
            </select>
            <p className="copy-popover-hint">{profile.hint}</p>
          </div>
          {profile.emitsHtml && (
            <>
              <div className="copy-popover-row">
                <label htmlFor="copy-strategy">Strategy</label>
                <select
                  id="copy-strategy"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as CopyStrategy)}
                  title="How diagrams are converted to images for pasting"
                >
                  <option value="auto">Auto</option>
                  <option value="svg-pipeline">SVG (fast)</option>
                  <option value="dom-capture">DOM (pixel-perfect)</option>
                </select>
              </div>
              <div className="copy-popover-row">
                <label htmlFor="copy-wrap">Label wrap</label>
                <select
                  id="copy-wrap"
                  value={labelWrapAggressiveness}
                  onChange={(e) => setLabelWrapAggressiveness(e.target.value as LabelWrapAggressiveness)}
                  title="How aggressively long label text wraps in copied diagram images"
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                </select>
              </div>
              <div className="copy-popover-row">
                <label htmlFor="copy-font">Image font size</label>
                <select
                  id="copy-font"
                  value={copyImageFontSize}
                  onChange={(e) => setCopyImageFontSize(e.target.value as CopyImageFontSize)}
                  title="Font size of text in copied/saved diagram images"
                >
                  <option value="small">Small</option>
                  <option value="normal">Normal</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'true';
  const previewRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const [tabContents, setTabContents] = useState<Record<TabId, string>>(() => {
    const init = {} as Record<TabId, string>;
    for (const t of TABS) {
      const stored = localStorage.getItem(t.storageKey);
      init[t.id] = stored !== null ? stored : t.defaultContent;
    }
    return init;
  });

  const [activeTab, setActiveTab] = useState<TabId>('main');
  const markdown = tabContents[activeTab];
  const setMarkdown = (v: string) =>
    setTabContents((prev) => ({ ...prev, [activeTab]: v }));

  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [previewDark, setPreviewDark] = useState(false);

  useEffect(() => {
    if (isPreviewMode) return;
    for (const t of TABS) {
      localStorage.setItem(t.storageKey, tabContents[t.id]);
    }
  }, [tabContents, isPreviewMode]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const rect = mainRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => setIsDragging(false);
    document.body.classList.add('is-dragging-col');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.body.classList.remove('is-dragging-col');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  const handleSplitterDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleSplitterKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setSplitPercent((p) => Math.max(20, p - 2));
    if (e.key === 'ArrowRight') setSplitPercent((p) => Math.min(80, p + 2));
  }, []);

  const openPreviewTab = () => {
    localStorage.setItem(STORAGE_KEY, markdown);
    window.open(`${window.location.origin}${window.location.pathname}?preview=true`, '_blank');
  };

  if (isPreviewMode) {
    const previewContent = localStorage.getItem(STORAGE_KEY) || markdown;
    return (
      <div className="preview-only">
        <MarkdownRenderer content={previewContent} />
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
            className="icon-btn"
            onClick={openPreviewTab}
            title="Open a standalone preview tab for PDF export"
            aria-label="Open preview in a new tab"
          >
            <ExternalLinkIcon />
          </button>
        </div>
      </header>
      <main
        className="main"
        ref={mainRef}
        style={{ ['--split' as string]: `${splitPercent}%` } as React.CSSProperties}
      >
        <div className="editor-pane">
          <div className="pane-header">
            <div className="editor-tabs" role="tablist" aria-label="Editor tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  className="editor-tab"
                  onClick={() => setActiveTab(t.id)}
                  title={t.label}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <HighlightedEditor
            value={markdown}
            onChange={setMarkdown}
            placeholder="Enter your markdown here..."
          />
        </div>
        <div
          className={`splitter ${isDragging ? 'is-dragging' : ''}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor"
          tabIndex={0}
          onMouseDown={handleSplitterDown}
          onKeyDown={handleSplitterKey}
        />
        <div className="preview-pane">
          <div className="pane-header">
            <span>Preview</span>
            <div className="pane-header-actions">
              <button
                className="preview-theme-toggle"
                onClick={() => setPreviewDark((d) => !d)}
                title={previewDark ? 'Switch preview to light' : 'Switch preview to dark'}
                aria-label="Toggle preview theme"
                aria-pressed={previewDark}
              >
                {previewDark ? <SunIcon /> : <MoonIcon />}
              </button>
              <CopyPreviewButton previewRef={previewRef} markdownSource={markdown} />
            </div>
          </div>
          <div className={`preview ${previewDark ? 'preview--dark' : ''}`} ref={previewRef}>
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
