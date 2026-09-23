"use client";

import { useActionState, type FormEvent, type ReactNode } from "react";

export type ButtonActionState = { error?: string } | null;

/** A form whose server action returns `{ error }` instead of throwing, so a rejected
 * click shows the message here instead of Next's "This page couldn't load" screen. */
export function ServerActionForm({
  action,
  children,
  className,
  onSubmit,
}: {
  action: (prev: ButtonActionState, formData: FormData) => Promise<ButtonActionState>;
  children: ReactNode;
  className?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className} onSubmit={onSubmit}>
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      {children}
    </form>
  );
}
