import type { ChapterRef } from "../../../shared/api";
import type { ChapterProgress } from "../useDownloader";
import { ChapterRow } from "./ChapterRow";

interface ChapterListProps {
  chapters: ChapterRef[];
  selected: ReadonlySet<string>;
  progress: Readonly<Record<string, ChapterProgress>>;
  disabled: boolean;
  onToggle: (id: string) => void;
}

export const ChapterList = ({
  chapters,
  selected,
  progress,
  disabled,
  onToggle,
}: ChapterListProps) => (
  <ul className="chapter-list">
    {chapters.map((chapter) => (
      <ChapterRow
        key={chapter.id}
        chapter={chapter}
        checked={selected.has(chapter.id)}
        progress={progress[chapter.id]}
        disabled={disabled}
        onToggle={onToggle}
      />
    ))}
  </ul>
);
