"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TARGET_TYPES, TARGET_PERIOD_TYPES, DEFAULT_CURRENCY, type TargetPeriodType } from "@/lib/validations";
import type { ActionState } from "@/lib/actions/targets";
import { useDict, useLocale } from "@/i18n/locale-context";
import { targetTypeLabel, targetPeriodTypeLabel } from "@/i18n/enum-labels";

const CURRENCIES = ["JOD", "USD", "EUR", "GBP", "SAR", "AED"];

type AccountManagerOption = { id: string; name: string };

export function TargetForm({
  action,
  accountManagers,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  accountManagers: AccountManagerOption[];
  defaultValues?: {
    userId?: string;
    targetType?: string;
    periodType?: string;
    year?: number;
    periodNumber?: number;
    targetValue?: number;
    currency?: string;
  };
  submitLabel: string;
}) {
  const dict = useDict();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const [periodType, setPeriodType] = useState<TargetPeriodType>((defaultValues?.periodType as TargetPeriodType) ?? "MONTHLY");
  const [targetType, setTargetType] = useState(defaultValues?.targetType ?? "REVENUE");

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", { month: "long" }).format(new Date(2000, i, 1)),
  }));

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.targets.accountManager} htmlFor="userId">
          <Select id="userId" name="userId" required defaultValue={defaultValues?.userId ?? ""}>
            <option value="" disabled>
              {dict.targets.selectAccountManager}
            </option>
            {accountManagers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={dict.targets.targetType} htmlFor="targetType">
          <Select id="targetType" name="targetType" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>
                {targetTypeLabel(dict, t)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={dict.targets.periodType} htmlFor="periodType">
          <Select
            id="periodType"
            name="periodType"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as TargetPeriodType)}
          >
            {TARGET_PERIOD_TYPES.map((t) => (
              <option key={t} value={t}>
                {targetPeriodTypeLabel(dict, t)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={dict.targets.year} htmlFor="year">
          <Input
            id="year"
            name="year"
            type="number"
            required
            min={2000}
            max={2100}
            defaultValue={defaultValues?.year ?? new Date().getFullYear()}
          />
        </Field>

        {periodType === "MONTHLY" ? (
          <Field label={dict.targets.month} htmlFor="periodNumber">
            <Select id="periodNumber" name="periodNumber" defaultValue={defaultValues?.periodNumber ?? new Date().getMonth() + 1}>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {periodType === "QUARTERLY" ? (
          <Field label={dict.targets.quarter} htmlFor="periodNumber">
            <Select id="periodNumber" name="periodNumber" defaultValue={defaultValues?.periodNumber ?? 1}>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {periodType === "YEARLY" ? <input type="hidden" name="periodNumber" value={1} /> : null}

        <Field label={dict.targets.targetValue} htmlFor="targetValue">
          <Input
            id="targetValue"
            name="targetValue"
            type="number"
            min="0"
            step={targetType === "DEALS_WON" ? "1" : "0.01"}
            required
            defaultValue={defaultValues?.targetValue ?? ""}
          />
        </Field>

        {targetType === "REVENUE" ? (
          <Field label={dict.targets.currency} htmlFor="currency">
            <Select id="currency" name="currency" defaultValue={defaultValues?.currency ?? DEFAULT_CURRENCY}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="currency" value={DEFAULT_CURRENCY} />
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? dict.common.saving : submitLabel}
      </Button>
    </form>
  );
}
