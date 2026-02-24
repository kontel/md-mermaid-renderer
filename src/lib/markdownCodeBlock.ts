/**
 * Parse react-markdown code block props into language, content, and inline flag.
 * Pure function for testable code-block routing.
 */
export interface ParsedCodeBlock {
  language: string;
  codeContent: string;
  isInline: boolean;
}

export function parseCodeBlock(className: string | undefined, children: unknown): ParsedCodeBlock {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');
  const isInline = !className && !codeContent.includes('\n');

  return { language, codeContent, isInline };
}

export function isMermaidBlock(parsed: ParsedCodeBlock): boolean {
  return parsed.language === 'mermaid';
}
