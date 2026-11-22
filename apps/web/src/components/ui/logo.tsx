import { Video } from 'lucide-react';

export interface LogoProps {
  tone?: 'default' | 'inverted';
}

export function Logo({ tone = 'default' }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-[9px] bg-ds-accent text-ds-on-accent">
        <Video aria-hidden className="size-[18px]" />
      </span>
      <span
        className={`text-[17px] font-bold ${tone === 'inverted' ? 'text-ds-on-accent' : 'text-ds-ink'}`}
      >
        Видеовстречи
      </span>
    </span>
  );
}
