import { FileText, ListChecks, Upload, type LucideIcon } from 'lucide-react';
import { Logo } from '@/components/ui';

const COPYRIGHT_YEAR = 2026;

const FEATURES: Array<{ icon: LucideIcon; text: string }> = [
  { icon: Upload, text: 'Загрузите запись mp3 или mp4' },
  { icon: FileText, text: 'Получите расшифровку встречи' },
  { icon: ListChecks, text: 'AI выделит итоги и задачи' },
];

/** Dark brand column; shown from 1024px up, widths follow the design frames. */
export function AuthBrandPanel() {
  return (
    <aside className="hidden shrink-0 flex-col justify-between bg-ds-ink p-10 lg:flex lg:w-[420px] desktop:w-[580px] desktop:p-14 wide:w-[760px] wide:p-16">
      <Logo tone="inverted" />
      <div className="flex flex-col gap-6 desktop:gap-8">
        <p className="text-[30px] leading-[1.1] font-bold tracking-[-0.8px] text-ds-on-accent desktop:text-[42px] desktop:tracking-[-1.2px] wide:text-[52px] wide:tracking-[-1.6px]">
          <span className="whitespace-nowrap">Встреча закончилась —</span>
          <br />
          <span className="whitespace-nowrap">задачи уже готовы</span>
        </p>
        <ul className="flex flex-col gap-3.5">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/8 text-ds-on-accent"
              >
                <Icon className="size-4" />
              </span>
              <span className="text-sm font-medium text-ds-muted-on-dark desktop:text-base">
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <small className="text-xs font-medium text-ds-muted-on-dark">
        © {COPYRIGHT_YEAR} Видеовстречи
      </small>
    </aside>
  );
}
