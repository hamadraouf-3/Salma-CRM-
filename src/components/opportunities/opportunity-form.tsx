"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import {
  SYSTEM_STAGE_DEFAULT_PROBABILITY,
  LOST_REASONS,
  SOURCES,
  DEFAULT_CURRENCY,
  type OpportunityStage,
} from "@/lib/validations";
import type { ActionState } from "@/lib/actions/opportunities";
import type { PipelineStageRow } from "@/lib/pipeline-stages";
import { useDict } from "@/i18n/locale-context";
import { resolveStageLabel, lostReasonLabel, sourceLabel } from "@/i18n/enum-labels";

type Option = { id: string; name: string };

const CURRENCIES = ["JOD", "USD", "EUR", "GBP", "SAR", "AED"];

export function OpportunityForm({
  action,
  currentUser,
  owners,
  contacts,
  companies,
  stages,
  defaultValues,
  submitLabel,
  compact,
  resetOnSuccess,
  returnTo,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  currentUser: { id: string; role: string };
  owners: Option[];
  contacts: Option[];
  companies: Option[];
  stages: PipelineStageRow[];
  defaultValues?: {
    title?: string;
    value?: number;
    currency?: string;
    stage?: string;
    probability?: number;
    lostReason?: string | null;
    source?: string | null;
    competitor?: string | null;
    nextAction?: string | null;
    companyId?: string | null;
    contactId?: string;
    ownerId?: string;
    visibility?: string;
    expectedCloseDate?: Date | string | null;
  };
  submitLabel: string;
  compact?: boolean;
  resetOnSuccess?: boolean;
  returnTo?: string;
}) {
  const dict = useDict();
  const [state, formAction, pending] = useActionState(action, null);
  const canAssignOwner = currentUser.role === "ADMIN";
  const dateValue = defaultValues?.expectedCloseDate
    ? new Date(defaultValues.expectedCloseDate).toISOString().slice(0, 10)
    : "";

  const [stage, setStage] = useState<OpportunityStage>((defaultValues?.stage as OpportunityStage) ?? "NEW");
  const [probability, setProbability] = useState(
    defaultValues?.probability ?? stages.find((s) => s.id === stage)?.defaultProbability ?? 10
  );

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
        <input type="hidden" name="stage" value="NEW" />
        <input type="hidden" name="probability" value={SYSTEM_STAGE_DEFAULT_PROBABILITY.NEW} />
        <input type="hidden" name="currency" value={DEFAULT_CURRENCY} />
        <input type="hidden" name="ownerId" value={defaultValues?.ownerId ?? currentUser.id} />
        {defaultValues?.companyId ? (
          <input type="hidden" name="companyId" value={defaultValues.companyId} />
        ) : null}
        {defaultValues?.contactId ? (
          <input type="hidden" name="contactId" value={defaultValues.contactId} />
        ) : null}
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Input name="title" required placeholder={dict.opportunities.titlePlaceholder} defaultValue={defaultValues?.title} />
          </div>
          {!defaultValues?.contactId ? (
            <Select name="contactId" required defaultValue="">
              <option value="" disabled>
                {dict.opportunities.selectContact}
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Input name="value" type="number" min="0" step="0.01" placeholder={dict.opportunities.valuePlaceholder} defaultValue={defaultValues?.value ?? ""} />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? dict.common.saving : submitLabel}
          </Button>
          <ModalFormTrigger
            title={dict.opportunities.newOpportunity}
            trigger={
              <button type="button" className="text-xs text-muted hover:text-foreground hover:underline">
                {dict.opportunities.moreFields}
              </button>
            }
          >
            <OpportunityForm
              action={action}
              currentUser={currentUser}
              owners={owners}
              contacts={contacts}
              companies={companies}
              stages={stages}
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
        <Field label={dict.opportunities.opportunityTitle} htmlFor="title">
          <Input id="title" name="title" required defaultValue={defaultValues?.title} />
        </Field>
        {companies.length > 0 ? (
          <Field label={dict.opportunities.account} htmlFor="companyId">
            <Select id="companyId" name="companyId" defaultValue={defaultValues?.companyId ?? ""}>
              <option value="">{dict.opportunities.noAccount}</option>
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
        {contacts.length > 0 ? (
          <Field label={dict.opportunities.contact} htmlFor="contactId">
            <Select id="contactId" name="contactId" required defaultValue={defaultValues?.contactId ?? ""}>
              <option value="" disabled>
                {dict.opportunities.selectContact}
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="contactId" value={defaultValues?.contactId ?? ""} />
        )}
        <Field label={dict.fields.value} htmlFor="value">
          <Input id="value" name="value" type="number" min="0" step="0.01" defaultValue={defaultValues?.value ?? 0} />
        </Field>
        <Field label={dict.opportunities.currency} htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={defaultValues?.currency ?? DEFAULT_CURRENCY}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.opportunities.stage} htmlFor="stage">
          <Select
            id="stage"
            name="stage"
            value={stage}
            onChange={(e) => {
              const next = e.target.value as OpportunityStage;
              setStage(next);
              setProbability(stages.find((s) => s.id === next)?.defaultProbability ?? 50);
            }}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {resolveStageLabel(dict, s.id, stages)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.opportunities.winProbability.replace("{pct}", String(probability))} htmlFor="probability">
          <input
            id="probability"
            name="probability"
            type="range"
            min={0}
            max={100}
            step={5}
            value={probability}
            onChange={(e) => setProbability(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </Field>
        <Field label={dict.opportunities.expectedCloseDate} htmlFor="expectedCloseDate">
          <Input id="expectedCloseDate" name="expectedCloseDate" type="date" defaultValue={dateValue} />
        </Field>
        <Field label={dict.opportunities.leadSource} htmlFor="source">
          <Select id="source" name="source" defaultValue={defaultValues?.source ?? ""}>
            <option value="">{dict.common.unspecified}</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {sourceLabel(dict, s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.opportunities.competitorOptional} htmlFor="competitor">
          <Input id="competitor" name="competitor" defaultValue={defaultValues?.competitor ?? ""} />
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
        {canAssignOwner ? (
          <Field label={dict.opportunities.visibilityLabel} htmlFor="visibility">
            <Select id="visibility" name="visibility" defaultValue={defaultValues?.visibility ?? "OWNER"}>
              <option value="OWNER">{dict.opportunities.visibilityOwnerOnly}</option>
              <option value="EVERYONE">{dict.opportunities.visibilityEveryone}</option>
            </Select>
          </Field>
        ) : null}
        {stage === "LOST" ? (
          <Field label={dict.opportunities.lostReason} htmlFor="lostReason">
            <Select id="lostReason" name="lostReason" defaultValue={defaultValues?.lostReason ?? ""}>
              <option value="" disabled>
                {dict.opportunities.selectReason}
              </option>
              {LOST_REASONS.map((r) => (
                <option key={r} value={r}>
                  {lostReasonLabel(dict, r)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <Field label={dict.opportunities.nextActionOptional} htmlFor="nextAction">
        <Textarea id="nextAction" name="nextAction" rows={2} defaultValue={defaultValues?.nextAction ?? ""} />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? dict.common.saving : submitLabel}
      </Button>
    </form>
  );
}
