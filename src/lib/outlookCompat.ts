/**
 * Static checks for Outlook's Word rendering engine.
 *
 * Outlook on Windows renders mail with Word, not a browser engine, and it fails
 * silently: no console, no error, just wrong output. These rules encode the
 * failures that have actually bitten this project, so they can be caught in CI
 * rather than by a recipient.
 *
 * This is a lint, not a renderer. A clean report means none of the known traps
 * are present — not that Word will look identical to Gmail.
 */

export type OutlookIssueSeverity = 'error' | 'warning';

export interface OutlookIssue {
  severity: OutlookIssueSeverity;
  rule: string;
  detail: string;
}

/** Word reads `mso-line-height-rule:exactly` as an absolute measure. */
const ABSOLUTE_LENGTH = /^\s*\d+(\.\d+)?\s*(px|pt)\s*$/i;

function declarations(el: Element): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of (el.getAttribute('style') ?? '').split(';')) {
    const i = part.indexOf(':');
    if (i === -1) continue;
    map.set(part.slice(0, i).trim().toLowerCase(), part.slice(i + 1).trim());
  }
  return map;
}

/**
 * Audit a prepared email document. Pass the root element of the generated HTML
 * (parse the string with DOMParser first).
 */
export function auditOutlookHtml(root: Element): OutlookIssue[] {
  const issues: OutlookIssue[] = [];

  for (const el of [root, ...root.querySelectorAll('*')]) {
    const decl = declarations(el);
    const tag = el.tagName.toLowerCase();

    // 1. `exactly` with a unitless line-height collapses the text in Word.
    if (decl.has('mso-line-height-rule')) {
      const lh = decl.get('line-height');
      if (lh && !ABSOLUTE_LENGTH.test(lh)) {
        issues.push({
          severity: 'error',
          rule: 'mso-line-height-needs-absolute-unit',
          detail: `<${tag}> sets mso-line-height-rule with line-height:${lh}; Word reads that as ${lh}pt`,
        });
      }
    }

    if (tag === 'img') {
      // 2. Word ignores max-width, so an image needs real dimensions.
      if (!el.getAttribute('width')) {
        issues.push({
          severity: 'error',
          rule: 'img-needs-width-attribute',
          detail: 'an <img> has no width attribute; Word ignores max-width and scales by system DPI',
        });
      }
      if (!el.getAttribute('height')) {
        issues.push({
          severity: 'warning',
          rule: 'img-needs-height-attribute',
          detail: 'an <img> has no height attribute; Word may size it by DPI rather than aspect ratio',
        });
      }
      if ((el.getAttribute('src') ?? '').startsWith('data:')) {
        issues.push({
          severity: 'warning',
          rule: 'data-uri-image',
          detail: 'image uses a data: URI; Outlook desktop does not resolve these when pasting HTML',
        });
      }
    }

    // 3. Borders and padding on a div are unreliable; on a table cell they are not.
    if (tag === 'div' && (decl.has('border') || decl.has('padding'))) {
      issues.push({
        severity: 'warning',
        rule: 'div-border-or-padding',
        detail: `<div> carries ${decl.has('border') ? 'a border' : 'padding'}; Word applies these to divs erratically`,
      });
    }

    // 4. A CSS-only table width is frequently dropped.
    if (tag === 'table') {
      const width = decl.get('width');
      if (width && !el.getAttribute('width')) {
        issues.push({
          severity: 'warning',
          rule: 'table-width-needs-attribute',
          detail: `<table> sets width:${width} in CSS only; Word often drops it`,
        });
      }
    }

    // 5. Backgrounds on table parts should be mirrored onto bgcolor.
    if (tag === 'tr' || tag === 'td' || tag === 'th') {
      const bg = decl.get('background-color');
      if (bg && /^#[0-9a-f]{3,8}$/i.test(bg) && !el.getAttribute('bgcolor')) {
        issues.push({
          severity: 'warning',
          rule: 'table-bgcolor-needs-attribute',
          detail: `<${tag}> has background-color:${bg} without a bgcolor attribute`,
        });
      }
    }

    // 6. Word has neither flex nor grid; those layouts collapse to stacked blocks.
    const display = decl.get('display');
    if (display && /^(flex|inline-flex|grid|inline-grid)$/i.test(display)) {
      issues.push({
        severity: 'error',
        rule: 'unsupported-display',
        detail: `<${tag}> uses display:${display}; Word supports neither flex nor grid`,
      });
    }

    // 7. Positioning is ignored outright.
    const position = decl.get('position');
    if (position && /^(absolute|fixed|sticky)$/i.test(position)) {
      issues.push({
        severity: 'error',
        rule: 'unsupported-position',
        detail: `<${tag}> uses position:${position}, which Word ignores`,
      });
    }
  }

  return issues;
}

export function outlookErrors(root: Element): OutlookIssue[] {
  return auditOutlookHtml(root).filter((i) => i.severity === 'error');
}

/** Human-readable report, one issue per line. */
export function formatOutlookReport(issues: OutlookIssue[]): string {
  if (issues.length === 0) return 'No known Outlook/Word issues found.';
  return issues.map((i) => `[${i.severity}] ${i.rule}: ${i.detail}`).join('\n');
}
