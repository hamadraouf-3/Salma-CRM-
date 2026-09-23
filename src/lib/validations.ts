import { z } from "zod";

// Only three user-facing roles: Account Manager (an isolated sales owner — sees and
// edits only their own records), System Admin (unrestricted), and Management
// (read-only, company-wide). There is deliberately no "Sales Manager" tier that sees
// a team's records — every Account Manager is isolated from every other one.
export const ROLES = ["ADMIN", "ACCOUNT_MANAGER", "MANAGEMENT"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "System Admin",
  ACCOUNT_MANAGER: "Account Manager",
  MANAGEMENT: "Management",
};

/** Roles that may create, edit, or delete records. MANAGEMENT is read-only. */
export const WRITE_ROLES: Role[] = ["ADMIN", "ACCOUNT_MANAGER"];
export function canWrite(role: Role) {
  return (WRITE_ROLES as readonly string[]).includes(role);
}

export const ACCOUNT_STATUSES = ["PROSPECT", "ACTIVE_CUSTOMER", "FORMER_CUSTOMER", "PARTNER"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  PROSPECT: "Prospect",
  ACTIVE_CUSTOMER: "Active Customer",
  FORMER_CUSTOMER: "Former Customer",
  PARTNER: "Partner",
};

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

export const CONTACT_STATUSES = ["LEAD", "QUALIFIED", "CUSTOMER", "LOST"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  CUSTOMER: "Customer",
  LOST: "Lost",
};

/** Configurable source taxonomy, shared by Leads, Contacts, and Opportunities. */
export const SOURCES = [
  "WEBSITE",
  "LINKEDIN",
  "REFERRAL",
  "EMAIL",
  "PHONE",
  "EVENT",
  "PARTNER",
  "ADVERTISEMENT",
  "DIRECT_OUTREACH",
  "OTHER",
] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  WEBSITE: "Website",
  LINKEDIN: "LinkedIn",
  REFERRAL: "Referral",
  EMAIL: "Email",
  PHONE: "Phone",
  EVENT: "Event",
  PARTNER: "Partner",
  ADVERTISEMENT: "Advertisement",
  DIRECT_OUTREACH: "Direct outreach",
  OTHER: "Other",
};

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  UNQUALIFIED: "Unqualified",
  CONVERTED: "Converted",
  LOST: "Lost",
};

// Opportunity stages are dynamic — see the PipelineStage model. NEW, WON, and LOST are fixed system
// stages (their id is stored directly in Opportunity.stage and drives won/lost/forecast logic
// throughout the app); everything else is an admin-managed row fetched at runtime via
// `getPipelineStages()` in src/lib/pipeline-stages.ts. `OpportunityStage` stays a plain string alias so
// existing type annotations across the codebase don't need to change.
export type OpportunityStage = string;

export const SYSTEM_STAGE_KEYS = ["NEW", "WON", "LOST"] as const;
export function isSystemStage(key: string): boolean {
  return (SYSTEM_STAGE_KEYS as readonly string[]).includes(key);
}

/** Who can see an Opportunity beyond its owner and Admin/Management. Only the System Admin can set
 * this (see `resolveVisibility` in src/lib/scope.ts) — an Account Manager can never make their own
 * deal visible to others. */
export const OPPORTUNITY_VISIBILITIES = ["OWNER", "EVERYONE"] as const;
export type OpportunityVisibility = (typeof OPPORTUNITY_VISIBILITIES)[number];

/** Fixed win-probability (%) for the three system stages — custom stages carry their own on the row. */
export const SYSTEM_STAGE_DEFAULT_PROBABILITY: Record<(typeof SYSTEM_STAGE_KEYS)[number], number> = {
  NEW: 10,
  WON: 100,
  LOST: 0,
};

export type StageGateFailure = { stage: OpportunityStage; missing: "value" | "nextAction" };

/**
 * Stage changes are not blocked. Value and next action stay optional fields on the opportunity;
 * moving a deal along its workflow does not ask for either of them.
 */
export function stageGateCheck(
  _stage: string,
  _value: number,
  _nextAction: string | null | undefined
): StageGateFailure | null {
  return null;
}

export const LOST_REASONS = [
  "PRICE",
  "COMPETITOR",
  "NO_BUDGET",
  "NO_RESPONSE",
  "NOT_A_FIT",
  "OTHER",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  PRICE: "Price too high",
  COMPETITOR: "Chose a competitor",
  NO_BUDGET: "No budget",
  NO_RESPONSE: "Went silent / no response",
  NOT_A_FIT: "Not a good fit",
  OTHER: "Other",
};

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const TASK_TYPES = ["MEETING", "CALL", "EMAIL", "FOLLOW_UP", "OTHER"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  MEETING: "Meeting",
  CALL: "Call",
  EMAIL: "Email",
  FOLLOW_UP: "Follow-up",
  OTHER: "Other",
};

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "DEMO", "FOLLOW_UP", "NOTE", "PROPOSAL", "STAGE_CHANGE"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  DEMO: "Demo",
  FOLLOW_UP: "Follow-up",
  NOTE: "Note",
  PROPOSAL: "Proposal",
  STAGE_CHANGE: "Stage change",
};

export const DEFAULT_CURRENCY = "JOD";

export const OPPORTUNITY_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type OpportunityPriority = (typeof OPPORTUNITY_PRIORITIES)[number];
export const OPPORTUNITY_PRIORITY_LABELS: Record<OpportunityPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const OPPORTUNITY_TYPES = ["NEW_BUSINESS", "UPSELL", "RENEWAL", "OTHER"] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];
export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  NEW_BUSINESS: "New business",
  UPSELL: "Upsell",
  RENEWAL: "Renewal",
  OTHER: "Other",
};

export const PREFERRED_CONTACT_METHODS = ["EMAIL", "PHONE", "MOBILE", "WHATSAPP"] as const;
export type PreferredContactMethod = (typeof PREFERRED_CONTACT_METHODS)[number];
export const PREFERRED_CONTACT_METHOD_LABELS: Record<PreferredContactMethod, string> = {
  EMAIL: "Email",
  PHONE: "Phone",
  MOBILE: "Mobile",
  WHATSAPP: "WhatsApp",
};

export const DEPLOYMENT_OPTIONS = ["CLOUD", "ON_PREMISE", "HYBRID", "UNKNOWN"] as const;
export type DeploymentOption = (typeof DEPLOYMENT_OPTIONS)[number];
export const DEPLOYMENT_OPTION_LABELS: Record<DeploymentOption, string> = {
  CLOUD: "Cloud",
  ON_PREMISE: "On-premise",
  HYBRID: "Hybrid",
  UNKNOWN: "Unknown",
};

export const companySchema = z.object({
  name: z.string().min(2, "Company name is required"),
  legalName: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  companySize: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  accountStatus: z.enum(ACCOUNT_STATUSES).default("PROSPECT"),
  source: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  ownerId: z.string().min(1, "Owner is required"),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  companyId: z.string().optional().or(z.literal("")),
  jobTitle: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  linkedIn: z.string().optional().or(z.literal("")),
  isDecisionMaker: z.coerce.boolean().default(false),
  isPrimary: z.coerce.boolean().default(false),
  source: z.string().optional().or(z.literal("")),
  preferredContactMethod: z.string().optional().or(z.literal("")),
  status: z.enum(CONTACT_STATUSES),
  notes: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")), // comma-separated, parsed by the action
  ownerId: z.string().min(1, "Owner is required"),
});

export const leadSchema = z.object({
  name: z.string().min(2, "Name is required"),
  companyName: z.string().optional().or(z.literal("")),
  jobTitle: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  status: z.enum(LEAD_STATUSES).default("NEW"),
  score: z.coerce.number().int().min(0).max(100).default(0),
  notes: z.string().optional().or(z.literal("")),
  nextFollowUpAt: z.string().optional().or(z.literal("")),
  ownerId: z.string().min(1, "Owner is required"),
});

export const opportunitySchema = z.object({
  title: z.string().min(2, "Opportunity title is required"),
  value: z.coerce.number().min(0, "Value must be a positive number"),
  currency: z.string().min(1).default(DEFAULT_CURRENCY),
  stage: z.string().min(1, "Invalid stage"),
  probability: z.coerce.number().int().min(0).max(100).default(10),
  lostReason: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  competitor: z.string().optional().or(z.literal("")),
  nextAction: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  priority: z.string().optional().or(z.literal("")),
  opportunityType: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  contactId: z.string().min(1, "Contact is required"),
  ownerId: z.string().min(1, "Owner is required"),
  visibility: z.string().optional().or(z.literal("")),
  expectedCloseDate: z.string().optional().or(z.literal("")),
});

export const requirementSchema = z.object({
  businessProblem: z.string().optional().or(z.literal("")),
  customerObjective: z.string().optional().or(z.literal("")),
  requiredSolution: z.string().optional().or(z.literal("")),
  functionalRequirements: z.string().optional().or(z.literal("")),
  technicalRequirements: z.string().optional().or(z.literal("")),
  deployment: z.string().optional().or(z.literal("")),
  infrastructureNotes: z.string().optional().or(z.literal("")),
});

export const taskSchema = z.object({
  title: z.string().min(2, "Task title is required"),
  description: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES),
  type: z.enum(TASK_TYPES).default("OTHER"),
  assigneeId: z.string().min(1, "Assignee is required"),
  leadId: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  contactId: z.string().optional().or(z.literal("")),
  opportunityId: z.string().optional().or(z.literal("")),
});

export const activitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  content: z.string().min(1, "Content is required"),
  remindAt: z.string().optional().or(z.literal("")),
  leadId: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  contactId: z.string().optional().or(z.literal("")),
  opportunityId: z.string().optional().or(z.literal("")),
});

export const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(ROLES),
  title: z.string().optional().or(z.literal("")),
  active: z.coerce.boolean().default(true),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const TARGET_TYPES = ["REVENUE", "DEALS_WON"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];
export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  REVENUE: "Revenue",
  DEALS_WON: "Deals Won",
};

export const TARGET_PERIOD_TYPES = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type TargetPeriodType = (typeof TARGET_PERIOD_TYPES)[number];
export const TARGET_PERIOD_TYPE_LABELS: Record<TargetPeriodType, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export const TARGET_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export type TargetStatus = (typeof TARGET_STATUSES)[number];
export const TARGET_STATUS_LABELS: Record<TargetStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const salesTargetSchema = z.object({
  userId: z.string().min(1, "Account Manager is required"),
  targetType: z.enum(TARGET_TYPES),
  periodType: z.enum(TARGET_PERIOD_TYPES),
  year: z.coerce.number().int().min(2000).max(2100),
  periodNumber: z.coerce.number().int().min(1).max(12),
  targetValue: z.coerce.number().positive("Target value must be greater than zero"),
  currency: z.string().min(1).default(DEFAULT_CURRENCY),
});

export const targetStatusSchema = z.object({
  status: z.enum(TARGET_STATUSES),
});
