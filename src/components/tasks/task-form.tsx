"use client";

import { useActionState, useRef, useEffect } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITIES, TASK_TYPES } from "@/lib/validations";
import type { ActionState } from "@/lib/actions/tasks";
import { useDict } from "@/i18n/locale-context";
import { taskPriorityLabel, taskTypeLabel } from "@/i18n/enum-labels";
import { toDatetimeLocalValue } from "@/lib/utils";

type Option = { id: string; name: string };

export function TaskForm({
  action,
  currentUser,
  assignees,
  contacts,
  opportunities,
  defaultValues,
  submitLabel,
  compact,
  resetOnSuccess,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  currentUser: { id: string; role: string };
  assignees: Option[];
  contacts?: Option[];
  opportunities?: Option[];
  defaultValues?: {
    title?: string;
    description?: string | null;
    dueDate?: Date | string | null;
    priority?: string;
    type?: string;
    assigneeId?: string;
    leadId?: string | null;
    companyId?: string | null;
    contactId?: string | null;
    opportunityId?: string | null;
  };
  submitLabel: string;
  compact?: boolean;
  resetOnSuccess?: boolean;
}) {
  const dict = useDict();
  const [state, formAction, pending] = useActionState(action, null);
  const canAssign = currentUser.role === "ADMIN";
  const formRef = useRef<HTMLFormElement>(null);
  const prevPending = useRef(pending);
  const dateValue = defaultValues?.dueDate ? toDatetimeLocalValue(defaultValues.dueDate) : "";

  useEffect(() => {
    if (resetOnSuccess && prevPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    prevPending.current = pending;
  }, [pending, state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div>
      ) : null}

      <div className={compact ? "grid gap-3 sm:grid-cols-4" : "grid gap-4 sm:grid-cols-2"}>
        <div className={compact ? "sm:col-span-2" : ""}>
          <Field label={dict.tasks.taskTitle} htmlFor="title">
            <Input id="title" name="title" required defaultValue={defaultValues?.title} />
          </Field>
        </div>
        <Field label={dict.tasks.typeLabel} htmlFor="type">
          <Select id="type" name="type" defaultValue={defaultValues?.type ?? "OTHER"}>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {taskTypeLabel(dict, t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.tasks.dueDateTime} htmlFor="dueDate">
          <Input id="dueDate" name="dueDate" type="datetime-local" defaultValue={dateValue} />
        </Field>
        <Field label={dict.fields.priority} htmlFor="priority">
          <Select id="priority" name="priority" defaultValue={defaultValues?.priority ?? "MEDIUM"}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {taskPriorityLabel(dict, p)}
              </option>
            ))}
          </Select>
        </Field>

        {!compact && contacts ? (
          <Field label={dict.tasks.contactOptional} htmlFor="contactId">
            <Select id="contactId" name="contactId" defaultValue={defaultValues?.contactId ?? ""}>
              <option value="">{dict.common.none}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          defaultValues?.contactId ? <input type="hidden" name="contactId" value={defaultValues.contactId} /> : null
        )}
        {!compact && opportunities ? (
          <Field label={dict.tasks.opportunityOptional} htmlFor="opportunityId">
            <Select id="opportunityId" name="opportunityId" defaultValue={defaultValues?.opportunityId ?? ""}>
              <option value="">{dict.common.none}</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          defaultValues?.opportunityId ? <input type="hidden" name="opportunityId" value={defaultValues.opportunityId} /> : null
        )}
        {defaultValues?.leadId ? <input type="hidden" name="leadId" value={defaultValues.leadId} /> : null}
        {defaultValues?.companyId ? <input type="hidden" name="companyId" value={defaultValues.companyId} /> : null}

        {canAssign ? (
          <Field label={dict.fields.assignee} htmlFor="assigneeId">
            <Select id="assigneeId" name="assigneeId" defaultValue={defaultValues?.assigneeId ?? currentUser.id}>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="assigneeId" value={currentUser.id} />
        )}
      </div>

      {!compact ? (
        <Field label={dict.fields.description} htmlFor="description">
          <Textarea id="description" name="description" defaultValue={defaultValues?.description ?? ""} />
        </Field>
      ) : null}

      <Button type="submit" size={compact ? "sm" : "md"} disabled={pending}>
        {pending ? dict.common.saving : submitLabel}
      </Button>
    </form>
  );
}
