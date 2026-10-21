import { describe, it, expect } from 'vitest';
import {
  COPY_IMAGE_TEXT_PX,
  DEFAULT_DIAGRAM_FONT_PX,
  MAX_CANVAS_AREA,
  MAX_CANVAS_SIDE,
  planDiagramImage,
  typicalFontPx,
} from './diagramSizing';
import { copyTargetProfile } from './copyTargets';

const email = copyTargetProfile('email');
const emailLimits = {
  textPx: COPY_IMAGE_TEXT_PX.normal,
  maxDisplayWidth: email.maxImageWidth,
  maxRenderWidth: email.maxRenderWidth,
};
const standalone = {
  textPx: COPY_IMAGE_TEXT_PX.normal,
  maxDisplayWidth: Number.POSITIVE_INFINITY,
  maxRenderWidth: Number.POSITIVE_INFINITY,
};

describe('planDiagramImage', () => {
  it('displays a small diagram so its labels read at the requested size', () => {
    // 16px labels shown at 14px → 0.875 scale, regardless of how narrow the diagram is.
    const plan = planDiagramImage({ width: 300, height: 200, fontPx: 16 }, emailLimits);
    expect(plan.displayWidth).toBe(Math.round(300 * (14 / 16)));
    expect(plan.displayHeight).toBe(Math.round(200 * (14 / 16)));
  });

  it('follows the diagram font, not just its width', () => {
    const small = planDiagramImage({ width: 400, height: 300, fontPx: 12 }, emailLimits);
    const large = planDiagramImage({ width: 400, height: 300, fontPx: 20 }, emailLimits);
    expect(small.displayWidth).toBeGreaterThan(large.displayWidth);
  });

  it('shrinks to the target width when the diagram cannot fit', () => {
    const plan = planDiagramImage({ width: 8000, height: 4000, fontPx: 16 }, emailLimits);
    expect(plan.displayWidth).toBe(email.maxImageWidth);
    expect(plan.displayHeight).toBe(300);
  });

  it('keeps enough pixels to read a shrunk diagram when opened at full size', () => {
    // Displayed at 600px, but rendered past 2× so labels survive a zoom.
    const plan = planDiagramImage({ width: 2000, height: 800, fontPx: 16 }, emailLimits);
    expect(plan.displayWidth).toBe(600);
    expect(plan.pixelWidth).toBe(Math.round(2000 * (14 / 16)));
  });

  it('renders at least 2× the display size for retina screens', () => {
    const plan = planDiagramImage({ width: 400, height: 300, fontPx: 16 }, emailLimits);
    expect(plan.pixelWidth).toBeGreaterThanOrEqual(plan.displayWidth * 2);
  });

  it('honours the target payload cap', () => {
    const plan = planDiagramImage({ width: 9000, height: 3000, fontPx: 16 }, emailLimits);
    expect(plan.pixelWidth).toBeLessThanOrEqual(email.maxRenderWidth * 2);
  });

  it('stays inside browser canvas limits for huge standalone exports', () => {
    const plan = planDiagramImage({ width: 30000, height: 12000, fontPx: 16 }, standalone);
    expect(plan.pixelWidth).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
    expect(plan.pixelHeight).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
    expect(plan.pixelWidth * plan.pixelHeight).toBeLessThanOrEqual(MAX_CANVAS_AREA * 1.001);
  });

  it('never displays larger than its pixels can back', () => {
    const plan = planDiagramImage({ width: 30000, height: 12000, fontPx: 16 }, standalone);
    expect(plan.displayWidth).toBeLessThanOrEqual(plan.pixelWidth);
  });

  it('bounds the text-driven scale for odd fonts', () => {
    const tiny = planDiagramImage({ width: 200, height: 100, fontPx: 2 }, standalone);
    expect(tiny.displayWidth).toBe(300); // capped at 1.5×
    const huge = planDiagramImage({ width: 200, height: 100, fontPx: 200 }, standalone);
    expect(huge.displayWidth).toBe(100); // floored at 0.5×
  });

  it('larger text settings display larger', () => {
    const at = (textPx: number) =>
      planDiagramImage({ width: 400, height: 300, fontPx: 16 }, { ...emailLimits, textPx }).displayWidth;
    expect(at(COPY_IMAGE_TEXT_PX.small)).toBeLessThan(at(COPY_IMAGE_TEXT_PX.normal));
    expect(at(COPY_IMAGE_TEXT_PX.normal)).toBeLessThan(at(COPY_IMAGE_TEXT_PX.large));
  });

  it('turns bad input into a finite, non-empty plan', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const plan = planDiagramImage({ width: bad, height: bad, fontPx: bad }, { ...emailLimits, textPx: bad });
      for (const value of Object.values(plan)) {
        expect(Number.isFinite(value), `input ${bad}`).toBe(true);
        expect(value, `input ${bad}`).toBeGreaterThan(0);
      }
    }
  });

  it.each(['rich', 'email', 'confluence'] as const)('%s renders at least as wide as it displays', (target) => {
    // A PNG narrower than its display width would be visibly soft.
    const profile = copyTargetProfile(target);
    expect(profile.maxRenderWidth).toBeGreaterThanOrEqual(profile.maxImageWidth);
  });
});

describe('typicalFontPx', () => {
  it('takes the median so one big title does not skew it', () => {
    expect(typicalFontPx([14, 14, 16, 32])).toBe(15);
    expect(typicalFontPx([16, 16, 28])).toBe(16);
  });

  it('falls back to mermaid’s stock size', () => {
    expect(typicalFontPx([])).toBe(DEFAULT_DIAGRAM_FONT_PX);
    expect(typicalFontPx([0, Number.NaN])).toBe(DEFAULT_DIAGRAM_FONT_PX);
  });
});
