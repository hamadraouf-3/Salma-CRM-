"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonActionState } from "@/components/server-action-form";

export function ConfirmDeleteForm({
  action,
  confirmMessage,
  label = "Delete",
  iconOnly,
}: {
  action: (prev: ButtonActionState, formData: FormData) => Promise<ButtonActionState>;
  confirmMessage: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      {state?.error ? <p className="max-w-56 text-end text-xs text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        className={cn(
          "flex items-center gap-2 rounded-lg text-sm font-medium text-danger transition-colors disabled:opacity-60",
          iconOnly
            ? "p-2 hover:bg-danger-bg"
            : "border border-danger/30 px-3 py-2 hover:bg-danger-bg"
        )}
      >
        <Trash2 className="size-4" />
        {iconOnly ? null : label}
      </button>
    </form>
  );
}
