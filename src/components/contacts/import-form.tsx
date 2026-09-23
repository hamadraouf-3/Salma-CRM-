"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { importContactsCsv, type ImportState } from "@/lib/actions/import";
import { useDict } from "@/i18n/locale-context";

export function ImportForm() {
  const dict = useDict();
  const [state, formAction, pending] = useActionState<ImportState, FormData>(importContactsCsv, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div>
      ) : null}
      {state?.success ? (
        <div className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">{state.success}</div>
      ) : null}

      <Field label={dict.contacts.csvFile} htmlFor="file">
        <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? dict.contacts.importing : dict.contacts.importContactsBtn}
      </Button>
    </form>
  );
}
