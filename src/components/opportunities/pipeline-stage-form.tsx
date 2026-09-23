"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/locale-context";
import type { ActionState } from "@/lib/actions/pipeline-stages";

export function PipelineStageForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: { label?: string; defaultProbability?: number };
  submitLabel: string;
}) {
  const dict = useDict();
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div>
      ) : null}
      <Field label={dict.pipelineStages.stageNameLabel} htmlFor="label">
        <Input
          id="label"
          name="label"
          required
          placeholder={dict.pipelineStages.stageNamePlaceholder}
          defaultValue={defaultValues?.label}
        />
      </Field>
      <Field label={dict.pipelineStages.defaultProbabilityLabel} htmlFor="defaultProbability">
        <Input
          id="defaultProbability"
          name="defaultProbability"
          type="number"
          min={0}
          max={100}
          step={5}
          defaultValue={defaultValues?.defaultProbability ?? 50}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? dict.common.saving : submitLabel}
      </Button>
    </form>
  );
}
