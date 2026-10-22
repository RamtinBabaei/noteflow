'use client';
import { useState } from 'react';
import { Check, Download, Monitor, Moon, Sun, Info } from 'lucide-react';
export type Preferences = { theme: 'light' | 'dark' | 'system'; font: 'sans' | 'serif' | 'mono' };
export default function Settings({
  preferences,
  onApply,
  onExport,
}: {
  preferences: Preferences;
  onApply: (p: Preferences) => void;
  onExport: () => void;
}) {
  const [draft, setDraft] = useState(preferences);
  return (
    <section className="settings-content" aria-label="Workspace settings">
      <div className="settings-intro">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h2>A space that feels like you.</h2>
        <p>A few little details to help you find your flow.</p>
      </div>
      <fieldset>
        <legend>Color theme</legend>
        <p className="field-description">Choose the mood for your workspace.</p>
        <div className="theme-options">
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <label className={`theme-option ${draft.theme === theme ? 'chosen' : ''}`} key={theme}>
              <input
                type="radio"
                name="color-theme"
                value={theme}
                checked={draft.theme === theme}
                onChange={() => setDraft({ ...draft, theme })}
              />
              <span className={`theme-preview ${theme}`}>
                <i />
                <i />
                <i />
              </span>
              <span className="theme-label">
                {theme === 'light' ? (
                  <Sun size={18} />
                ) : theme === 'dark' ? (
                  <Moon size={18} />
                ) : (
                  <Monitor size={18} />
                )}
                <strong>{theme[0].toUpperCase() + theme.slice(1)}</strong>
                {draft.theme === theme && <Check size={16} />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Font theme</legend>
        <p className="field-description">Find the type that suits your thinking.</p>
        {(['sans', 'serif', 'mono'] as const).map((font) => (
          <label key={font} className={`font-option ${draft.font === font ? 'chosen' : ''}`}>
            <input
              type="radio"
              name="font-theme"
              value={font}
              checked={draft.font === font}
              onChange={() => setDraft({ ...draft, font })}
            />
            <span className={`font-sample ${font}`}>Aa</span>
            <span>
              <strong>
                {font === 'sans' ? 'Sans-serif' : font === 'serif' ? 'Serif' : 'Monospace'}
              </strong>
              <small>
                {font === 'sans'
                  ? 'Clean, modern, and easy to read.'
                  : font === 'serif'
                    ? 'A little warmth. A timeless feel.'
                    : 'Precise, structured, and distinctive.'}
              </small>
            </span>
            <span className="radio-dot" />
          </label>
        ))}
      </fieldset>
      <button className="button primary" onClick={() => onApply(draft)}>
        <Check size={17} />
        Apply changes
      </button>
      <div className="data-settings">
        <div>
          <h3>Your notes, yours to keep.</h3>
          <p>Download all your notes as a JSON backup.</p>
        </div>
        <button className="button outline" onClick={onExport}>
          <Download size={17} />
          Export notes
        </button>
      </div>
      <p className="privacy-note">
        <Info size={16} />
        Guest notes are saved securely for this browser for 90 days. Export a backup before clearing
        cookies. This demo doesn’t include account sign-in or cross-device sync.
      </p>
    </section>
  );
}
