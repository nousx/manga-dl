import { type FormEvent } from "react";

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
  const trimmed = url.trim();

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!disabled && !loading && trimmed !== "") onSubmit(trimmed);
  };

  return (
    <form className="url-bar" onSubmit={submit}>
      <input
        aria-label="ลิงก์หน้าเรื่อง"
        disabled={disabled || loading}
        type="text"
        value={url}
        spellCheck={false}
        placeholder="https://arenascan.com/manga/<ชื่อเรื่อง>/"
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="submit"
        className="primary"
        disabled={loading || disabled || trimmed === ""}
      >
        {loading ? "กำลังดึง..." : "ดึงข้อมูล"}
      </button>
    </form>
  );
};
