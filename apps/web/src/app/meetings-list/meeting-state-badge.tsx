import { Calendar, CircleDashed } from 'lucide-react';
import { Badge, type BadgeSize } from '@/components/ui';

export function MeetingStateBadge({
  isPast,
  size,
}: {
  isPast: boolean;
  size?: BadgeSize;
}) {
  return isPast ? (
    <Badge tone="neutral" icon={CircleDashed} size={size}>
      Прошла
    </Badge>
  ) : (
    <Badge tone="accent" icon={Calendar} size={size}>
      Запланирована
    </Badge>
  );
}
