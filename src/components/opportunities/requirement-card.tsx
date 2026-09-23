"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEPLOYMENT_OPTIONS } from "@/lib/validations";
import { upsertRequirement, type ActionState } from "@/lib/actions/requirements";
import { useDict } from "@/i18n/locale-context";
import { deploymentOptionLabel } from "@/i18n/enum-labels";

type RequirementData = {
  businessProblem: string | null;
  customerObjective: string | null;
  requiredSolution: string | null;
  functionalRequirements: string | null;
  technicalRequirements: string | null;
  deployment: string | null;
  infrastructureNotes: string | null;
} | null;

export function RequirementCard({
  opportunityId,
  requirement,
  canEdit,
}: {
  opportunityId: string;
  requirement: RequirementData;
  canEdit: boolean;
}) {
  const dict = useDict();
  const [editing, setEditing] = useState(!requirement);
  const boundAction = upsertRequirement.bind(null, opportunityId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, null);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    prevPending.current = pending;
  }, [pending, state]);

  if (!editing) {
    return (
      <Card>
        <CardHeader
          title={dict.opportunities.customerRequirements}
          action={
            canEdit ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
                {dict.common.edit}
              </Button>
            ) : null
          }
        />
        <CardBody className="space-y-3 text-sm">
          {requirement!.businessProblem ? (
            <div>
              <div className="text-xs text-muted">{dict.opportunities.businessProblem}</div>
              <p className="whitespace-pre-wrap text-foreground">{requirement!.businessProblem}</p>
            </div>
          ) : null}
          {requirement!.customerObjective ? (
            <div>
              <div className="text-xs text-muted">{dict.opportunities.customerObjective}</div>
              <p className="whitespace-pre-wrap text-foreground">{requirement!.customerObjective}</p>
            </div>
          ) : null}
          {requirement!.requiredSolution ? (
            <div>
              <div className="text-xs text-muted">{dict.opportunities.requiredSolution}</div>
              <p className="whitespace-pre-wrap text-foreground">{requirement!.requiredSolution}</p>
            </div>
          ) : null}
          {requirement!.functionalRequirements ? (
            <div>
              <div className="text-xs text-muted">{dict.opportunities.functionalRequirements}</div>
              <p className="whitespace-pre-wrap text-foreground">{requirement!.functionalRequirements}</p>
            </div>
          ) : null}
          {requirement!.technicalRequirements ? (
            <div>
              <div className="text-xs text-muted">{dict.opportunities.technicalRequirements}</div>
              <p className="whitespace-pre-wrap text-foreground">{requirement!.technicalRequirements}</p>
            </div>
          ) : null}
          {requirement!.deployment ? (
            <div className="border-t border-border pt-3 text-xs text-muted">
              {dict.opportunities.deployment}
              <div className="text-foreground">
                {deploymentOptionLabel(dict, requirement!.deployment)}
              </div>
            </div>
          ) : null}
          {requirement!.infrastructureNotes ? (
            <div>
              <div className="text-xs text-muted">{dict.opportunities.infrastructureNotes}</div>
              <p className="whitespace-pre-wrap text-foreground">{requirement!.infrastructureNotes}</p>
            </div>
          ) : null}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={dict.opportunities.customerRequirements} />
      <CardBody>
        <form action={formAction} className="space-y-4">
          {state?.error ? <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={dict.opportunities.businessProblem} htmlFor="businessProblem">
              <Textarea id="businessProblem" name="businessProblem" rows={2} defaultValue={requirement?.businessProblem ?? ""} />
            </Field>
            <Field label={dict.opportunities.customerObjective} htmlFor="customerObjective">
              <Textarea id="customerObjective" name="customerObjective" rows={2} defaultValue={requirement?.customerObjective ?? ""} />
            </Field>
            <Field label={dict.opportunities.requiredSolution} htmlFor="requiredSolution">
              <Textarea id="requiredSolution" name="requiredSolution" rows={2} defaultValue={requirement?.requiredSolution ?? ""} />
            </Field>
            <Field label={dict.opportunities.functionalRequirements} htmlFor="functionalRequirements">
              <Textarea id="functionalRequirements" name="functionalRequirements" rows={2} defaultValue={requirement?.functionalRequirements ?? ""} />
            </Field>
            <Field label={dict.opportunities.technicalRequirements} htmlFor="technicalRequirements">
              <Textarea id="technicalRequirements" name="technicalRequirements" rows={2} defaultValue={requirement?.technicalRequirements ?? ""} />
            </Field>
            <Field label={dict.opportunities.deployment} htmlFor="deployment">
              <Select id="deployment" name="deployment" defaultValue={requirement?.deployment ?? ""}>
                <option value="">{dict.common.unspecified}</option>
                {DEPLOYMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {deploymentOptionLabel(dict, d)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={dict.opportunities.infrastructureNotes} htmlFor="infrastructureNotes">
            <Textarea id="infrastructureNotes" name="infrastructureNotes" rows={2} defaultValue={requirement?.infrastructureNotes ?? ""} />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? dict.common.saving : dict.common.save}
            </Button>
            {requirement ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
                {dict.common.cancel}
              </Button>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
