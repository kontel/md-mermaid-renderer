/**
 * Sample documents shown in the editor tabs.
 *
 * Each tab is its own document so editing one does not force the others to
 * re-render — which matters for the heavy diagrams.
 *
 * Every mermaid block here is verified to parse against the pinned mermaid
 * version; if you add one, render it before committing.
 */

export type TabId = 'main' | 'large' | 'gallery' | 'charts' | 'modern';

export interface SampleTab {
  id: TabId;
  label: string;
  defaultContent: string;
  storageKey: string;
}

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
${generateLargeFlow()}
\`\`\`
`;

const galleryMarkdown = `# Diagram Gallery

The classic Mermaid diagram types — beyond the flowcharts, sequence and class diagrams in the Basic tab.

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

Attribute types marked \`?\` are optional — added in Mermaid 11.16.

\`\`\`mermaid
erDiagram
    DOCUMENT ||--o{ DIAGRAM : contains
    DIAGRAM ||--o| EXPORT : renders
    DOCUMENT {
        string id PK
        string title
        date updated_at
    }
    DIAGRAM {
        string id PK
        string kind
        string? caption
        int? width
    }
    EXPORT {
        string format
        int width_px
    }
\`\`\`

## Gantt Chart

Multiple \`excludes\` lines are supported since 11.16.

\`\`\`mermaid
gantt
    title Release plan
    dateFormat YYYY-MM-DD
    excludes weekends
    excludes 2026-08-03
    section Design
    Mockups    :done,   2026-07-06, 5d
    Review     :active, 2026-07-13, 2d
    section Build
    Implement  :        2026-07-15, 7d
    QA         :        2026-07-22, 3d
\`\`\`

## Pie Chart (donut)

\`useDonut\` and \`showData\` arrived in 11.16.

\`\`\`mermaid
%%{init: {"pie": {"useDonut": true}} }%%
pie showData title Copy targets used
    "Email" : 45
    "Confluence" : 30
    "Rich text" : 18
    "Markdown source" : 7
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

## Quadrant Chart

\`\`\`mermaid
quadrantChart
    title Effort vs impact
    x-axis Low effort --> High effort
    y-axis Low impact --> High impact
    quadrant-1 Do now
    quadrant-2 Plan it
    quadrant-3 Drop it
    quadrant-4 Quick wins
    Outlook image hosting: [0.85, 0.90]
    Confluence SVG paste: [0.45, 0.70]
    Parallel diagram export: [0.30, 0.35]
    Extra theme presets: [0.25, 0.15]
\`\`\`

## Timeline

\`\`\`mermaid
timeline
    title Renderer milestones
    2025 : First preview : Mermaid inline
    2026 : Copy as PNG : Per-target copy profiles
         : Mermaid 11.16
\`\`\`

## Requirement Diagram

\`\`\`mermaid
requirementDiagram
    requirement paste_fidelity {
        id: 1
        text: pasted output keeps spacing and fonts
        risk: high
        verifymethod: test
    }
    functionalRequirement image_cap {
        id: 1.1
        text: diagrams display at most 600px in email
        risk: medium
        verifymethod: test
    }
    element copy_profiles {
        type: module
        docref: src/lib/copyTargets.ts
    }
    copy_profiles - satisfies -> paste_fidelity
    image_cap - derives -> paste_fidelity
\`\`\`
`;

const chartsMarkdown = `# Charts & Architecture

Data and infrastructure diagram types.

## Sankey

\`\`\`mermaid
sankey-beta
Visits,Opened editor,620
Visits,Bounced,380
Opened editor,Copied output,410
Opened editor,Left,210
Copied output,Email,180
Copied output,Confluence,140
Copied output,Rich text,90
\`\`\`

## XY Chart

\`\`\`mermaid
xychart-beta
    title "Export width by target"
    x-axis ["Rich text", "Confluence", "Email"]
    y-axis "Display width (px)" 0 --> 800
    bar [760, 680, 600]
\`\`\`

## Radar

\`\`\`mermaid
radar-beta
  axis clarity, speed, fidelity, size
  curve png["PNG export"]{80, 90, 70, 40}
  curve svg["SVG export"]{95, 85, 95, 95}
\`\`\`

## Treemap

\`\`\`mermaid
treemap-beta
"Bundle size"
    "mermaid": 620
    "react + react-dom": 140
    "html2canvas": 200
    "remark / rehype": 90
    "app code": 40
\`\`\`

## Block Diagram

\`\`\`mermaid
block-beta
  columns 3
  Editor["Editor"]:1 space Preview["Preview"]:1
  Parser["remark + rehype"] Renderer["Mermaid"] Clipboard["Copy profiles"]
\`\`\`

## C4 Context

\`\`\`mermaid
C4Context
    title Renderer system context
    Person(author, "Author", "Writes markdown with diagrams")
    System(app, "Markdown + Mermaid Renderer", "Renders and exports")
    System_Ext(mail, "Email client", "Gmail, Outlook")
    System_Ext(wiki, "Confluence", "Team wiki")
    Rel(author, app, "Writes and previews")
    Rel(app, mail, "Pastes styled HTML")
    Rel(app, wiki, "Pastes structural HTML")
\`\`\`

## Architecture

\`\`\`mermaid
architecture-beta
    group browser(cloud)[Browser]
    service editor(server)[Editor] in browser
    service preview(server)[Preview] in browser
    service exporter(disk)[PNG export] in browser
    service clipboard(disk)[Clipboard] in browser
    editor:R --> L:preview
    preview:R --> L:exporter
    exporter:R --> L:clipboard
\`\`\`

## Kanban

\`\`\`mermaid
kanban
  Backlog
    t1[Outlook image hosting]
    t2[Parallel diagram export]
  In progress
    t3[Confluence SVG paste]
  Done
    t4[Per-target copy profiles]
    t5[Mermaid 11.16 upgrade]
\`\`\`

## Packet

\`\`\`mermaid
packet-beta
0-15: "Source Port"
16-31: "Destination Port"
32-63: "Sequence Number"
64-95: "Acknowledgment Number"
\`\`\`
`;

const modernMarkdown = `# New in Mermaid v11

Diagram types and features added in 11.13 – 11.16.

## Venn (11.13)

\`\`\`mermaid
venn-beta
    set md ["Markdown"]
    set mm ["Mermaid"]
    union md,mm ["This renderer"]
\`\`\`

## Ishikawa / fishbone (11.13)

\`\`\`mermaid
ishikawa
  title Pasted diagram looks wrong
  Rendering
    Label overflows the node
    Font not installed
  Export
    Canvas tainted by foreignObject
    Image too wide for the body
  Target
    Editor strips inline CSS
\`\`\`

## Half arrowheads (11.13)

Solid (\`--o\`) and stick (\`--x\`) half arrows, plus an invisible link (\`~~~\`).

\`\`\`mermaid
flowchart LR
    A[Editor] --o B[Preview]
    B --x C[Clipboard]
    A ~~~ C
\`\`\`

## TreeView (11.14)

Accepts box-drawing characters, so you can paste a \`tree\` listing straight in.

\`\`\`mermaid
treeView-beta
src
├── components
│   ├── Mermaid.tsx
│   └── MarkdownRenderer.tsx
├── lib
│   ├── copyTargets.ts
│   └── copyDocument.ts
└── utils
    └── copyPreview.ts
\`\`\`

## Wardley Map (11.14)

\`\`\`mermaid
wardley-beta
  title Renderer value chain
  component Author [0.95, 0.15]
  component Preview [0.75, 0.45]
  component Export [0.55, 0.60]
  component Clipboard [0.35, 0.85]
  Author -> Preview
  Preview -> Export
  Export -> Clipboard
\`\`\`

## Datastore shape (11.15)

\`\`\`mermaid
flowchart LR
    A[Render] --> B[(Cache)]
    B --> C@{ shape: das, label: "Diagram store" }
    C --> D[Export]
\`\`\`

## Nested class namespaces (11.15)

\`\`\`mermaid
classDiagram
    namespace lib {
        class CopyTargets {
            +COPY_TARGET_PROFILES
            +copyTargetProfile()
        }
        class CopyDocument {
            +prepareDocument()
            +styleDiagramFigure()
        }
    }
    CopyDocument --> CopyTargets : reads profile
\`\`\`

## Cynefin (11.16)

\`\`\`mermaid
cynefin-beta
  title Where the remaining work sits
  clear
    "Restyle the copy button"
  complicated
    "Tune PNG export widths"
  complex
    "Outlook blocks base64 images"
  chaotic
    "Deploy broke the live site"
\`\`\`

## Swimlane (11.16)

Flowchart syntax with a dedicated orthogonal lane layout.

\`\`\`mermaid
swimlane-beta
  subgraph Author
    A[Write markdown]
    D[Paste into email]
  end
  subgraph App
    B[Render preview]
    C[Build target HTML]
  end
  A --> B --> C --> D
\`\`\`

## Railroad / EBNF (11.16)

\`\`\`mermaid
railroad-ebnf-beta
  block = "{" , statement , { statement } , "}" ;
\`\`\`

## Self-loops as a single path (11.16)

\`\`\`mermaid
flowchart TD
    A[Retry with backoff] --> A
    A --> B[Give up]
\`\`\`
`;

export const TABS: SampleTab[] = [
  { id: 'main', label: 'Basic', defaultContent: mainMarkdown, storageKey: 'md-mermaid-content-main' },
  { id: 'large', label: 'Large flow', defaultContent: largeFlowMarkdown, storageKey: 'md-mermaid-content-large' },
  { id: 'gallery', label: 'Gallery', defaultContent: galleryMarkdown, storageKey: 'md-mermaid-content-gallery' },
  { id: 'charts', label: 'Charts', defaultContent: chartsMarkdown, storageKey: 'md-mermaid-content-charts' },
  { id: 'modern', label: 'New in v11', defaultContent: modernMarkdown, storageKey: 'md-mermaid-content-modern' },
];
