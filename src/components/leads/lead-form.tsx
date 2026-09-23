"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LEAD_STATUSES, SOURCES } from "@/lib/validations";
import type { ActionState } from "@/lib/actions/leads";
import { useDict } from "@/i18n/locale-context";
import { leadStatusLabel, sourceLabel } from "@/i18n/enum-labels";

type Option = { id: string; name: string };

export function LeadForm({
  action,
  currentUser,
  owners,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  currentUser: { id: string; role: string };
  owners: Option[];
  defaultValues?: {
    name?: string;
    companyName?: string | null;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    industry?: string | null;
    source?: string | null;
    status?: string;
    score?: number;
    notes?: string | null;
    nextFollowUpAt?: Date | string | null;
    ownerId?: string;
  };
  submitLabel: string;
}) {
  const dict = useDict();
  const [state, formAction, pending] = useActionState(action, null);
  const canAssignOwner = currentUser.role === "ADMIN";
  const followUpValue = defaultValues?.nextFollowUpAt
    ? new Date(defaultValues.nextFollowUpAt).toISOString().slice(0, 10)
    : "";

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.leads.leadName} htmlFor="name">
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </Field>
        <Field label={dict.fields.companyName} htmlFor="companyName">
          <Input id="companyName" name="companyName" defaultValue={defaultValues?.companyName ?? ""} />
        </Field>
        <Field label={dict.fields.jobTitle} htmlFor="jobTitle">
          <Input id="jobTitle" name="jobTitle" defaultValue={defaultValues?.jobTitle ?? ""} />
        </Field>
        <Field label={dict.fields.industry} htmlFor="industry">
          <Input id="industry" name="industry" defaultValue={defaultValues?.industry ?? ""} />
        </Field>
        <Field label={dict.fields.email} htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
        </Field>
        <Field label={dict.fields.phone} htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
        </Field>
        <Field label={dict.fields.source} htmlFor="source">
          <Select id="source" name="source" defaultValue={defaultValues?.source ?? ""}>
            <option value="">{dict.common.unspecified}</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {sourceLabel(dict, s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.fields.status} htmlFor="status">
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "NEW"}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {leadStatusLabel(dict, s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.leads.score01} htmlFor="score">
          <Input id="score" name="score" type="number" min="0" max="100" defaultValue={defaultValues?.score ?? 0} />
        </Field>
        <Field label={dict.leads.nextFollowUp} htmlFor="nextFollowUpAt">
          <Input id="nextFollowUpAt" name="nextFollowUpAt" type="date" defaultValue={followUpValue} />
        </Field>
        {canAssignOwner ? (
          <Field label={dict.fields.owner} htmlFor="ownerId">
            <Select id="ownerId" name="ownerId" defaultValue={defaultValues?.ownerId ?? currentUser.id}>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="ownerId" value={currentUser.id} />
        )}
      </div>

      <Field label={dict.fields.notes} htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? dict.common.saving : submitLabel}
      </Button>
    </form>
  );
}
