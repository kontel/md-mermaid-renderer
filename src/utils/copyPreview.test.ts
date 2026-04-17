import { describe, it, expect } from 'vitest';
import {
  targetExportWidth,
  escapeXml,
  decodeHtmlEntities,
  wrapSingleLineByWords,
  MIN_PNG_WIDTH,
  MAX_PNG_WIDTH,
  LARGE_DIAGRAM_THRESHOLD,
  ABSOLUTE_MAX_PNG_WIDTH,
} from './copyPreview';

describe('targetExportWidth', () => {
  it('returns MIN_PNG_WIDTH for zero or negative', () => {
    expect(targetExportWidth(0)).toBe(MIN_PNG_WIDTH);
    expect(targetExportWidth(-100)).toBe(MIN_PNG_WIDTH);
  });

  it('scales small diagrams down', () => {
    expect(targetExportWidth(200)).toBeGreaterThanOrEqual(MIN_PNG_WIDTH);
    expect(targetExportWidth(300)).toBe(Math.max(MIN_PNG_WIDTH, Math.round(300 * 0.72)));
  });

  it('caps typical diagrams at MAX_PNG_WIDTH', () => {
    expect(targetExportWidth(800)).toBe(MAX_PNG_WIDTH);
    expect(targetExportWidth(1000)).toBe(MAX_PNG_WIDTH);
    expect(targetExportWidth(LARGE_DIAGRAM_THRESHOLD)).toBe(MAX_PNG_WIDTH);
  });

  it('scales mid-range by 0.88', () => {
    const w = 400;
    expect(targetExportWidth(w)).toBe(Math.round(w * 0.88));
  });

  it('grows past MAX_PNG_WIDTH for large/complex diagrams', () => {
    const w = 3000;
    expect(targetExportWidth(w)).toBe(Math.round(w * 0.80));
    expect(targetExportWidth(w)).toBeGreaterThan(MAX_PNG_WIDTH);
  });

  it('caps very large diagrams at ABSOLUTE_MAX_PNG_WIDTH', () => {
    expect(targetExportWidth(9289)).toBe(ABSOLUTE_MAX_PNG_WIDTH);
    expect(targetExportWidth(20000)).toBe(ABSOLUTE_MAX_PNG_WIDTH);
  });
});

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
