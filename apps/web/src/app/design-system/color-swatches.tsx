const COLOR_GROUPS: Array<{ title: string; tokens: string[] }> = [
  {
    title: 'Базовые',
    tokens: ['bg', 'surface', 'sunken', 'line', 'line-strong'],
  },
  { title: 'Текст', tokens: ['ink', 'muted', 'muted-on-dark', 'on-accent'] },
  {
    title: 'Акцент и статусы',
    tokens: [
      'accent',
      'accent-hover',
      'accent-pressed',
      'accent-soft',
      'danger',
      'success',
      'success-bg',
      'warning',
      'warning-bg',
    ],
  },
];

export function ColorSwatches() {
  return (
    <>
      {COLOR_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <span className="text-ds-overline text-ds-muted">{group.title}</span>
          <ul className="flex flex-wrap gap-3">
            {group.tokens.map((token) => (
              <li key={token} className="flex w-28 flex-col gap-1.5">
                <span
                  className="h-12 rounded-ds-sm border border-ds-line"
                  style={{ backgroundColor: `var(--ds-${token})` }}
                />
                <span className="text-xs font-semibold">{token}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
