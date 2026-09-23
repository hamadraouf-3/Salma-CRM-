"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Workflow as WorkflowIcon, Handshake, AlertTriangle, Users, Flame } from "lucide-react";
import { type OpportunityStage } from "@/lib/validations";
import { updateOpportunityStage } from "@/lib/actions/opportunities";
import { cn, formatCurrency } from "@/lib/utils";
import { useDict } from "@/i18n/locale-context";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { EmptyState } from "@/components/ui/empty-state";
import { OpportunityWorkflow } from "@/components/opportunities/opportunity-workflow";
import { OpportunityStepper } from "@/components/opportunities/opportunity-stepper";
import type { PipelineStageRow } from "@/lib/pipeline-stages";

export type BoardOpportunity = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  stageChangedAt: Date;
  nextAction: string | null;
  visibility: string;
  contact: { name: string };
  owner: { id: string; name: string };
  convertedFromLead: { id: string; owner: { name: string } } | null;
};

const STALE_DAYS = 14;

function daysInStage(stageChangedAt: Date) {
  return Math.floor((Date.now() - new Date(stageChangedAt).getTime()) / 86_400_000);
}

export function OpportunityBoard({
  initialOpportunities,
  stages,
  isAdmin,
  currentUserId,
}: {
  initialOpportunities: BoardOpportunity[];
  /** System stages plus every visible Opportunity's own custom workflow steps, all in one bulk list. */
  stages: PipelineStageRow[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const dict = useDict();
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function moveOpportunity(
    opportunityId: string,
    stage: OpportunityStage,
    gateFix?: { value?: number; nextAction?: string }
  ) {
    const opportunity = opportunities.find((o) => o.id === opportunityId);
    if (!opportunity || opportunity.stage === stage) return;

    const previous = {
      stage: opportunity.stage,
      probability: opportunity.probability,
      stageChangedAt: opportunity.stageChangedAt,
      value: opportunity.value,
      nextAction: opportunity.nextAction,
    };
    const newProbability = stages.find((s) => s.id === stage)?.defaultProbability ?? opportunity.probability;
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === opportunityId
          ? {
              ...o,
              stage,
              probability: newProbability,
              stageChangedAt: new Date(),
              value: gateFix?.value ?? o.value,
              nextAction: gateFix?.nextAction ?? o.nextAction,
            }
          : o
      )
    );

    startTransition(async () => {
      try {
        await updateOpportunityStage(opportunityId, stage, gateFix);
      } catch (err) {
        setError(err instanceof Error ? err.message : dict.opportunities.couldNotUpdateStage);
        setOpportunities((prev) => prev.map((o) => (o.id === opportunityId ? { ...o, ...previous } : o)));
      }
    });
  }

  return (
    <div className="space-y-3">
      {error ? <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div> : null}
      {opportunities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border">
          <EmptyState icon={Handshake} message={dict.opportunities.emptyAll} />
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opportunity) => {
            const stale =
              opportunity.stage !== "WON" &&
              opportunity.stage !== "LOST" &&
              daysInStage(opportunity.stageChangedAt) >= STALE_DAYS;
            const ownStages = stages.filter((s) => s.isSystem || s.opportunityId === opportunity.id);
            const canManageWorkflow = isAdmin || opportunity.owner.id === currentUserId;
            return (
              <div
                key={opportunity.id}
                className={cn(
                  "rounded-lg border bg-surface p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)]",
                  stale ? "border-warning/40" : "border-border"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/opportunities/${opportunity.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {opportunity.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span>
                        {opportunity.contact.name} · {opportunity.owner.name}
                      </span>
                      {opportunity.visibility === "EVERYONE" ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary"
                          title={dict.opportunities.visibleToEveryone}
                        >
                          <Users className="size-3" />
                        </span>
                      ) : null}
                      {opportunity.convertedFromLead ? (
                        <Link
                          href={`/leads/${opportunity.convertedFromLead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-1.5 py-0.5 text-warning hover:underline"
                          title={dict.opportunities.fromLeadTooltip.replace("{name}", opportunity.convertedFromLead.owner.name)}
                        >
                          <Flame className="size-3" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <div className="text-sm font-medium text-foreground">
                        {formatCurrency(opportunity.value, opportunity.currency)}
                      </div>
                      <div className="text-xs text-muted">{opportunity.probability}%</div>
                    </div>
                    {stale ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">
                        <AlertTriangle className="size-3" />
                        {dict.opportunities.daysStale.replace("{days}", String(daysInStage(opportunity.stageChangedAt)))}
                      </span>
                    ) : null}
                    {canManageWorkflow ? (
                      <ModalFormTrigger
                        title={dict.pipelineStages.sectionTitle}
                        description={opportunity.title}
                        trigger={
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-primary"
                          >
                            <WorkflowIcon className="size-4" />
                          </button>
                        }
                      >
                        <OpportunityWorkflow opportunityId={opportunity.id} stages={ownStages} currentStage={opportunity.stage} />
                      </ModalFormTrigger>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  <OpportunityStepper
                    stages={ownStages}
                    currentStage={opportunity.stage}
                    currentValue={opportunity.value}
                    currentNextAction={opportunity.nextAction}
                    onMoveStage={(stageId, gateFix) => moveOpportunity(opportunity.id, stageId, gateFix)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
