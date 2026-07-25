import { describe, it, expect } from 'vitest';
import {
  autoWrapLinesByBoxWidth,
  decodeHtmlEntities,
  escapeXml,
  transformSvgForExport,
  wrapSingleLineByWords,
} from './svgExport';

const OPTS = { fontPx: 14, wrapAggressiveness: 'normal' as const };

/** Minimal stand-in for what mermaid emits around a node label. */
function nodeLabel(text: string, { w = 200, h = 30 } = {}): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg"><g class="node"><g class="label">` +
    `<rect x="0" y="0" width="${w}" height="${h}"/>` +
    `<foreignObject x="10" y="20" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel"><p>${text}</p></span></div>` +
    `</foreignObject></g></g></svg>`
  );
}

function edgeLabel(text: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg"><g class="edgeLabel"><g class="label edgeLabel">` +
    `<foreignObject x="50" y="60" width="80" height="24">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg"><span class="edgeLabel">${text}</span></div>` +
    `</foreignObject></g></g></svg>`
  );
}

function textContentOf(svg: string): string {
  return [...svg.matchAll(/<tspan[^>]*>([\s\S]*?)<\/tspan>/g)].map((m) => m[1]).join('|');
}

describe('escapeXml', () => {
  it('escapes the five XML metacharacters', () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe(
      'a &amp; b &lt; c &gt; d &quot; e &apos; f',
    );
  });

  it('escapes ampersands before the entities they would create', () => {
    expect(escapeXml('&lt;')).toBe('&amp;lt;');
  });

  it('leaves unicode and emoji alone', () => {
    expect(escapeXml('日本語 🚀')).toBe('日本語 🚀');
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes named entities', () => {
    expect(decodeHtmlEntities('Setup &amp; init')).toBe('Setup & init');
    expect(decodeHtmlEntities('&lt;div&gt;')).toBe('<div>');
    expect(decodeHtmlEntities('&quot;x&quot;')).toBe('"x"');
    expect(decodeHtmlEntities('&#39;a&#39;')).toBe("'a'");
    expect(decodeHtmlEntities('&apos;a&apos;')).toBe("'a'");
  });

  it('decodes numeric and hex entities', () => {
    expect(decodeHtmlEntities('&#8212;')).toBe('—');
    expect(decodeHtmlEntities('&#x2014;')).toBe('—');
    expect(decodeHtmlEntities('&#x1F680;')).toBe('🚀');
  });

  it('turns a non-breaking space into a normal one', () => {
    expect(decodeHtmlEntities('a&nbsp;b')).toBe('a b');
  });

  it('does not over-decode a double-escaped entity', () => {
    // The author wrote a literal "&lt;", which must survive as text.
    expect(decodeHtmlEntities('&amp;lt;')).toBe('&lt;');
  });

  it('drops out-of-range code points instead of throwing', () => {
    expect(decodeHtmlEntities('&#1114112;')).toBe('');
    expect(decodeHtmlEntities('&#x110000;')).toBe('');
  });

  it('round-trips through escapeXml', () => {
    const original = 'a & b < c';
    expect(decodeHtmlEntities(escapeXml(original))).toBe(original);
  });
});

describe('wrapSingleLineByWords', () => {
  it('returns nothing for blank input', () => {
    expect(wrapSingleLineByWords('', 10)).toEqual([]);
    expect(wrapSingleLineByWords('   ', 10)).toEqual([]);
  });

  it('keeps a short line intact', () => {
    expect(wrapSingleLineByWords('one two', 20)).toEqual(['one two']);
  });

  it('wraps at the budget', () => {
    expect(wrapSingleLineByWords('aa bb cc', 5)).toEqual(['aa bb', 'cc']);
  });

  it('collapses runs of whitespace', () => {
    expect(wrapSingleLineByWords('a\t\t b  \n c', 40)).toEqual(['a b c']);
  });

  it('hard-breaks a word longer than the budget instead of overflowing', () => {
    const result = wrapSingleLineByWords('Supercalifragilisticexpialidocious', 10);
    expect(result.every((l) => l.length <= 10)).toBe(true);
    expect(result.join('')).toBe('Supercalifragilisticexpialidocious');
  });

  it('keeps a long word and its neighbours in order', () => {
    const result = wrapSingleLineByWords('see https://example.com/a/very/long/path now', 12);
    expect(result.every((l) => l.length <= 12)).toBe(true);
    expect(result.join(' ').replace(/\s+/g, '')).toBe(
      'seehttps://example.com/a/very/long/pathnow'.replace(/\s+/g, ''),
    );
  });

  it('survives a degenerate budget', () => {
    expect(wrapSingleLineByWords('abc', 0)).toEqual(['a', 'b', 'c']);
    expect(wrapSingleLineByWords('abc', -5)).toEqual(['a', 'b', 'c']);
  });
});

describe('autoWrapLinesByBoxWidth', () => {
  it('leaves authored line breaks alone in a wide box', () => {
    const lines = ['short one', 'short two'];
    expect(autoWrapLinesByBoxWidth(lines, 4000, 14, 'normal')).toEqual(lines);
  });

  it('still breaks an unbreakable word once it exceeds even a wide box', () => {
    // A 4000px box fits roughly 585 characters, so the word has to beat that
    // before wrapping is the right answer.
    const long = 'x'.repeat(2000);
    const out = autoWrapLinesByBoxWidth([long], 4000, 14, 'normal');
    expect(out.length).toBeGreaterThan(1);
    expect(out.join('')).toBe(long);
  });

  it('leaves a long word alone while it still fits the box', () => {
    const fits = 'x'.repeat(300);
    expect(autoWrapLinesByBoxWidth([fits], 4000, 14, 'normal')).toEqual([fits]);
  });

  it('wraps more aggressively as the mode tightens', () => {
    const line = 'the quick brown fox jumps over the lazy dog again and again';
    const compact = autoWrapLinesByBoxWidth([line], 160, 14, 'compact').length;
    const wide = autoWrapLinesByBoxWidth([line], 160, 14, 'wide').length;
    expect(compact).toBeGreaterThanOrEqual(wide);
  });

  it('handles a zero-width box without producing empty lines', () => {
    const out = autoWrapLinesByBoxWidth(['alpha beta gamma'], 0, 14, 'normal');
    expect(out.every((l) => l.length > 0)).toBe(true);
  });
});

describe('transformSvgForExport', () => {
  it('leaves no foreignObject behind — canvas taint is the whole point', () => {
    const out = transformSvgForExport(nodeLabel('Hello'), OPTS);
    expect(out).not.toContain('foreignObject');
    expect(out).toContain('<text');
  });

  it('adds the SVG namespace when it is missing', () => {
    const out = transformSvgForExport('<svg><g/></svg>', OPTS);
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('emits exactly one text element per label', () => {
    const out = transformSvgForExport(nodeLabel('Hello'), OPTS);
    expect([...out.matchAll(/<text\b/g)]).toHaveLength(1);
  });

  it('preserves every <br> spelling as a separate line', () => {
    const out = transformSvgForExport(nodeLabel('one<br/>two<br>three<br />four'), OPTS);
    expect(textContentOf(out)).toBe('one|two|three|four');
  });

  it('decodes entities once and re-escapes for XML', () => {
    const out = transformSvgForExport(nodeLabel('Setup &amp; init'), OPTS);
    expect(textContentOf(out)).toBe('Setup &amp; init');
    expect(out).not.toContain('&amp;amp;');
  });

  it('keeps unicode and emoji intact', () => {
    const out = transformSvgForExport(nodeLabel('日本語 🚀 한국어'), OPTS);
    expect(textContentOf(out)).toBe('日本語 🚀 한국어');
  });

  it('drops an empty label rather than emitting a stray text node', () => {
    // Mermaid emits one foreignObject per edge, empty for unlabelled ones.
    expect(transformSvgForExport(nodeLabel(''), OPTS)).not.toContain('<text');
    expect(transformSvgForExport(nodeLabel('   '), OPTS)).not.toContain('<text');
    expect(transformSvgForExport(nodeLabel('<br/><br/>'), OPTS)).not.toContain('<text');
  });

  it('gives edge labels a backing rect and node labels none', () => {
    const edge = transformSvgForExport(edgeLabel('yes'), OPTS);
    expect([...edge.matchAll(/<rect\b/g)].length).toBe(2);

    const node = transformSvgForExport(nodeLabel('plain'), OPTS);
    expect(node).not.toContain('<rect');
  });

  it('strips the node label backing rect in both self-closing and paired forms', () => {
    const paired =
      '<svg><g class="label"><rect x="0" y="0" width="10" height="10"></rect>' +
      '<foreignObject x="0" y="0" width="80" height="20"><div>hi</div></foreignObject></g></svg>';
    expect(transformSvgForExport(paired, OPTS)).not.toContain('<rect');
  });

  it('normalises every font-size attribute to the requested size', () => {
    const svg =
      '<svg><text font-size="12">a</text><text font-size="27.5px">b</text>' +
      '<text font-size="9">c</text></svg>';
    const out = transformSvgForExport(svg, { ...OPTS, fontPx: 16 });
    expect([...out.matchAll(/font-size="16"/g)]).toHaveLength(3);
    expect(out).not.toMatch(/font-size="(12|27\.5px|9)"/);
  });

  it('does not touch font-size inside a style block', () => {
    const svg = '<svg><style>.x { font-size: 11px; }</style><text font-size="12">a</text></svg>';
    const out = transformSvgForExport(svg, { ...OPTS, fontPx: 16 });
    expect(out).toContain('font-size: 11px');
    expect(out).toContain('font-size="16"');
  });

  it('centres a multi-line label around the box centre', () => {
    const out = transformSvgForExport(nodeLabel('one<br/>two', { w: 100, h: 40 }), OPTS);
    const x = Number(/<text x="([\d.]+)"/.exec(out)![1]);
    // foreignObject is at x=10 with width=100, so the centre is 60.
    expect(x).toBeCloseTo(60, 5);
    const dys = [...out.matchAll(/dy="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(dys).toEqual([0, 14 * 1.2]);
  });

  it('handles a label containing angle brackets without breaking the markup', () => {
    const out = transformSvgForExport(nodeLabel('a &lt;b&gt; c'), OPTS);
    expect(textContentOf(out)).toBe('a &lt;b&gt; c');
    expect(out).not.toContain('foreignObject');
  });

  it('is idempotent — a second pass changes nothing', () => {
    const once = transformSvgForExport(nodeLabel('Setup &amp; init'), OPTS);
    expect(transformSvgForExport(once, OPTS)).toBe(once);
  });

  it('reproduces the preview faithfully rather than repairing mermaid quirks', () => {
    // mermaid itself mangles numeric character references typed into a label:
    // `&#39;` reaches the DOM as `&'`. The export must show what the preview
    // shows, so this passes through untouched instead of being "fixed" — a PNG
    // that disagrees with the preview is worse than one that matches it.
    const out = transformSvgForExport(nodeLabel(`He said "hi" and &amp;'bye&amp;'`), OPTS);
    expect(textContentOf(out)).toBe('He said &quot;hi&quot; and &amp;&apos;bye&amp;&apos;');
  });

  it('handles an svg with no labels at all', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10"/></svg>';
    expect(transformSvgForExport(svg, OPTS)).toBe(svg);
  });

  it('does not choke on a missing width/height attribute', () => {
    const svg =
      '<svg><g class="node"><foreignObject><div>label</div></foreignObject></g></svg>';
    const out = transformSvgForExport(svg, OPTS);
    expect(out).toContain('<text');
    expect(out).not.toContain('NaN');
  });
});
