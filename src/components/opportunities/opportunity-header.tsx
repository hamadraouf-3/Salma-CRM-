"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { deleteOpportunity, updateOpportunity } from "@/lib/actions/opportunities";
import { type OpportunityStage } from "@/lib/validations";
import { opportunityStageTone } from "@/lib/badge-tones";
import { formatCurrency } from "@/lib/utils";
import { useDict } from "@/i18n/locale-context";
import { resolveStageLabel, opportunityPriorityLabel, opportunityTypeLabel } from "@/i18n/enum-labels";
import type { PipelineStageRow } from "@/lib/pipeline-stages";

type Option = { id: string; name: string };

export function OpportunityHeader({
  opportunity,
  canEdit,
  weightedValue,
  isStale,
  daysInStage,
  currentUser,
  owners,
  contacts,
  companies,
  stages,
}: {
  opportunity: {
    id: string;
    title: string;
    stage: string;
    priority: string | null;
    opportunityType: string | null;
    value: number;
    currency: string;
    probability: number;
    lostReason: string | null;
    source: string | null;
    competitor: string | null;
    nextAction: string | null;
    companyId: string | null;
    contactId: string;
    ownerId: string;
    expectedCloseDate: Date | string | null;
    contact: { id: string; name: string };
    company: { id: string; name: string } | null;
    owner: { name: string };
  };
  canEdit: boolean;
  weightedValue: number;
  isStale: boolean;
  daysInStage: number;
  currentUser: { id: string; role: string };
  owners: Option[];
  contacts: Option[];
  companies: Option[];
  stages: PipelineStageRow[];
}) {
  const dict = useDict();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Card>
        <CardHeader title={dict.opportunities.editOpportunity} />
        <CardBody>
          <OpportunityForm
            action={updateOpportunity.bind(null, opportunity.id)}
            currentUser={currentUser}
            owners={owners}
            contacts={contacts}
            companies={companies}
            stages={stages}
            defaultValues={opportunity}
            submitLabel={dict.common.saveChanges}
          />
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setEditing(false)}>
            {dict.common.cancel}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">{opportunity.title}</h1>
          <Badge tone={opportunityStageTone[opportunity.stage as OpportunityStage] ?? "primary"}>
            {resolveStageLabel(dict, opportunity.stage, stages)}
          </Badge>
          {isStale ? <Badge tone="warning">{dict.opportunities.staleLabel.replace("{days}", String(daysInStage))}</Badge> : null}
          {opportunity.priority ? (
            <Badge tone={opportunity.priority === "URGENT" ? "danger" : "default"}>
              {opportunityPriorityLabel(dict, opportunity.priority)}
            </Badge>
          ) : null}
          {opportunity.opportunityType ? (
            <Badge tone="default">
              {opportunityTypeLabel(dict, opportunity.opportunityType)}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted">
          {dict.opportunities.contactLabel} <Link href={`/contacts/${opportunity.contactId}`} className="text-primary hover:underline">{opportunity.contact.name}</Link>
          {opportunity.company ? (
            <>
              {" · "}{dict.opportunities.accountLabel}{" "}
              <Link href={`/companies/${opportunity.company.id}`} className="text-primary hover:underline">
                {opportunity.company.name}
              </Link>
            </>
          ) : null}
          {" · "}{dict.opportunities.ownerLabel} {opportunity.owner.name}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-end">
          <span className="text-lg font-semibold text-foreground">
            {formatCurrency(opportunity.value, opportunity.currency)}
          </span>
          <div className="text-xs text-muted">
            {opportunity.probability}% · {dict.opportunities.weightedSuffix.replace("{value}", formatCurrency(weightedValue, opportunity.currency))}
          </div>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              {dict.common.edit}
            </Button>
            <ConfirmDeleteForm
              action={deleteOpportunity.bind(null, opportunity.id)}
              confirmMessage={dict.opportunities.deleteConfirm}
              label={dict.common.delete}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
