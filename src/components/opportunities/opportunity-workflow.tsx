"use client";

import { ChevronUp, ChevronDown, Pencil, Workflow, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { PipelineStageForm } from "@/components/opportunities/pipeline-stage-form";
import { createPipelineStage, updatePipelineStage, deletePipelineStage, movePipelineStage } from "@/lib/actions/pipeline-stages";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/locale-context";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PipelineStageRow } from "@/lib/pipeline-stages";

function StageRow({
  stage,
  moveIndex,
  customStageCount,
  isCurrent,
  dict,
}: {
  stage: PipelineStageRow;
  moveIndex: number;
  customStageCount: number;
  isCurrent: boolean;
  dict: Dictionary;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0",
        isCurrent && "bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          title={isCurrent ? dict.pipelineStages.currentStageBadge : undefined}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md border",
            isCurrent ? "border-primary bg-primary text-primary-foreground" : "border-border"
          )}
        >
          {isCurrent ? <Check className="size-3.5" /> : null}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Workflow className="size-4" />
        </span>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {stage.label}
            {stage.isSystem ? <Badge tone="default">{dict.pipelineStages.systemBadge}</Badge> : null}
          </div>
          <div className="text-xs text-muted">
            {dict.pipelineStages.probabilitySuffix.replace("{pct}", String(stage.defaultProbability))}
          </div>
        </div>
      </div>
      {!stage.isSystem ? (
        <div className="flex items-center gap-1">
          <form action={movePipelineStage.bind(null, stage.id, "up")}>
            <button
              type="submit"
              aria-label={dict.pipelineStages.moveUp}
              disabled={moveIndex === 0}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
          </form>
          <form action={movePipelineStage.bind(null, stage.id, "down")}>
            <button
              type="submit"
              aria-label={dict.pipelineStages.moveDown}
              disabled={moveIndex === customStageCount - 1}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
          </form>
          <ModalFormTrigger
            title={dict.pipelineStages.editStage}
            trigger={
              <button
                type="button"
                className="rounded-lg p-2 text-muted transition-colors hover:bg-background hover:text-foreground"
              >
                <Pencil className="size-4" />
              </button>
            }
          >
            <PipelineStageForm
              action={updatePipelineStage.bind(null, stage.id)}
              defaultValues={{ label: stage.label, defaultProbability: stage.defaultProbability }}
              submitLabel={dict.common.saveChanges}
            />
          </ModalFormTrigger>
          <ConfirmDeleteForm
            action={deletePipelineStage.bind(null, stage.id)}
            confirmMessage={dict.pipelineStages.deleteConfirm}
            label={dict.common.delete}
            iconOnly
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * This Opportunity's own workflow steps — New and Won/Lost are always shown for context, but only the
 * custom steps in between (added here) are editable, and only for this one Opportunity. Adding, renaming,
 * reordering, or deleting a step here never touches any other Opportunity's workflow. Rendered inside a
 * Modal (opened from that Opportunity's board row). Purely for managing which steps exist — actually
 * moving the deal between them happens on its own row's stepper (`OpportunityStepper`), not here.
 */
export function OpportunityWorkflow({
  opportunityId,
  stages,
  currentStage,
}: {
  opportunityId: string;
  stages: PipelineStageRow[];
  currentStage: string;
}) {
  const dict = useDict();
  const newStage = stages.find((s) => s.id === "NEW");
  const customStages = stages.filter((s) => !s.isSystem);
  const closingStages = stages.filter((s) => s.isSystem && s.id !== "NEW");

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border">
        {newStage ? (
          <StageRow
            stage={newStage}
            moveIndex={-1}
            customStageCount={customStages.length}
            isCurrent={currentStage === newStage.id}
            dict={dict}
          />
        ) : null}
        {customStages.map((stage, i) => (
          <StageRow
            key={stage.id}
            stage={stage}
            moveIndex={i}
            customStageCount={customStages.length}
            isCurrent={currentStage === stage.id}
            dict={dict}
          />
        ))}
        {closingStages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            moveIndex={-1}
            customStageCount={customStages.length}
            isCurrent={currentStage === stage.id}
            dict={dict}
          />
        ))}
      </div>
      <PipelineStageForm action={createPipelineStage.bind(null, opportunityId)} submitLabel={dict.pipelineStages.addStage} />
    </div>
  );
}
