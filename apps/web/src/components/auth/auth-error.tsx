export function AuthError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-ds-md border border-ds-danger bg-ds-danger-soft px-3.5 py-3 text-[13px] font-medium text-ds-danger"
    >
      {message}
    </p>
  );
}
