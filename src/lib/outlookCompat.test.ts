import { describe, it, expect } from 'vitest';
import { auditOutlookHtml, formatOutlookReport, outlookErrors } from './outlookCompat';
import { prepareDocument, styleDiagramFigure } from './copyDocument';
import { copyTargetProfile } from './copyTargets';

function bodyFrom(html: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'markdown-body';
  root.innerHTML = html;
  return root;
}

/** A document with the pieces that have historically broken in Word. */
function representativeDocument(): HTMLElement {
  const root = bodyFrom(`
    <h1>Title</h1>
    <p>Some prose with <code class="inline-code">inline</code> code.</p>
    <ul><li>first</li><li>second</li></ul>
    <blockquote>quoted</blockquote>
    <pre class="code-block"><code class="language-ts">const x = 1;</code></pre>
    <table><thead><tr><th>H</th></tr></thead>
      <tbody><tr><td>one</td></tr><tr><td>two</td></tr></tbody></table>
    <div class="mermaid-block"><div class="mermaid-container"></div></div>
  `);

  const container = root.querySelector<HTMLElement>('.mermaid-container')!;
  const img = document.createElement('img');
  img.src = 'data:image/png;base64,AAAA';
  img.alt = 'Diagram: Title';
  container.appendChild(img);
  styleDiagramFigure(container, img, copyTargetProfile('email'), 1200, 800);
  return root;
}

describe('auditOutlookHtml', () => {
  it('flags a unitless line-height beside mso-line-height-rule', () => {
    // The bug that made Outlook paste look broken while Gmail looked fine.
    const root = bodyFrom('<p style="line-height:1.65;mso-line-height-rule:exactly">x</p>');
    const issues = outlookErrors(root);
    expect(issues.map((i) => i.rule)).toContain('mso-line-height-needs-absolute-unit');
  });

  it('accepts an absolute line-height', () => {
    const root = bodyFrom('<p style="line-height:25px;mso-line-height-rule:exactly">x</p>');
    expect(outlookErrors(root)).toEqual([]);
  });

  it('flags an image with no width attribute', () => {
    const root = bodyFrom('<img src="x.png" style="max-width:100%">');
    expect(outlookErrors(root).map((i) => i.rule)).toContain('img-needs-width-attribute');
  });

  it('flags flex, grid and absolute positioning', () => {
    const root = bodyFrom(
      '<div style="display:flex"></div><div style="display:grid"></div>' +
        '<div style="position:absolute"></div>',
    );
    const rules = outlookErrors(root).map((i) => i.rule);
    expect(rules.filter((r) => r === 'unsupported-display')).toHaveLength(2);
    expect(rules).toContain('unsupported-position');
  });

  it('warns about a CSS-only table width and a missing bgcolor', () => {
    const root = bodyFrom(
      '<table style="width:100%"><tbody><tr style="background-color:#f9fafb"><td>x</td></tr></tbody></table>',
    );
    const rules = auditOutlookHtml(root).map((i) => i.rule);
    expect(rules).toContain('table-width-needs-attribute');
    expect(rules).toContain('table-bgcolor-needs-attribute');
  });

  it('reads clean when nothing is wrong', () => {
    const root = bodyFrom('<p style="line-height:25px">fine</p>');
    expect(formatOutlookReport(auditOutlookHtml(root))).toMatch(/No known Outlook/);
  });
});

describe('the email profile against the Word engine', () => {
  it('produces no Outlook errors for a representative document', () => {
    const root = representativeDocument();
    prepareDocument(root, copyTargetProfile('email'));

    const issues = outlookErrors(root);
    expect(formatOutlookReport(issues)).toBe('No known Outlook/Word issues found.');
  });

  it('states both image dimensions so Word cannot rescale by DPI', () => {
    const root = representativeDocument();
    prepareDocument(root, copyTargetProfile('email'));

    const img = root.querySelector('img')!;
    expect(img.getAttribute('width')).toBe('600');
    // 1200x800 capped to 600 wide keeps the 2:3 ratio.
    expect(img.getAttribute('height')).toBe('400');
    expect(img.getAttribute('style')).toContain('width:600px');
    expect(img.getAttribute('style')).toContain('height:400px');
  });

  it('rehouses the diagram card in a table Word can lay out', () => {
    const root = representativeDocument();
    prepareDocument(root, copyTargetProfile('email'));

    const img = root.querySelector('img')!;
    const cell = img.closest('td');
    expect(cell).not.toBeNull();
    expect(cell!.getAttribute('align')).toBe('center');
    expect(cell!.getAttribute('style')).toContain('border:1px solid');
    expect(cell!.closest('table')!.getAttribute('align')).toBe('center');
  });

  it('mirrors table backgrounds onto bgcolor', () => {
    const root = representativeDocument();
    prepareDocument(root, copyTargetProfile('email'));

    expect(root.querySelector('th')!.getAttribute('bgcolor')).toBe('#f6f8fa');
    expect(root.querySelectorAll('tbody tr')[1].getAttribute('bgcolor')).toBe('#f9fafb');
  });

  it('gives tables a width attribute alongside the CSS', () => {
    const root = representativeDocument();
    prepareDocument(root, copyTargetProfile('email'));

    const contentTable = [...root.querySelectorAll('table')].find((t) => t.querySelector('th'))!;
    expect(contentTable.getAttribute('width')).toBe('100%');
  });

  it('never pairs the mso rule with a relative line-height in a single rule', () => {
    // A rule may set the mso flag and leave the length to a more specific rule
    // (headings do this), but the two must never disagree within one rule.
    const profile = copyTargetProfile('email');
    for (const css of [profile.rootStyle, ...profile.rules.map(([, c]) => c)]) {
      if (!css.includes('mso-line-height-rule')) continue;
      const lh = /line-height:\s*([^;]+)/.exec(css)?.[1];
      if (lh === undefined) continue;
      expect(lh, `"${css}" needs px or pt`).toMatch(/^\d+(\.\d+)?(px|pt)$/);
    }
  });

  it('resolves an absolute line-height on every heading level', () => {
    // The mso flag comes from the shared heading rule, the length from the
    // per-level one; only the merged element proves they meet.
    const root = bodyFrom('<h1>a</h1><h2>b</h2><h3>c</h3><h4>d</h4><h5>e</h5><h6>f</h6>');
    prepareDocument(root, copyTargetProfile('email'));

    for (const h of root.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      const style = h.getAttribute('style') ?? '';
      expect(style, h.tagName).toContain('mso-line-height-rule');
      expect(/line-height:\s*(\d+(\.\d+)?(px|pt))/.exec(style)?.[1], h.tagName).toBeDefined();
    }
    expect(outlookErrors(root)).toEqual([]);
  });

  it('leaves the other targets alone', () => {
    // Only the email profile pays the Word tax.
    for (const target of ['rich', 'confluence'] as const) {
      expect(copyTargetProfile(target).outlookCompat, target).toBe(false);
    }
  });
});
