"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPES } from "@/lib/validations";
import { addActivity, type ActionState } from "@/lib/actions/activities";
import { formatDateTime } from "@/lib/utils";
import { useDict } from "@/i18n/locale-context";
import { activityTypeLabel } from "@/i18n/enum-labels";

type ActivityItem = {
  id: string;
  type: string;
  content: string;
  createdAt: string | Date;
  user: { name: string };
};

export function ActivityTimeline({
  activities,
  leadId,
  companyId,
  contactId,
  opportunityId,
}: {
  activities: ActivityItem[];
  leadId?: string;
  companyId?: string;
  contactId?: string;
  opportunityId?: string;
}) {
  const dict = useDict();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addActivity, null);
  const formRef = useRef<HTMLFormElement>(null);
  const prevPending = useRef(pending);
  const [type, setType] = useState("NOTE");
  const showReminder = type === "MEETING" || type === "FOLLOW_UP";

  useEffect(() => {
    if (prevPending.current && !pending && !state?.error) {
      formRef.current?.reset();
      setType("NOTE");
    }
    prevPending.current = pending;
  }, [pending, state]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-border p-3">
        {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        {companyId ? <input type="hidden" name="companyId" value={companyId} /> : null}
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {opportunityId ? <input type="hidden" name="opportunityId" value={opportunityId} /> : null}
        <div className="flex items-center gap-2">
          <Select name="type" value={type} onChange={(e) => setType(e.target.value)} className="w-40">
            {ACTIVITY_TYPES.filter((t) => t !== "STAGE_CHANGE").map((t) => (
              <option key={t} value={t}>
                {activityTypeLabel(dict, t)}
              </option>
            ))}
          </Select>
          <div className="flex-1 text-xs text-muted">{dict.activityTimeline.logUpdate}</div>
        </div>
        <Textarea name="content" required placeholder={dict.activityTimeline.contentPlaceholder} />
        {showReminder ? (
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="remindAt">
              {dict.activityTimeline.remindLabel}
            </label>
            <Input id="remindAt" type="date" name="remindAt" className="w-48" />
          </div>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? dict.common.adding : dict.common.add}
        </Button>
      </form>

      <ol className="space-y-3">
        {activities.map((a) => (
          <li key={a.id} className="flex gap-3 border-s-2 border-border ps-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="font-medium text-foreground">{activityTypeLabel(dict, a.type)}</span>
                <span>·</span>
                <span>{a.user.name}</span>
                <span>·</span>
                <span>{formatDateTime(a.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{a.content}</p>
            </div>
          </li>
        ))}
        {activities.length === 0 ? (
          <li className="text-sm text-muted">{dict.activityTimeline.noActivityYet}</li>
        ) : null}
      </ol>
    </div>
  );
}
