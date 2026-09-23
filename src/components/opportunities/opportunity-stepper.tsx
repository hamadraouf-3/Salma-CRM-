"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { stageGateCheck, type StageGateFailure } from "@/lib/validations";
import { resolveStageLabel } from "@/i18n/enum-labels";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/locale-context";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PipelineStageRow } from "@/lib/pipeline-stages";

/** Lets the user supply, right here, whichever field blocked the move (a value or a next action) instead
 * of having to leave this row for the Opportunity's own edit form. */
function GateFixForm({
  missing,
  dict,
  onSubmit,
}: {
  missing: StageGateFailure["missing"];
  dict: Dictionary;
  onSubmit: (raw: string) => void;
}) {
  const [input, setInput] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!input.trim()) return;
        onSubmit(input);
      }}
      className="mt-2 space-y-2 rounded-lg bg-warning-bg/40 px-3 py-2.5 text-sm"
    >
      <p className="text-xs text-warning">
        {missing === "value" ? dict.pipelineStages.gateValuePrompt : dict.pipelineStages.gateNextActionPrompt}
      </p>
      <Field label={missing === "value" ? dict.fields.value : dict.fields.nextAction} htmlFor="gateFixInput">
        <div className="flex gap-2">
          <Input
            id="gateFixInput"
            type={missing === "value" ? "number" : "text"}
            min={missing === "value" ? 0.01 : undefined}
            step={missing === "value" ? 0.01 : undefined}
            required
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" size="sm" className="shrink-0">
            {dict.pipelineStages.gateSubmit}
          </Button>
        </div>
      </Field>
    </form>
  );
}

/**
 * This one Opportunity's own progress track — New, then its own custom steps in order, then Won and Lost —
 * rendered as a single row so each deal's path is visible (and clickable) on its own line, instead of
 * sharing columns with every other Opportunity on a shared board. Clicking any step moves the deal there
 * directly; a blocked move (missing value or next action) opens an inline fix right under the track instead
 * of just failing.
 */
export function OpportunityStepper({
  stages,
  currentStage,
  currentValue,
  currentNextAction,
  onMoveStage,
}: {
  /** This Opportunity's own stages only — the 3 system ones plus any custom steps it owns. */
  stages: PipelineStageRow[];
  currentStage: string;
  currentValue: number;
  currentNextAction: string | null;
  onMoveStage: (stageId: string, gateFix?: { value?: number; nextAction?: string }) => void;
}) {
  const dict = useDict();
  const ordered = [...stages].sort((a, b) => a.order - b.order);
  const [pendingFix, setPendingFix] = useState<{ stageId: string; missing: StageGateFailure["missing"] } | null>(null);

  function handleClick(stageId: string) {
    if (stageId === currentStage) return;
    const gateFailure = stageGateCheck(stageId, currentValue, currentNextAction);
    if (gateFailure) {
      setPendingFix({ stageId, missing: gateFailure.missing });
      return;
    }
    setPendingFix(null);
    onMoveStage(stageId);
  }

  function handleSubmitFix(stageId: string, missing: StageGateFailure["missing"], raw: string) {
    setPendingFix(null);
    onMoveStage(stageId, missing === "value" ? { value: Number(raw) } : { nextAction: raw });
  }

  const currentIndex = ordered.findIndex((s) => s.id === currentStage);

  return (
    <div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {ordered.map((stage, i) => {
          const isCurrent = stage.id === currentStage;
          const isClosing = stage.id === "WON" || stage.id === "LOST";
          const isPassed = !isCurrent && !isClosing && i < currentIndex;
          const travelled = i <= currentIndex || (isCurrent && isClosing);
          return (
            <div key={stage.id} className="flex shrink-0 items-center gap-1">
              {i > 0 ? (
                <span className={cn("h-px w-4 shrink-0 transition-colors", travelled ? "bg-primary/40" : "bg-border")} />
              ) : null}
              <button
                type="button"
                onClick={() => handleClick(stage.id)}
                disabled={isCurrent}
                title={resolveStageLabel(dict, stage.id, stages)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-all disabled:cursor-default",
                  isCurrent
                    ? stage.id === "WON"
                      ? "border-success bg-success-bg text-success shadow-sm"
                      : stage.id === "LOST"
                        ? "border-danger bg-danger-bg text-danger shadow-sm"
                        : "border-primary bg-primary/10 text-primary shadow-sm"
                    : isPassed
                      ? "border-primary/25 bg-primary/5 text-muted hover:border-primary hover:text-primary"
                      : "border-border text-muted hover:border-primary hover:text-primary hover:-translate-y-px"
                )}
              >
                {isCurrent ? <Check className="size-3" /> : null}
                {resolveStageLabel(dict, stage.id, stages)}
              </button>
            </div>
          );
        })}
      </div>
      {pendingFix ? (
        <GateFixForm
          missing={pendingFix.missing}
          dict={dict}
          onSubmit={(raw) => handleSubmitFix(pendingFix.stageId, pendingFix.missing, raw)}
        />
      ) : null}
    </div>
  );
}
