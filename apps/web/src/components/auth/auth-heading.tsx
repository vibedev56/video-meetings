export interface AuthHeadingProps {
  title: string;
  description: string;
}

export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold tracking-[-0.6px] text-ds-ink md:text-[28px]">
        {title}
      </h1>
      <p className="text-sm leading-normal font-medium text-ds-muted">
        {description}
      </p>
    </div>
  );
}
