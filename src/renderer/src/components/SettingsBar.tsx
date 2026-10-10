import { SETTING_LIMITS, type Settings } from "../../../shared/api";
import { isLocale, LOCALE_NAMES, LOCALES } from "../../../shared/locale";
import { useI18n } from "../i18n/context";

interface SettingsBarProps {
  settings: Settings;
  disabled: boolean;
  onPickFolder: () => void;
  onOpenFolder: () => void;
  onChange: (patch: Partial<Settings>) => void;
}

const clamp = (value: number, { min, max }: { min: number; max: number }) =>
  Math.min(max, Math.max(min, Math.round(value)));

export const SettingsBar = ({
  settings,
  disabled,
  onPickFolder,
  onOpenFolder,
  onChange,
}: SettingsBarProps) => {
  const m = useI18n();
  const { imageConcurrency, requestDelayMs } = SETTING_LIMITS;

  return (
    <div className="settings">
      <span className="label">{m.settings.saveTo}</span>
      <code className="path" title={settings.outDir}>
        {settings.outDir}
      </code>
      <button type="button" disabled={disabled} onClick={onPickFolder}>
        {m.settings.change}
      </button>
      <button type="button" onClick={onOpenFolder}>
        {m.settings.openFolder}
      </button>

      <label>
        {m.settings.concurrencyBefore}
        <input
          type="number"
          min={imageConcurrency.min}
          max={imageConcurrency.max}
          value={settings.imageConcurrency}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              imageConcurrency: clamp(
                event.target.valueAsNumber || imageConcurrency.min,
                imageConcurrency,
              ),
            })
          }
        />
        {m.settings.concurrencyAfter}
      </label>
      <label>
        {m.settings.delay}
        <input
          type="number"
          min={requestDelayMs.min}
          max={requestDelayMs.max}
          step={50}
          value={settings.requestDelayMs}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              requestDelayMs: clamp(
                event.target.valueAsNumber || requestDelayMs.min,
                requestDelayMs,
              ),
            })
          }
        />
        ms
      </label>
      <label>
        {m.settings.language}
        <select
          value={settings.language}
          disabled={disabled}
          onChange={(event) => {
            const { value } = event.target;
            if (isLocale(value)) onChange({ language: value });
          }}
        >
          {LOCALES.map((locale) => (
            <option key={locale} value={locale} lang={locale}>
              {LOCALE_NAMES[locale]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
