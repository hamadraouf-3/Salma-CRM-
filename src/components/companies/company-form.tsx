"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ACCOUNT_STATUSES,
  COMPANY_SIZES,
  SOURCES,
} from "@/lib/validations";
import type { ActionState } from "@/lib/actions/companies";
import { useDict } from "@/i18n/locale-context";
import { accountStatusLabel, sourceLabel } from "@/i18n/enum-labels";

type Owner = { id: string; name: string };

export function CompanyForm({
  action,
  currentUser,
  owners,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  currentUser: { id: string; role: string };
  owners: Owner[];
  defaultValues?: {
    name?: string;
    legalName?: string | null;
    website?: string | null;
    industry?: string | null;
    companySize?: string | null;
    country?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    accountStatus?: string;
    source?: string | null;
    notes?: string | null;
    ownerId?: string;
  };
  submitLabel: string;
}) {
  const dict = useDict();
  const [state, formAction, pending] = useActionState(action, null);
  const canAssignOwner = currentUser.role === "ADMIN";

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.companies.accountName} htmlFor="name">
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </Field>
        <Field label={dict.companies.legalNameOptional} htmlFor="legalName">
          <Input id="legalName" name="legalName" defaultValue={defaultValues?.legalName ?? ""} />
        </Field>
        <Field label={dict.fields.website} htmlFor="website">
          <Input id="website" name="website" placeholder="https://example.com" defaultValue={defaultValues?.website ?? ""} />
        </Field>
        <Field label={dict.fields.industry} htmlFor="industry">
          <Input id="industry" name="industry" defaultValue={defaultValues?.industry ?? ""} />
        </Field>
        <Field label={dict.companies.companySizeField} htmlFor="companySize">
          <Select id="companySize" name="companySize" defaultValue={defaultValues?.companySize ?? ""}>
            <option value="">{dict.common.unspecified}</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>
                {dict.companies.employeesSuffix.replace("{size}", s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.fields.accountStatus} htmlFor="accountStatus">
          <Select id="accountStatus" name="accountStatus" defaultValue={defaultValues?.accountStatus ?? "PROSPECT"}>
            {ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {accountStatusLabel(dict, s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.fields.country} htmlFor="country">
          <Input id="country" name="country" defaultValue={defaultValues?.country ?? ""} />
        </Field>
        <Field label={dict.fields.city} htmlFor="city">
          <Input id="city" name="city" defaultValue={defaultValues?.city ?? ""} />
        </Field>
        <Field label={dict.fields.phone} htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
        </Field>
        <Field label={dict.fields.email} htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
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
        <div className="sm:col-span-2">
          <Field label={dict.fields.address} htmlFor="address">
            <Input id="address" name="address" defaultValue={defaultValues?.address ?? ""} />
          </Field>
        </div>
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
