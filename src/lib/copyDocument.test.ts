import { describe, it, expect } from 'vitest';
import {
  applyProfile,
  diagramAltText,
  mergeStyle,
  parseStyleText,
  prepareDocument,
  serializeStyle,
  styleDiagramFigure,
} from './copyDocument';
import { copyTargetProfile } from './copyTargets';

function bodyFrom(html: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'markdown-body';
  root.innerHTML = html;
  return root;
}

describe('parseStyleText / serializeStyle', () => {
  it('round-trips declarations', () => {
    const parsed = parseStyleText('color:red; margin:0 0 16px');
    expect(parsed.get('color')).toBe('red');
    expect(parsed.get('margin')).toBe('0 0 16px');
    expect(serializeStyle(parsed)).toBe('color:red;margin:0 0 16px');
  });

  it('ignores malformed fragments', () => {
    expect(parseStyleText('color;;:;padding:4px').get('padding')).toBe('4px');
    expect(parseStyleText('').size).toBe(0);
  });
});

describe('mergeStyle', () => {
  it('keeps existing declarations and lets later ones win', () => {
    const el = document.createElement('p');
    el.setAttribute('style', 'color:red;margin:4px');
    mergeStyle(el, 'margin:0 0 16px;line-height:1.65');
    expect(el.getAttribute('style')).toBe('color:red;margin:0 0 16px;line-height:1.65');
  });

  it('preserves vendor properties the CSSOM would drop', () => {
    const el = document.createElement('p');
    mergeStyle(el, 'mso-line-height-rule:exactly');
    expect(el.getAttribute('style')).toContain('mso-line-height-rule:exactly');
  });

  it('is a no-op for empty CSS', () => {
    const el = document.createElement('p');
    mergeStyle(el, '');
    expect(el.hasAttribute('style')).toBe(false);
  });
});

describe('applyProfile', () => {
  it('gives blocks explicit spacing so the target cannot collapse it', () => {
    const root = bodyFrom('<p>one</p><ul><li>a</li></ul><blockquote>q</blockquote>');
    applyProfile(root, copyTargetProfile('email'));

    expect(root.getAttribute('style')).toContain('line-height:1.65');
    expect(root.querySelector('p')!.getAttribute('style')).toContain('margin:0 0 16px');
    expect(root.querySelector('ul')!.getAttribute('style')).toContain('padding-left:26px');
    expect(root.querySelector('li')!.getAttribute('style')).toContain('margin:0 0 8px');
    expect(root.querySelector('blockquote')!.getAttribute('style')).toContain('border-left');
  });

  it('applies later rules over earlier ones', () => {
    const root = bodyFrom('<h1>Title</h1>');
    applyProfile(root, copyTargetProfile('email'));
    const style = root.querySelector('h1')!.getAttribute('style')!;
    // The shared heading rule sets colour; the h1 rule adds its own size on top.
    expect(style).toContain('color:#111827');
    expect(style).toContain('font-size:24px');
  });

  it('stripes even rows only for targets that keep backgrounds', () => {
    const html = '<table><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table>';

    const striped = bodyFrom(html);
    applyProfile(striped, copyTargetProfile('email'));
    expect(striped.querySelectorAll('tr')[1].getAttribute('style')).toContain('background-color');

    const plain = bodyFrom(html);
    applyProfile(plain, copyTargetProfile('confluence'));
    expect(plain.querySelectorAll('tr')[1].getAttribute('style') ?? '').not.toContain('background-color');
  });
});

describe('prepareDocument', () => {
  it('adds Outlook table attributes for email only', () => {
    const email = bodyFrom('<table><tbody><tr><td>1</td></tr></tbody></table>');
    prepareDocument(email, copyTargetProfile('email'));
    expect(email.querySelector('table')!.getAttribute('cellpadding')).toBe('0');

    const rich = bodyFrom('<table><tbody><tr><td>1</td></tr></tbody></table>');
    prepareDocument(rich, copyTargetProfile('rich'));
    expect(rich.querySelector('table')!.hasAttribute('cellpadding')).toBe(false);
  });

  it('trims the outer margins so pasted content sits flush', () => {
    const root = bodyFrom('<h1>Title</h1><p>body</p>');
    prepareDocument(root, copyTargetProfile('email'));
    expect(root.firstElementChild!.getAttribute('style')).toContain('margin-top:0');
    expect(root.lastElementChild!.getAttribute('style')).toContain('margin-bottom:0');
  });

  it('flattens diagram wrappers and drops presentational classes for confluence', () => {
    const root = bodyFrom(
      '<div class="mermaid-block"><div class="mermaid-container"><img src="x"></div></div>',
    );
    prepareDocument(root, copyTargetProfile('confluence'));

    expect(root.querySelector('.mermaid-block')).toBeNull();
    expect(root.querySelector('div')).toBeNull();
    expect(root.querySelector('p > img')).not.toBeNull();
  });

  it('keeps language classes so the confluence code macro can highlight', () => {
    const root = bodyFrom('<pre class="code-block"><code class="language-ts">x</code></pre>');
    prepareDocument(root, copyTargetProfile('confluence'));
    expect(root.querySelector('code')!.getAttribute('class')).toBe('language-ts');
    expect(root.querySelector('pre')!.hasAttribute('class')).toBe(false);
  });

  it('keeps figure spacing when the wrapper became a tag the profile also styles', () => {
    const root = bodyFrom('<p>intro</p><div class="mermaid-container"><img src="x"></div>');
    const confluence = copyTargetProfile('confluence');
    const container = root.querySelector<HTMLElement>('.mermaid-container')!;

    styleDiagramFigure(container, root.querySelector('img')!, confluence, 400);
    prepareDocument(root, confluence);

    const figure = root.querySelector('img')!.parentElement!;
    expect(figure.tagName).toBe('P');
    // The paragraph rule must not overwrite the figure's own margin.
    expect(figure.getAttribute('style')).toContain('margin:16px 0');
    expect(figure.hasAttribute('data-copy-figure')).toBe(false);
  });

  it('leaves classes alone for targets that keep CSS', () => {
    const root = bodyFrom('<pre class="code-block"><code>x</code></pre>');
    prepareDocument(root, copyTargetProfile('rich'));
    expect(root.querySelector('pre')!.getAttribute('class')).toBe('code-block');
  });
});

describe('styleDiagramFigure', () => {
  function figure() {
    const container = document.createElement('div');
    container.className = 'mermaid-container';
    container.setAttribute('style', 'display:flex;overflow:auto');
    const img = document.createElement('img');
    container.appendChild(img);
    return { container, img };
  }

  it('caps the display width without touching PNG resolution', () => {
    const { container, img } = figure();
    styleDiagramFigure(container, img, copyTargetProfile('email'), 2400);
    expect(img.getAttribute('width')).toBe('600');
    expect(img.getAttribute('style')).toContain('max-width:100%');
  });

  it('keeps a small diagram at its natural size', () => {
    const { container, img } = figure();
    styleDiagramFigure(container, img, copyTargetProfile('email'), 320);
    expect(img.getAttribute('width')).toBe('320');
  });

  it('replaces the preview layout styles with the target figure style', () => {
    const { container, img } = figure();
    styleDiagramFigure(container, img, copyTargetProfile('email'), 400);
    const style = container.getAttribute('style')!;
    expect(style).not.toContain('display:flex');
    expect(style).toContain('text-align:center');
  });

  it('retags the wrapper when the target wants a paragraph', () => {
    const { container, img } = figure();
    const parent = document.createElement('div');
    parent.appendChild(container);

    const result = styleDiagramFigure(container, img, copyTargetProfile('confluence'), 400);

    expect(result.tagName).toBe('P');
    expect(parent.querySelector('p > img')).toBe(img);
  });
});

describe('diagramAltText', () => {
  it('uses the nearest preceding heading', () => {
    const root = bodyFrom('<h2>Sequence Diagram</h2><p>intro</p><div class="mermaid-container"></div>');
    const container = root.querySelector('.mermaid-container')!;
    expect(diagramAltText(container, 0)).toBe('Diagram: Sequence Diagram');
  });

  it('walks up out of a wrapper to find the heading', () => {
    const root = bodyFrom('<h2>Flow</h2><div class="mermaid-block"><div class="mermaid-container"></div></div>');
    const container = root.querySelector('.mermaid-container')!;
    expect(diagramAltText(container, 0)).toBe('Diagram: Flow');
  });

  it('falls back to a numbered label', () => {
    const root = bodyFrom('<div class="mermaid-container"></div>');
    expect(diagramAltText(root.querySelector('.mermaid-container')!, 2)).toBe('Diagram 3');
  });
});
