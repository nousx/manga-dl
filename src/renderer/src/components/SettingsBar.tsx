import { SETTING_LIMITS, type Settings } from "../../../shared/api";

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
  const { imageConcurrency, requestDelayMs } = SETTING_LIMITS;

  return (
    <div className="settings">
      <span className="label">บันทึกที่</span>
      <code className="path" title={settings.outDir}>
        {settings.outDir}
      </code>
      <button type="button" disabled={disabled} onClick={onPickFolder}>
        เปลี่ยน
      </button>
      <button type="button" onClick={onOpenFolder}>
        เปิดโฟลเดอร์
      </button>

      <label>
        โหลดพร้อมกัน
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
        รูป
      </label>
      <label>
        หน่วง
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
    </div>
  );
};
