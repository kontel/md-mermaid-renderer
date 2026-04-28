import { useMemo, useRef } from 'react';

type Token = { text: string; cls?: string };

const INLINE_RE = /(`[^`\n]*`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]\n]+\]\([^)\n]+\))/g;

const MERMAID_RE =
  /\b(flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|graph|subgraph|end|participant|class|note|loop|alt|else|opt|par|and|LR|RL|TD|TB|BT)\b|(-\.->|-->>|-->|->>|<<\-|<\-|==>|--x|-\.-)/g;

function tokenizeInline(line: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index) });
    if (m[1]) out.push({ text: m[1], cls: 'tk-code-inline' });
    else if (m[2] || m[3] || m[4]) out.push({ text: m[0], cls: 'tk-emph' });
    else if (m[5]) out.push({ text: m[0], cls: 'tk-link' });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out;
}

function tokenizeMarkdownLine(line: string): Token[] {
  const h = line.match(/^(#{1,6})(\s+)(.*)$/);
  if (h) {
    return [
      { text: h[1], cls: 'tk-punct' },
      { text: h[2] },
      { text: h[3], cls: 'tk-heading' },
    ];
  }
  const bq = line.match(/^(\s*>)(.*)$/);
  if (bq) return [{ text: bq[1], cls: 'tk-punct' }, ...tokenizeInline(bq[2])];

  const li = line.match(/^(\s*)([-*+]|\d+\.)(\s.*)$/);
  if (li) {
    return [
      { text: li[1] },
      { text: li[2], cls: 'tk-punct' },
      ...tokenizeInline(li[3]),
    ];
  }

  const hr = line.match(/^\s*(---+|\*\*\*+|___+)\s*$/);
  if (hr) return [{ text: line, cls: 'tk-punct' }];

  const table = line.match(/^\s*\|.*\|\s*$/);
  if (table) return [{ text: line, cls: 'tk-punct-soft' }];

  return tokenizeInline(line);
}

function tokenizeMermaid(line: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MERMAID_RE.lastIndex = 0;
  while ((m = MERMAID_RE.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), cls: 'tk-code' });
    if (m[1]) out.push({ text: m[0], cls: 'tk-keyword' });
    else if (m[2]) out.push({ text: m[0], cls: 'tk-arrow' });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), cls: 'tk-code' });
  return out;
}

function tokenize(md: string): Token[] {
  const out: Token[] = [];
  const lines = md.split('\n');
  let inFence = false;
  let fenceLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLast = i === lines.length - 1;

    const fence = line.match(/^(\s*)(`{3,}|~{3,})(\w*)\s*$/);
    if (fence) {
      out.push({ text: line, cls: 'tk-fence' });
      if (!inFence) {
        inFence = true;
        fenceLang = fence[3];
      } else {
        inFence = false;
        fenceLang = '';
      }
    } else if (inFence) {
      if (fenceLang === 'mermaid') out.push(...tokenizeMermaid(line));
      else out.push({ text: line, cls: 'tk-code' });
    } else {
      out.push(...tokenizeMarkdownLine(line));
    }

    if (!isLast) out.push({ text: '\n' });
  }

  return out;
}

interface HighlightedEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function HighlightedEditor({ value, onChange, placeholder }: HighlightedEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const tokens = useMemo(() => tokenize(value), [value]);

  const syncScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="editor-wrap">
      <pre className="editor-hl" ref={preRef} aria-hidden="true">
        {tokens.map((t, i) =>
          t.cls ? (
            <span key={i} className={t.cls}>
              {t.text}
            </span>
          ) : (
            <span key={i}>{t.text}</span>
          ),
        )}
        {value.endsWith('\n') && '\u200b'}
      </pre>
      <textarea
        ref={textareaRef}
        className="editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        spellCheck={false}
      />
    </div>
  );
}
