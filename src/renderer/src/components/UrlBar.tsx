import { type FormEvent } from "react";
import { useI18n } from "../i18n/context";

interface UrlBarProps {
  url: string;
  onChange: (url: string) => void;
  loading: boolean;
  disabled: boolean;
  onSubmit: (url: string) => void;
}

export const UrlBar = ({
  url,
  onChange,
  loading,
  disabled,
  onSubmit,
}: UrlBarProps) => {
  const m = useI18n();
  const trimmed = url.trim();

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!disabled && !loading && trimmed !== "") onSubmit(trimmed);
  };

  return (
    <form className="url-bar" onSubmit={submit}>
      <input
        aria-label={m.url.label}
        disabled={disabled || loading}
        type="text"
        value={url}
        spellCheck={false}
        placeholder={m.url.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="submit"
        className="primary"
        disabled={loading || disabled || trimmed === ""}
      >
        {loading ? m.url.fetching : m.url.fetch}
      </button>
    </form>
  );
};
