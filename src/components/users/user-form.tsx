"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/validations";
import type { ActionState } from "@/lib/actions/users";
import { useDict } from "@/i18n/locale-context";
import { roleLabel } from "@/i18n/enum-labels";

export function UserForm({
  action,
  defaultValues,
  submitLabel,
  isNew,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    name?: string;
    email?: string;
    role?: string;
    title?: string | null;
    active?: boolean;
  };
  submitLabel: string;
  isNew?: boolean;
}) {
  const dict = useDict();
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.fields.name} htmlFor="name">
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </Field>
        <Field label={dict.users.emailAddress} htmlFor="email">
          <Input id="email" name="email" type="email" required defaultValue={defaultValues?.email} />
        </Field>
        <Field label={isNew ? dict.users.passwordLabel : dict.users.newPasswordOptional} htmlFor="password">
          <Input id="password" name="password" type="password" required={isNew} />
        </Field>
        <Field label={dict.fields.role} htmlFor="role">
          <Select id="role" name="role" defaultValue={defaultValues?.role ?? "ACCOUNT_MANAGER"}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(dict, r)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.users.jobTitleOptional} htmlFor="title">
          <Input
            id="title"
            name="title"
            placeholder={dict.users.jobTitlePlaceholder}
            defaultValue={defaultValues?.title ?? ""}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="active" defaultChecked={defaultValues?.active ?? true} className="size-4" />
        {dict.users.accountActive}
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? dict.common.saving : submitLabel}
      </Button>
    </form>
  );
}
