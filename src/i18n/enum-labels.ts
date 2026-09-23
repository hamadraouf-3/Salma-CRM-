import type { Dictionary } from "./dictionaries";
import type {
  Role,
  AccountStatus,
  ContactStatus,
  Source,
  LeadStatus,
  OpportunityStage,
  LostReason,
  TaskPriority,
  TaskType,
  ActivityType,
  OpportunityPriority,
  OpportunityType,
  PreferredContactMethod,
  DeploymentOption,
  TargetType,
  TargetPeriodType,
  TargetStatus,
} from "@/lib/validations";

/**
 * Localized replacements for the English-only `*_LABELS` maps in `src/lib/validations.ts`.
 * The underlying enum keys ("NEW", "WON", ...) are stored in the database and never change —
 * only the label shown to the user is localized. Falls back to the raw key if a value doesn't
 * match a known enum member (defensive, since these often read untyped DB strings).
 */

export function roleLabel(dict: Dictionary, role: Role | string): string {
  return dict.enums.role[role as Role] ?? role;
}

export function accountStatusLabel(dict: Dictionary, status: AccountStatus | string): string {
  return dict.enums.accountStatus[status as AccountStatus] ?? status;
}

export function contactStatusLabel(dict: Dictionary, status: ContactStatus | string): string {
  return dict.enums.contactStatus[status as ContactStatus] ?? status;
}

export function sourceLabel(dict: Dictionary, source: Source | string): string {
  return dict.enums.source[source as Source] ?? source;
}

export function leadStatusLabel(dict: Dictionary, status: LeadStatus | string): string {
  return dict.enums.leadStatus[status as LeadStatus] ?? status;
}

export function stageLabel(dict: Dictionary, stage: OpportunityStage | string): string {
  return (dict.enums.opportunityStage as Record<string, string>)[stage] ?? stage;
}

type StageLike = { id: string; label: string; isSystem: boolean };

/**
 * The display label for a stage id, given the full list of pipeline stages. System stages
 * (NEW/WON/LOST) are translated through the dictionary like any other enum; admin-added stages carry
 * their own label as free text (the admin typed it, so it isn't run through i18n) and fall back to the
 * raw id if the stage was deleted after an opportunity was moved into it.
 */
export function resolveStageLabel(dict: Dictionary, stageId: string, stages: StageLike[]): string {
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) return stageLabel(dict, stageId);
  return stage.isSystem ? stageLabel(dict, stage.id) : stage.label;
}

export function lostReasonLabel(dict: Dictionary, reason: LostReason | string): string {
  return dict.enums.lostReason[reason as LostReason] ?? reason;
}

export function taskPriorityLabel(dict: Dictionary, priority: TaskPriority | string): string {
  return dict.enums.taskPriority[priority as TaskPriority] ?? priority;
}

export function taskTypeLabel(dict: Dictionary, type: TaskType | string): string {
  return dict.enums.taskType[type as TaskType] ?? type;
}

export function activityTypeLabel(dict: Dictionary, type: ActivityType | string): string {
  return dict.enums.activityType[type as ActivityType] ?? type;
}

export function opportunityPriorityLabel(dict: Dictionary, priority: OpportunityPriority | string): string {
  return dict.enums.opportunityPriority[priority as OpportunityPriority] ?? priority;
}

export function opportunityTypeLabel(dict: Dictionary, type: OpportunityType | string): string {
  return dict.enums.opportunityType[type as OpportunityType] ?? type;
}

export function preferredContactMethodLabel(dict: Dictionary, method: PreferredContactMethod | string): string {
  return dict.enums.preferredContactMethod[method as PreferredContactMethod] ?? method;
}

export function deploymentOptionLabel(dict: Dictionary, option: DeploymentOption | string): string {
  return dict.enums.deploymentOption[option as DeploymentOption] ?? option;
}

export function targetTypeLabel(dict: Dictionary, type: TargetType | string): string {
  return dict.enums.targetType[type as TargetType] ?? type;
}

export function targetPeriodTypeLabel(dict: Dictionary, type: TargetPeriodType | string): string {
  return dict.enums.targetPeriodType[type as TargetPeriodType] ?? type;
}

export function targetStatusLabel(dict: Dictionary, status: TargetStatus | string): string {
  return dict.enums.targetStatus[status as TargetStatus] ?? status;
}
