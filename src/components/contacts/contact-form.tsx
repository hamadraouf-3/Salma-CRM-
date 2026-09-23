"use client";

import { useActionState, useRef, useEffect } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { CONTACT_STATUSES, SOURCES } from "@/lib/validations";
import type { ActionState } from "@/lib/actions/contacts";
import { useDict } from "@/i18n/locale-context";
import { contactStatusLabel, sourceLabel } from "@/i18n/enum-labels";

type Owner = { id: string; name: string };
type CompanyOption = { id: string; name: string };

export function ContactForm({
  action,
  currentUser,
  owners,
  companies,
  defaultValues,
  submitLabel,
  compact,
  resetOnSuccess,
  returnTo,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  currentUser: { id: string; role: string };
  owners: Owner[];
  companies: CompanyOption[];
  defaultValues?: {
    name?: string;
    companyId?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedIn?: string | null;
    isDecisionMaker?: boolean;
    isPrimary?: boolean;
    source?: string | null;
    status?: string;
    notes?: string | null;
    tags?: string;
    ownerId?: string;
  };
  submitLabel: string;
  compact?: boolean;
  resetOnSuccess?: boolean;
  returnTo?: string;
}) {
  const dict = useDict();
  const [state, formAction, pending] = useActionState(action, null);
  const canAssignOwner = currentUser.role === "ADMIN";
  const formRef = useRef<HTMLFormElement>(null);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (resetOnSuccess && prevPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    prevPending.current = pending;
  }, [pending, state, resetOnSuccess]);

  if (compact) {
    return (
      <form ref={formRef} action={formAction} className="space-y-3">
        {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
        {defaultValues?.companyId ? (
          <input type="hidden" name="companyId" value={defaultValues.companyId} />
        ) : null}
        <input type="hidden" name="status" value="LEAD" />
        <input type="hidden" name="ownerId" value={defaultValues?.ownerId ?? currentUser.id} />
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Input name="name" required placeholder={dict.contacts.namePlaceholder} defaultValue={defaultValues?.name} />
          </div>
          <Input name="phone" placeholder={dict.contacts.phonePlaceholder} defaultValue={defaultValues?.phone ?? ""} />
          <Input name="email" type="email" placeholder={dict.contacts.emailPlaceholder} defaultValue={defaultValues?.email ?? ""} />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? dict.common.saving : submitLabel}
          </Button>
          <ModalFormTrigger
            title={dict.contacts.newContact}
            trigger={
              <button type="button" className="text-xs text-muted hover:text-foreground hover:underline">
                {dict.contacts.moreFields}
              </button>
            }
          >
            <ContactForm
              action={action}
              currentUser={currentUser}
              owners={owners}
              companies={companies}
              defaultValues={defaultValues}
              submitLabel={submitLabel}
            />
          </ModalFormTrigger>
        </div>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.fields.name} htmlFor="name">
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </Field>
        {companies.length > 0 ? (
          <Field label={dict.fields.account} htmlFor="companyId">
            <Select id="companyId" name="companyId" defaultValue={defaultValues?.companyId ?? ""}>
              <option value="">{dict.contacts.noAccount}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="companyId" value={defaultValues?.companyId ?? ""} />
        )}
        <Field label={dict.fields.jobTitle} htmlFor="jobTitle">
          <Input id="jobTitle" name="jobTitle" defaultValue={defaultValues?.jobTitle ?? ""} />
        </Field>
        <Field label={dict.fields.department} htmlFor="department">
          <Input id="department" name="department" defaultValue={defaultValues?.department ?? ""} />
        </Field>
        <Field label={dict.fields.email} htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
        </Field>
        <Field label={dict.fields.phone} htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
        </Field>
        <Field label={dict.fields.linkedIn} htmlFor="linkedIn">
          <Input id="linkedIn" name="linkedIn" placeholder={dict.contacts.linkedInPlaceholder} defaultValue={defaultValues?.linkedIn ?? ""} />
        </Field>
        <Field label={dict.contacts.leadSource} htmlFor="source">
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
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "LEAD"}>
            {CONTACT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {contactStatusLabel(dict, s)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={dict.fields.tags} htmlFor="tags">
            <Input
              id="tags"
              name="tags"
              placeholder={dict.contacts.tagsPlaceholder}
              defaultValue={defaultValues?.tags ?? ""}
            />
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

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isDecisionMaker"
            defaultChecked={defaultValues?.isDecisionMaker ?? false}
            className="size-4"
          />
          {dict.fields.decisionMaker}
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isPrimary"
            defaultChecked={defaultValues?.isPrimary ?? false}
            className="size-4"
          />
          {dict.contacts.primaryContactCheckbox}
        </label>
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
