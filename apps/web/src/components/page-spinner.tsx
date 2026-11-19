import { Spinner } from '@heroui/react';

export function PageSpinner() {
  return (
    <div
      role="status"
      className="flex flex-1 items-center justify-center py-24"
    >
      <Spinner size="lg" aria-label="Загрузка" />
    </div>
  );
}
