import type { Metadata } from 'next';
import {
  Calendar,
  CircleDashed,
  LayoutDashboard,
  Lock,
  Mail,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  BurgerButton,
  Button,
  type ButtonVariant,
  IconButton,
  Logo,
  MeetingRow,
  MenuItem,
  NavItem,
  ProfileChip,
  StatCard,
  Tab,
  TaskItem,
  TextField,
  UploadHint,
} from '@/components/ui';
import { ColorSwatches } from './color-swatches';
import { Section } from './section';

export const metadata: Metadata = {
  title: 'Дизайн-система · Видеовстречи',
};

const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'ghost',
  'destructive',
];

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 bg-ds-bg px-4 py-12 text-ds-ink">
      <header className="flex flex-col gap-2">
        <span className="text-ds-overline text-ds-accent">Видеовстречи</span>
        <h1 className="text-ds-display">Токены и компоненты</h1>
      </header>

      <Section title="Цвета">
        <ColorSwatches />
      </Section>

      <Section title="Типографика">
        <p className="text-ds-display">Display 36 / 700</p>
        <p className="text-ds-heading">Heading 20 / 700</p>
        <p className="text-ds-title">Title 16 / 700</p>
        <p className="text-ds-body">Body 14 / 500</p>
        <p className="text-ds-caption text-ds-muted">Caption 13 / 500</p>
        <p className="text-ds-overline text-ds-muted">Overline 12 / 600</p>
      </Section>

      <Section title="Кнопки">
        {BUTTON_VARIANTS.map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-3">
            <Button variant={variant}>Создать</Button>
            <Button variant={variant} isLoading>
              Загрузка
            </Button>
            <Button variant={variant} disabled>
              Отключена
            </Button>
          </div>
        ))}
      </Section>

      <Section title="Навигация">
        <div className="flex flex-wrap items-center gap-4">
          <Logo />
          <NavItem href="#" isActive>
            Обзор
          </NavItem>
          <NavItem href="#">Встречи</NavItem>
          <IconButton icon={Search} aria-label="Поиск" />
          <ProfileChip initial="Q" label="qa-agent@example.com" />
          <BurgerButton />
          <BurgerButton isOpen />
          <BurgerButton disabled />
        </div>
        <div className="flex w-52 flex-col gap-1">
          <MenuItem href="#" icon={LayoutDashboard} isActive>
            Обзор
          </MenuItem>
          <MenuItem href="#" icon={Calendar}>
            Встречи
          </MenuItem>
        </div>
      </Section>

      <Section title="Табы, бейджи, статистика">
        <div role="tablist" className="flex gap-1">
          <Tab isActive>Все</Tab>
          <Tab>С записью</Tab>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success" icon={Sparkles}>
            Саммари готово
          </Badge>
          <Badge tone="warning">Обработка записи…</Badge>
          <Badge tone="neutral" icon={CircleDashed}>
            Без записи
          </Badge>
          <Badge tone="accent" icon={Calendar}>
            Запланирована
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            tone="dark"
            icon={Calendar}
            label="Всего встреч"
            value={2}
            hint="+1 за неделю"
          />
          <StatCard
            icon={Calendar}
            label="Всего встреч"
            value={2}
            hint="+1 за неделю"
          />
        </div>
      </Section>

      <Section title="Списки и загрузка">
        <MeetingRow
          date={{ day: 13, month: 'ноя' }}
          title="Еженедельный синк"
          schedule="Пятница, 15:12 · 48 мин"
          status={
            <Badge tone="success" icon={Sparkles}>
              Саммари готово
            </Badge>
          }
          participantsLabel="Участников: 4"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TaskItem
            title="Подготовить отчёт по итогам"
            meta="до 24 ноя · из «Синк»"
          />
          <TaskItem
            isDone
            title="Отправить запись участникам"
            meta="Выполнено · из «Синк»"
          />
        </div>
        <UploadHint />
      </Section>

      <Section title="Поля ввода">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Email"
            icon={Mail}
            required
            placeholder="you@example.com"
          />
          <TextField
            label="Пароль"
            icon={Lock}
            type="password"
            hint="Минимум 8 символов"
          />
          <TextField
            label="Email"
            icon={Mail}
            defaultValue="anna@company"
            error="Введите корректный email"
          />
          <TextField
            label="Email"
            icon={Mail}
            disabled
            value="you@example.com"
          />
        </div>
      </Section>
    </main>
  );
}
