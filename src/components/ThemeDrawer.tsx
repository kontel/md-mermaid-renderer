import { THEMES } from 'beautiful-mermaid';
import { useMermaidContext, type ThemeConfig, type ThemePreset } from '../context/MermaidContext';

const FONT_OPTIONS = ['Inter', 'Roboto', 'Fira Code', 'JetBrains Mono', 'system-ui', 'monospace'];

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateRandomTheme(): Partial<ThemeConfig> {
  const isDark = Math.random() > 0.5;
  const bgLightness = isDark ? 10 + Math.floor(Math.random() * 15) : 90 + Math.floor(Math.random() * 10);
  const fgLightness = isDark ? 70 + Math.floor(Math.random() * 25) : 15 + Math.floor(Math.random() * 20);

  const baseHue = Math.floor(Math.random() * 360);
  const accentHue = (baseHue + 180 + Math.floor(Math.random() * 60) - 30) % 360;

  const bg = hslToHex(baseHue, 15 + Math.floor(Math.random() * 20), bgLightness);
  const fg = hslToHex(baseHue, 5 + Math.floor(Math.random() * 15), fgLightness);
  const accent = hslToHex(accentHue, 50 + Math.floor(Math.random() * 30), 50 + Math.floor(Math.random() * 20));
  const mutedLightness = isDark ? 35 + Math.floor(Math.random() * 15) : 50 + Math.floor(Math.random() * 20);
  const muted = hslToHex(baseHue, 10 + Math.floor(Math.random() * 15), mutedLightness);
  const surfaceLightness = isDark ? bgLightness + 5 + Math.floor(Math.random() * 10) : bgLightness - 5 - Math.floor(Math.random() * 5);
  const surface = hslToHex(baseHue, 15 + Math.floor(Math.random() * 15), surfaceLightness);
  const borderLightness = isDark ? 25 + Math.floor(Math.random() * 15) : 75 + Math.floor(Math.random() * 10);
  const border = hslToHex(baseHue, 10 + Math.floor(Math.random() * 15), borderLightness);

  return { bg, fg, line: muted, accent, muted, surface, border };
}

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="theme-color-input">
      <label>{label}</label>
      <div className="color-input-wrapper">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export function ThemeDrawer() {
  const { themeConfig, setThemeConfig, isDrawerOpen, setDrawerOpen, renderMode } = useMermaidContext();

  const isBeautifulMode = renderMode === 'beautiful-svg' || renderMode === 'beautiful-ascii';

  const handlePresetChange = (preset: ThemePreset) => {
    if (preset === 'custom') {
      setThemeConfig({ ...themeConfig, preset: 'custom' });
    } else {
      const presetValues = THEMES[preset as keyof typeof THEMES];
      if (presetValues) {
        setThemeConfig({
          ...themeConfig,
          preset,
          ...presetValues,
          font: 'Inter',
          transparent: false,
        });
      }
    }
  };

  const handleColorChange = (key: keyof ThemeConfig, value: string) => {
    setThemeConfig({ ...themeConfig, [key]: value, preset: 'custom' });
  };

  const handleFontChange = (font: string) => {
    setThemeConfig({ ...themeConfig, font, preset: 'custom' });
  };

  const handleTransparentChange = (transparent: boolean) => {
    setThemeConfig({ ...themeConfig, transparent, preset: 'custom' });
  };

  const handleRandomize = () => {
    const randomColors = generateRandomTheme();
    setThemeConfig({
      ...themeConfig,
      ...randomColors,
      preset: 'custom',
    });
  };

  const handleReset = () => {
    if (themeConfig.preset === 'custom') {
      // Reset to default custom colors
      setThemeConfig({
        preset: 'custom',
        bg: '#1a1b26',
        fg: '#a9b1d6',
        line: '#565f89',
        accent: '#7aa2f7',
        muted: '#565f89',
        surface: '#24283b',
        border: '#414868',
        font: 'Inter',
        transparent: false,
      });
    } else {
      handlePresetChange(themeConfig.preset);
    }
  };

  if (!isDrawerOpen) return null;

  return (
    <>
      <div className="theme-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      <div className="theme-drawer">
        <div className="theme-drawer-header">
          <h2>Theme Customization</h2>
          <button className="theme-drawer-close" onClick={() => setDrawerOpen(false)}>
            &times;
          </button>
        </div>

        {!isBeautifulMode && (
          <div className="theme-drawer-warning">
            Theme customization only applies to Beautiful Mermaid render modes (SVG or ASCII).
          </div>
        )}

        <div className="theme-drawer-content">
          <div className="theme-section">
            <h3>Preset Theme</h3>
            <select
              value={themeConfig.preset}
              onChange={(e) => handlePresetChange(e.target.value as ThemePreset)}
            >
              <option value="custom">Custom</option>
              <optgroup label="Light Themes">
                <option value="zinc-light">Zinc Light</option>
                <option value="tokyo-night-light">Tokyo Night Light</option>
                <option value="catppuccin-latte">Catppuccin Latte</option>
                <option value="nord-light">Nord Light</option>
                <option value="github-light">GitHub Light</option>
                <option value="solarized-light">Solarized Light</option>
              </optgroup>
              <optgroup label="Dark Themes">
                <option value="zinc-dark">Zinc Dark</option>
                <option value="tokyo-night">Tokyo Night</option>
                <option value="tokyo-night-storm">Tokyo Night Storm</option>
                <option value="catppuccin-mocha">Catppuccin Mocha</option>
                <option value="nord">Nord</option>
                <option value="dracula">Dracula</option>
                <option value="github-dark">GitHub Dark</option>
                <option value="solarized-dark">Solarized Dark</option>
                <option value="one-dark">One Dark</option>
              </optgroup>
            </select>
          </div>

          <div className="theme-section">
            <h3>Colors</h3>
            <ColorInput
              label="Background"
              value={themeConfig.bg}
              onChange={(v) => handleColorChange('bg', v)}
            />
            <ColorInput
              label="Foreground"
              value={themeConfig.fg}
              onChange={(v) => handleColorChange('fg', v)}
            />
            <ColorInput
              label="Line"
              value={themeConfig.line || ''}
              onChange={(v) => handleColorChange('line', v)}
            />
            <ColorInput
              label="Accent"
              value={themeConfig.accent || ''}
              onChange={(v) => handleColorChange('accent', v)}
            />
            <ColorInput
              label="Muted"
              value={themeConfig.muted || ''}
              onChange={(v) => handleColorChange('muted', v)}
            />
            <ColorInput
              label="Surface"
              value={themeConfig.surface || ''}
              onChange={(v) => handleColorChange('surface', v)}
            />
            <ColorInput
              label="Border"
              value={themeConfig.border || ''}
              onChange={(v) => handleColorChange('border', v)}
            />
          </div>

          <div className="theme-section">
            <h3>Typography</h3>
            <div className="theme-font-select">
              <label>Font Family</label>
              <select
                value={themeConfig.font || 'Inter'}
                onChange={(e) => handleFontChange(e.target.value)}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="theme-section">
            <h3>Options</h3>
            <label className="theme-checkbox">
              <input
                type="checkbox"
                checked={themeConfig.transparent || false}
                onChange={(e) => handleTransparentChange(e.target.checked)}
              />
              Transparent Background
            </label>
          </div>

          <div className="theme-drawer-actions">
            <button className="theme-btn theme-btn-randomize" onClick={handleRandomize}>
              Randomize
            </button>
            <button className="theme-btn theme-btn-reset" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
