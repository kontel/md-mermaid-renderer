import { describe, it, expect } from 'vitest';
import { escapeXml, decodeHtmlEntities, wrapSingleLineByWords } from './copyPreview';

describe('escapeXml', () => {
  it('escapes ampersand and angle brackets', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b');
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeXml("'apos'")).toBe('&apos;apos&apos;');
  });
  it('handles empty string', () => {
    expect(escapeXml('')).toBe('');
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes common entities', () => {
    expect(decodeHtmlEntities('&amp;')).toBe('&');
    expect(decodeHtmlEntities('&lt;div&gt;')).toBe('<div>');
    expect(decodeHtmlEntities('&quot;x&quot;')).toBe('"x"');
    expect(decodeHtmlEntities('&#39;')).toBe("'");
  });
  it('handles empty string', () => {
    expect(decodeHtmlEntities('')).toBe('');
  });
});

describe('wrapSingleLineByWords', () => {
  it('returns empty array for empty line', () => {
    expect(wrapSingleLineByWords('', 10)).toEqual([]);
    expect(wrapSingleLineByWords('   ', 10)).toEqual([]);
  });

  it('keeps short line as single segment', () => {
    expect(wrapSingleLineByWords('short', 20)).toEqual(['short']);
    expect(wrapSingleLineByWords('one two', 20)).toEqual(['one two']);
  });

  it('wraps long line by max chars', () => {
    const result = wrapSingleLineByWords('one two three four', 6);
    expect(result).toEqual(['one', 'two', 'three', 'four']);
  });

  it('splits on spaces only', () => {
    const result = wrapSingleLineByWords('aa bb cc', 5);
    expect(result).toEqual(['aa bb', 'cc']);
  });
});
