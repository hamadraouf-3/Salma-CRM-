"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changeOwnPassword, type ActionState } from "@/lib/actions/profile";
import { useDict } from "@/i18n/locale-context";

export function ChangePasswordForm() {
  const dict = useDict();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changeOwnPassword, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div>
      ) : null}
      {state?.success ? (
        <div className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">{state.success}</div>
      ) : null}
      <Field label={dict.profile.currentPassword} htmlFor="currentPassword">
        <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
      </Field>
      <Field label={dict.profile.newPassword} htmlFor="newPassword">
        <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
      </Field>
      <Field label={dict.profile.confirmNewPassword} htmlFor="confirmPassword">
        <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? dict.common.saving : dict.profile.changePassword}
      </Button>
    </form>
  );
}
