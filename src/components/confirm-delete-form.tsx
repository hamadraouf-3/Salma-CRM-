"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfirmDeleteForm({
  action,
  confirmMessage,
  label = "Delete",
  iconOnly,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  iconOnly?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        className={cn(
          "flex items-center gap-2 rounded-lg text-sm font-medium text-danger transition-colors",
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
