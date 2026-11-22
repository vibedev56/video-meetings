import { Search } from 'lucide-react';
import { Tab } from '@/components/ui';
import { MeetingFilter } from '@/lib/meeting-list';

interface MeetingsToolbarProps {
  filter: MeetingFilter;
  onFilterChange: (filter: MeetingFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  totalCount: number;
}

const TAB_CLASSES = 'flex-1 justify-center text-xs md:flex-none md:text-[13px]';

/**
 * Tabs and title search. Below 768px the search sits above full-width tabs;
 * from 768px the tabs are on the left and the search is on the right.
 */
export function MeetingsToolbar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  totalCount,
}: MeetingsToolbarProps) {
  return (
    <div className="flex flex-col gap-5 md:flex-row-reverse md:items-center md:justify-between md:gap-4 md:px-4 md:py-3.5">
      <label className="flex items-center gap-2 rounded-ds-md border border-ds-line bg-ds-surface px-3.5 py-[11px] focus-within:border-ds-accent focus-within:shadow-ds-ring md:w-[200px] md:rounded-[10px] md:border-transparent md:bg-ds-bg md:px-3 md:py-[9px] lg:w-[280px]">
        <Search aria-hidden className="size-4 shrink-0 text-ds-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск по названию"
          aria-label="Поиск по названию"
          className="w-full min-w-0 bg-transparent text-sm text-ds-ink outline-none placeholder:text-ds-muted"
        />
      </label>

      <div
        role="tablist"
        aria-label="Фильтр встреч"
        className="flex gap-0.5 rounded-[10px] bg-ds-sunken p-[3px] md:self-auto"
      >
        <Tab
          className={TAB_CLASSES}
          isActive={filter === MeetingFilter.ALL}
          onClick={() => onFilterChange(MeetingFilter.ALL)}
        >
          Все · {totalCount}
        </Tab>
        <Tab
          className={TAB_CLASSES}
          isActive={filter === MeetingFilter.UPCOMING}
          onClick={() => onFilterChange(MeetingFilter.UPCOMING)}
        >
          <span className="md:hidden">Скоро</span>
          <span className="hidden md:inline">Предстоящие</span>
        </Tab>
        <Tab
          className={TAB_CLASSES}
          isActive={filter === MeetingFilter.PAST}
          onClick={() => onFilterChange(MeetingFilter.PAST)}
        >
          <span className="md:hidden">Прошли</span>
          <span className="hidden md:inline">Прошедшие</span>
        </Tab>
      </div>
    </div>
  );
}
