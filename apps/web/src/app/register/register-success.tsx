import { Check } from 'lucide-react';

export function RegisterSuccess() {
  return (
    <div role="status" className="flex w-full flex-col gap-6">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-ds-md bg-ds-success-bg text-ds-success"
      >
        <Check className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.6px] text-ds-ink md:text-[28px]">
          Аккаунт создан
        </h1>
        <p className="text-sm leading-normal font-medium text-ds-muted">
          Добро пожаловать! Теперь вы можете создавать и проводить видеовстречи.
        </p>
      </div>
      <div className="rounded-ds-md bg-ds-success-bg px-3.5 py-3 text-[13px] text-ds-success">
        <p className="font-bold">Регистрация прошла успешно</p>
        <p className="font-medium">Токен доступа сохранён в этом браузере.</p>
      </div>
    </div>
  );
}
