/**
 * Visual styles for the mermaid.js renderer.
 *
 * Until now only the beautiful-mermaid modes were themeable, which left the
 * default renderer — the one that handles every diagram type — stuck with
 * mermaid's stock purple. A style is a `theme` + `look` pair, optionally with
 * `themeVariables` on top of mermaid's `base` theme, which is the one designed
 * to be driven entirely by variables.
 *
 * Swatch colours are sampled from what mermaid actually renders, so the picker
 * shows the truth rather than an approximation.
 */

export type MermaidStyleId =
  | 'classic'
  | 'neo'
  | 'neo-dark'
  | 'redux'
  | 'redux-color'
  | 'redux-dark'
  | 'redux-dark-color'
  | 'hand-drawn'
  | 'forest'
  | 'neutral'
  | 'dark'
  | 'midnight'
  | 'sunset'
  | 'mint'
  | 'slate';

export type MermaidLook = 'classic' | 'handDrawn' | 'neo';

/** Mirrors mermaid's own `MermaidConfig['theme']` union. */
export type MermaidBuiltinTheme =
  | 'default'
  | 'base'
  | 'dark'
  | 'forest'
  | 'neutral'
  | 'neo'
  | 'neo-dark'
  | 'redux'
  | 'redux-dark'
  | 'redux-color'
  | 'redux-dark-color';

export interface MermaidStylePreset {
  id: MermaidStyleId;
  label: string;
  group: 'Classic' | 'Neo' | 'Redux' | 'Studio';
  hint: string;
  dark: boolean;
  theme: MermaidBuiltinTheme;
  look: MermaidLook;
  themeVariables?: Record<string, string>;
  /** [surface, node fill, accent] — drives the picker swatch. */
  swatch: [string, string, string];
}

/** Fixed so hand-drawn output is stable between renders and PNG exports. */
const HAND_DRAWN_SEED = 42;

const UI_FONT = '"Inter", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * Studio presets ride on mermaid's `base` theme. Only `base` recomputes its full
 * palette from these variables; the named themes ignore most of them.
 */
function studio(vars: Record<string, string>): Record<string, string> {
  return { fontFamily: UI_FONT, fontSize: '15px', ...vars };
}

export const MERMAID_STYLES: MermaidStylePreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    group: 'Classic',
    hint: "Mermaid's stock look. Unchanged.",
    dark: false,
    theme: 'default',
    look: 'classic',
    swatch: ['#ffffff', '#ECECFF', '#9370DB'],
  },
  {
    id: 'neutral',
    label: 'Neutral',
    group: 'Classic',
    hint: 'Grey and quiet — good for print.',
    dark: false,
    theme: 'neutral',
    look: 'classic',
    swatch: ['#ffffff', '#eeeeee', '#999999'],
  },
  {
    id: 'forest',
    label: 'Forest',
    group: 'Classic',
    hint: 'Green, high contrast.',
    dark: false,
    theme: 'forest',
    look: 'classic',
    swatch: ['#ffffff', '#cde498', '#13540c'],
  },
  {
    id: 'dark',
    label: 'Dark',
    group: 'Classic',
    hint: "Mermaid's built-in dark theme.",
    dark: true,
    theme: 'dark',
    look: 'classic',
    swatch: ['#1f2020', '#1f2020', '#cccccc'],
  },
  {
    id: 'hand-drawn',
    label: 'Hand drawn',
    group: 'Classic',
    hint: 'Sketched edges. Heavier SVG, charming in docs.',
    dark: false,
    theme: 'default',
    look: 'handDrawn',
    swatch: ['#ffffff', '#ECECFF', '#9370DB'],
  },
  {
    id: 'neo',
    label: 'Neo',
    group: 'Neo',
    hint: 'Crisp outlines and soft shadows. Added in 11.14.',
    dark: false,
    theme: 'neo',
    look: 'neo',
    swatch: ['#ffffff', '#ffffff', '#000000'],
  },
  {
    id: 'neo-dark',
    label: 'Neo dark',
    group: 'Neo',
    hint: 'The neo look on a dark canvas.',
    dark: true,
    theme: 'neo-dark',
    look: 'neo',
    swatch: ['#1a1a1a', '#2a2020', '#cccccc'],
  },
  {
    id: 'redux',
    label: 'Redux',
    group: 'Redux',
    hint: 'Flat, editorial, high contrast.',
    dark: false,
    theme: 'redux',
    look: 'neo',
    swatch: ['#ffffff', '#ffffff', '#28253D'],
  },
  {
    id: 'redux-color',
    label: 'Redux colour',
    group: 'Redux',
    hint: 'Redux with accent fills per node type.',
    dark: false,
    theme: 'redux-color',
    look: 'neo',
    swatch: ['#ffffff', '#ffffff', '#28253D'],
  },
  {
    id: 'redux-dark',
    label: 'Redux dark',
    group: 'Redux',
    hint: 'Near-black canvas, white strokes.',
    dark: true,
    theme: 'redux-dark',
    look: 'neo',
    swatch: ['#111113', '#111113', '#ffffff'],
  },
  {
    id: 'redux-dark-color',
    label: 'Redux dark colour',
    group: 'Redux',
    hint: 'Redux dark with accent fills.',
    dark: true,
    theme: 'redux-dark-color',
    look: 'neo',
    swatch: ['#111113', '#111113', '#ffffff'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    group: 'Studio',
    hint: 'Deep indigo. Reads well on slides.',
    dark: true,
    theme: 'base',
    look: 'neo',
    themeVariables: studio({
      darkMode: 'true',
      background: '#0f1225',
      primaryColor: '#1e2344',
      primaryTextColor: '#e8ebff',
      primaryBorderColor: '#5b63a8',
      secondaryColor: '#2a3060',
      tertiaryColor: '#161a35',
      lineColor: '#7c86d6',
      textColor: '#e8ebff',
      mainBkg: '#1e2344',
      clusterBkg: '#161a35',
      clusterBorder: '#3c4479',
      titleColor: '#c3c9ff',
    }),
    swatch: ['#0f1225', '#1e2344', '#7c86d6'],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    group: 'Studio',
    hint: 'Warm amber and rose on cream.',
    dark: false,
    theme: 'base',
    look: 'neo',
    themeVariables: studio({
      background: '#fffaf3',
      primaryColor: '#ffe8d1',
      primaryTextColor: '#5c3a1e',
      primaryBorderColor: '#e2884a',
      secondaryColor: '#ffd6d6',
      tertiaryColor: '#fff2e2',
      lineColor: '#c2683a',
      textColor: '#5c3a1e',
      mainBkg: '#ffe8d1',
      clusterBkg: '#fff2e2',
      clusterBorder: '#e8b98c',
      titleColor: '#8a4a20',
    }),
    swatch: ['#fffaf3', '#ffe8d1', '#c2683a'],
  },
  {
    id: 'mint',
    label: 'Mint',
    group: 'Studio',
    hint: 'Cool teal, low contrast, easy on the eye.',
    dark: false,
    theme: 'base',
    look: 'neo',
    themeVariables: studio({
      background: '#f5fbfa',
      primaryColor: '#d8f3ec',
      primaryTextColor: '#134e4a',
      primaryBorderColor: '#4bb3a0',
      secondaryColor: '#c7ebf5',
      tertiaryColor: '#eafaf6',
      lineColor: '#2f8d7c',
      textColor: '#134e4a',
      mainBkg: '#d8f3ec',
      clusterBkg: '#eafaf6',
      clusterBorder: '#9ad7c9',
      titleColor: '#0f766e',
    }),
    swatch: ['#f5fbfa', '#d8f3ec', '#2f8d7c'],
  },
  {
    id: 'slate',
    label: 'Slate',
    group: 'Studio',
    hint: 'Restrained blue-grey. Safe in any document.',
    dark: false,
    theme: 'base',
    look: 'neo',
    themeVariables: studio({
      background: '#ffffff',
      primaryColor: '#eef2f7',
      primaryTextColor: '#1f2937',
      primaryBorderColor: '#7c8ba1',
      secondaryColor: '#e2e8f0',
      tertiaryColor: '#f7f9fc',
      lineColor: '#5b6b82',
      textColor: '#1f2937',
      mainBkg: '#eef2f7',
      clusterBkg: '#f7f9fc',
      clusterBorder: '#c3ccd9',
      titleColor: '#334155',
    }),
    swatch: ['#ffffff', '#eef2f7', '#5b6b82'],
  },
];

export const DEFAULT_MERMAID_STYLE: MermaidStyleId = 'classic';

const STYLE_BY_ID = new Map(MERMAID_STYLES.map((s) => [s.id, s]));

export function isValidMermaidStyle(value: string | null): value is MermaidStyleId {
  return value !== null && STYLE_BY_ID.has(value as MermaidStyleId);
}

export function mermaidStyle(id: MermaidStyleId): MermaidStylePreset {
  return STYLE_BY_ID.get(id) ?? STYLE_BY_ID.get(DEFAULT_MERMAID_STYLE)!;
}

/** Design tokens a user can override on top of any preset. */
export interface StyleTokenDef {
  key: string;
  label: string;
  /** Colour tokens get a picker; text tokens get a plain field. */
  kind: 'color' | 'text';
}

export const STYLE_TOKENS: StyleTokenDef[] = [
  { key: 'background', label: 'Canvas', kind: 'color' },
  { key: 'primaryColor', label: 'Node fill', kind: 'color' },
  { key: 'primaryBorderColor', label: 'Node border', kind: 'color' },
  { key: 'primaryTextColor', label: 'Node text', kind: 'color' },
  { key: 'lineColor', label: 'Edges', kind: 'color' },
  { key: 'secondaryColor', label: 'Secondary', kind: 'color' },
  { key: 'tertiaryColor', label: 'Tertiary', kind: 'color' },
  { key: 'clusterBkg', label: 'Subgraph fill', kind: 'color' },
  { key: 'fontFamily', label: 'Font family', kind: 'text' },
  { key: 'fontSize', label: 'Font size', kind: 'text' },
];

const TOKEN_KEYS = new Set(STYLE_TOKENS.map((t) => t.key));

/** Drop unknown keys and blank values so a cleared field falls back to the preset. */
export function sanitizeTokens(tokens: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (!TOKEN_KEYS.has(key)) continue;
    const trimmed = value.trim();
    if (trimmed) clean[key] = trimmed;
  }
  return clean;
}

export interface MermaidStyleConfig {
  theme: MermaidBuiltinTheme;
  look: MermaidLook;
  handDrawnSeed: number;
  themeVariables: Record<string, string>;
}

/**
 * Resolve a preset plus user overrides into mermaid config.
 *
 * Any token override switches the preset onto mermaid's `base` theme — the named
 * themes hardcode their palettes and would ignore the variables, leaving the user
 * poking at a control that does nothing. `classic` with no overrides is passed
 * through untouched so the default look never shifts.
 */
export function buildMermaidStyleConfig(
  id: MermaidStyleId,
  tokens: Record<string, string> = {},
): MermaidStyleConfig {
  const preset = mermaidStyle(id);
  const overrides = sanitizeTokens(tokens);
  const hasOverrides = Object.keys(overrides).length > 0;

  const usesBase = preset.theme === 'base' || hasOverrides;

  return {
    theme: usesBase ? 'base' : preset.theme,
    look: preset.look,
    handDrawnSeed: HAND_DRAWN_SEED,
    themeVariables: {
      ...(preset.themeVariables ?? {}),
      ...overrides,
    },
  };
}

/** Stable key for effect dependencies — config objects are rebuilt on every render. */
export function styleConfigKey(id: MermaidStyleId, tokens: Record<string, string> = {}): string {
  const clean = sanitizeTokens(tokens);
  const pairs = Object.keys(clean)
    .sort()
    .map((k) => `${k}=${clean[k]}`)
    .join(',');
  return `${id}|${pairs}`;
}
