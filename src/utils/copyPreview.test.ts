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
import { copyTargetProfile } from '../lib/copyTargets';
import type { CopyTarget } from '../lib/copyTargets';

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

  it('honours a tighter per-target render cap', () => {
    expect(targetExportWidth(20000, 2400)).toBe(2400);
    expect(targetExportWidth(3000, 2400)).toBe(Math.round(3000 * 0.8));
  });

  it('ignores a cap wider than the absolute maximum, or a zero cap', () => {
    expect(targetExportWidth(20000, 99999)).toBe(ABSOLUTE_MAX_PNG_WIDTH);
    expect(targetExportWidth(20000, 0)).toBe(ABSOLUTE_MAX_PNG_WIDTH);
  });

  it('is continuous and never exceeds the absolute maximum across the range', () => {
    for (let w = 1; w <= 12000; w += 7) {
      const result = targetExportWidth(w);
      expect(Number.isFinite(result), `width ${w}`).toBe(true);
      expect(result, `width ${w}`).toBeGreaterThanOrEqual(MIN_PNG_WIDTH);
      expect(result, `width ${w}`).toBeLessThanOrEqual(ABSOLUTE_MAX_PNG_WIDTH);
      expect(Number.isInteger(result), `width ${w}`).toBe(true);
    }
  });

  it('pins the documented boundaries', () => {
    expect(targetExportWidth(379)).toBe(Math.max(MIN_PNG_WIDTH, Math.round(379 * 0.72)));
    expect(targetExportWidth(380)).toBe(Math.round(380 * 0.88));
    expect(targetExportWidth(MAX_PNG_WIDTH)).toBe(Math.round(MAX_PNG_WIDTH * 0.88));
    expect(targetExportWidth(MAX_PNG_WIDTH + 1)).toBe(MAX_PNG_WIDTH);
    expect(targetExportWidth(LARGE_DIAGRAM_THRESHOLD + 1)).toBe(
      Math.round((LARGE_DIAGRAM_THRESHOLD + 1) * 0.8),
    );
  });

  it('never returns a width below the floor for tiny diagrams', () => {
    for (const w of [1, 10, 100, 200, 333]) {
      expect(targetExportWidth(w), `width ${w}`).toBeGreaterThanOrEqual(MIN_PNG_WIDTH);
    }
  });

  it('applies a tighter cap only where it actually binds', () => {
    // Below the cap the per-target limit must not distort the normal curve.
    expect(targetExportWidth(500, 2400)).toBe(targetExportWidth(500));
    expect(targetExportWidth(1200, 2400)).toBe(targetExportWidth(1200));
    // Above it, the cap wins.
    expect(targetExportWidth(9000, 2400)).toBe(2400);
  });

  it('handles non-finite input without producing NaN', () => {
    expect(targetExportWidth(Number.NaN)).toBe(MIN_PNG_WIDTH);
    expect(Number.isFinite(targetExportWidth(Number.POSITIVE_INFINITY))).toBe(true);
  });
});

describe('per-target export width', () => {
  // The display cap and the render cap are different knobs: the PNG stays
  // high-resolution while the <img> is sized down for the target.
  const cases: { target: CopyTarget; intrinsic: number; maxRender: number }[] = [
    { target: 'email', intrinsic: 9000, maxRender: 2400 },
    { target: 'confluence', intrinsic: 9000, maxRender: 3600 },
    { target: 'rich', intrinsic: 9000, maxRender: 6000 },
  ];

  it.each(cases)('caps $target renders at $maxRender', ({ target, intrinsic, maxRender }) => {
    const profile = copyTargetProfile(target);
    expect(profile.maxRenderWidth).toBe(maxRender);
    expect(targetExportWidth(intrinsic, profile.maxRenderWidth)).toBe(maxRender);
  });

  it('always renders at least as wide as it displays', () => {
    // A PNG narrower than its display width would be visibly soft.
    for (const target of ['rich', 'email', 'confluence'] as const) {
      const profile = copyTargetProfile(target);
      expect(profile.maxRenderWidth, target).toBeGreaterThanOrEqual(profile.maxImageWidth);
    }
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
