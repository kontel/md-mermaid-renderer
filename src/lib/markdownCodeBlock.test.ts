import { describe, it, expect } from 'vitest';
import { parseCodeBlock, isMermaidBlock } from './markdownCodeBlock';

describe('parseCodeBlock', () => {
  it('extracts language from className', () => {
    expect(parseCodeBlock('language-js', 'const x = 1')).toEqual({
      language: 'js',
      codeContent: 'const x = 1',
      isInline: false,
    });
    expect(parseCodeBlock('language-mermaid', 'graph TD\nA-->B')).toEqual({
      language: 'mermaid',
      codeContent: 'graph TD\nA-->B',
      isInline: false,
    });
  });

  it('treats missing className as empty language', () => {
    expect(parseCodeBlock(undefined, 'hello')).toEqual({
      language: '',
      codeContent: 'hello',
      isInline: true,
    });
  });

  it('strips trailing newline from content', () => {
    const out = parseCodeBlock('language-ts', 'type X = 1\n');
    expect(out.codeContent).toBe('type X = 1');
  });

  it('marks inline when no className and no newline in content', () => {
    expect(parseCodeBlock(undefined, 'inline').isInline).toBe(true);
    expect(parseCodeBlock('language-js', 'code').isInline).toBe(false);
    expect(parseCodeBlock(undefined, 'line1\nline2').isInline).toBe(false);
  });
});

describe('isMermaidBlock', () => {
  it('returns true only when language is mermaid', () => {
    expect(isMermaidBlock({ language: 'mermaid', codeContent: 'graph TD', isInline: false })).toBe(true);
    expect(isMermaidBlock({ language: 'js', codeContent: 'x', isInline: false })).toBe(false);
    expect(isMermaidBlock({ language: '', codeContent: 'graph TD', isInline: true })).toBe(false);
  });
});
