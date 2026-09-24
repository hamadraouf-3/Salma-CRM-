"use client";

import { Pencil, Archive, RotateCcw, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarWithName } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { ServerActionForm } from "@/components/server-action-form";
import { TargetForm } from "@/components/targets/target-form";
import { setTargetStatus, updateTarget, deleteTarget } from "@/lib/actions/targets";
import { useDict } from "@/i18n/locale-context";
import { targetTypeLabel, targetStatusLabel } from "@/i18n/enum-labels";
import { formatCurrency } from "@/lib/utils";

export type TargetRow = {
  id: string;
  accountManagerName: string;
  periodLabel: string;
  targetType: string;
  targetValue: number;
  currency: string;
  status: string;
  actual: number;
  achievementPct: number;
  // Only needed to prefill the edit modal — omitted by read-only views (e.g. the Dashboard).
  userId?: string;
  periodType?: string;
  year?: number;
  periodNumber?: number;
};

type AccountManagerOption = { id: string; name: string };

const statusTone: Record<string, "default" | "success" | "warning" | "primary"> = {
  DRAFT: "default",
  ACTIVE: "primary",
  COMPLETED: "success",
  ARCHIVED: "warning",
};

function formatTargetValue(row: { targetType: string; value: number; currency: string }) {
  return row.targetType === "REVENUE" ? formatCurrency(row.value, row.currency) : String(row.value);
}

export function TargetsTable({
  rows,
  canManage,
  accountManagers,
  flash,
}: {
  rows: TargetRow[];
  canManage: boolean;
  accountManagers?: AccountManagerOption[];
  flash?: string | null;
}) {
  const dict = useDict();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="px-4 py-3 text-start font-medium">{dict.targets.colAccountManager}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.targets.colPeriod}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.targets.colType}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.targets.colTarget}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.targets.colAchieved}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.targets.colAchievement}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.targets.colStatus}</th>
            {canManage ? <th className="px-4 py-3 text-start font-medium">{dict.targets.colActions}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">
                <AvatarWithName name={row.accountManagerName} />
              </td>
              <td className="px-4 py-3 text-muted">{row.periodLabel}</td>
              <td className="px-4 py-3 text-muted">{targetTypeLabel(dict, row.targetType)}</td>
              <td className="px-4 py-3 text-muted">
                {formatTargetValue({ targetType: row.targetType, value: row.targetValue, currency: row.currency })}
              </td>
              <td className="px-4 py-3 text-muted">
                {formatTargetValue({ targetType: row.targetType, value: row.actual, currency: row.currency })}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ProgressBar pct={row.achievementPct} trackClassName="w-20" />
                  <span className="text-xs text-muted">{Math.round(row.achievementPct)}%</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {row.achievementPct >= 100 && row.status !== "ARCHIVED" ? (
                  <Badge tone="success">{dict.targets.targetAchieved}</Badge>
                ) : (
                  <Badge tone={statusTone[row.status] ?? "default"}>{targetStatusLabel(dict, row.status)}</Badge>
                )}
              </td>
              {canManage ? (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ModalFormTrigger
                      title={dict.targets.editTarget}
                      closeSignal={flash ?? null}
                      trigger={
                        <button
                          type="button"
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-background"
                        >
                          <Pencil className="size-3.5" />
                          {dict.common.edit}
                        </button>
                      }
                    >
                      <TargetForm
                        action={updateTarget.bind(null, row.id)}
                        accountManagers={accountManagers ?? []}
                        defaultValues={{
                          userId: row.userId,
                          targetType: row.targetType,
                          periodType: row.periodType,
                          year: row.year,
                          periodNumber: row.periodNumber,
                          targetValue: row.targetValue,
                          currency: row.currency,
                        }}
                        submitLabel={dict.common.saveChanges}
                      />
                    </ModalFormTrigger>
                    {row.status === "ARCHIVED" ? (
                      <ServerActionForm action={setTargetStatus.bind(null, row.id)}>
                        <input type="hidden" name="status" value="ACTIVE" />
                        <button
                          type="submit"
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-background"
                        >
                          <RotateCcw className="size-3.5" />
                          {dict.targets.activate}
                        </button>
                      </ServerActionForm>
                    ) : (
                      <ServerActionForm action={setTargetStatus.bind(null, row.id)}>
                        <input type="hidden" name="status" value="ARCHIVED" />
                        <button
                          type="submit"
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger-bg"
                        >
                          <Archive className="size-3.5" />
                          {dict.targets.archive}
                        </button>
                      </ServerActionForm>
                    )}
                    <ConfirmDeleteForm
                      action={deleteTarget.bind(null, row.id)}
                      confirmMessage={dict.targets.deleteConfirm}
                      label={dict.common.delete}
                      iconOnly
                    />
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={canManage ? 8 : 7}>
                <EmptyState icon={Target} message={dict.targets.noTargets} />
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
