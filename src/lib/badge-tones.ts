import type { AccountStatus, ContactStatus, LeadStatus, OpportunityStage, TaskPriority } from "@/lib/validations";

export const contactStatusTone: Record<ContactStatus, "info" | "primary" | "success" | "danger"> = {
  LEAD: "info",
  QUALIFIED: "primary",
  CUSTOMER: "success",
  LOST: "danger",
};

// NEW/WON/LOST are the only fixed stage ids — admin-added stages in between fall back to "primary"
// wherever this is looked up (`opportunityStageTone[stage] ?? "primary"`).
export const opportunityStageTone: Record<
  OpportunityStage,
  "default" | "info" | "warning" | "primary" | "success" | "danger"
> = {
  NEW: "default",
  WON: "success",
  LOST: "danger",
};

export const leadStatusTone: Record<LeadStatus, "default" | "info" | "warning" | "primary" | "success" | "danger"> = {
  NEW: "default",
  CONTACTED: "info",
  QUALIFIED: "primary",
  UNQUALIFIED: "warning",
  CONVERTED: "success",
  LOST: "danger",
};

export const accountStatusTone: Record<AccountStatus, "default" | "info" | "success" | "primary"> = {
  PROSPECT: "info",
  ACTIVE_CUSTOMER: "success",
  FORMER_CUSTOMER: "default",
  PARTNER: "primary",
};

export const taskPriorityTone: Record<TaskPriority, "default" | "warning" | "danger"> = {
  LOW: "default",
  MEDIUM: "warning",
  HIGH: "danger",
};
