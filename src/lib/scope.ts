import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/validations";

/**
 * Resolves which user ids the given user is allowed to see:
 *  - Admins are unrestricted (`null` means "no filter needed").
 *  - Management is also unrestricted: it's a read-only, company-wide reporting role.
 *  - Account Managers are strictly isolated from one another and only ever see
 *    their own id — there is deliberately no hierarchy-based visibility tier
 *    between "only yourself" and "everyone."
 */
export async function visibleUserIds(user: { id: string; role: Role }): Promise<string[] | null> {
  if (user.role === "ADMIN" || user.role === "MANAGEMENT") return null;
  return [user.id];
}

/** Sales reps only see records they own; managers see their team's; admins see everything. */
export async function ownedScope(
  user: { id: string; role: Role },
  field: "ownerId" | "assigneeId" = "ownerId"
) {
  const ids = await visibleUserIds(user);
  if (ids === null) return {};
  return { [field]: { in: ids } };
}

/**
 * Same isolation as `ownedScope`, plus any Opportunity the System Admin explicitly marked visible to
 * everyone (`visibility: "EVERYONE"`) — Tasks, Leads, Contacts, and Companies have no such exception and
 * must keep using the plain `ownedScope`.
 */
export async function opportunityScope(user: { id: string; role: Role }) {
  const ids = await visibleUserIds(user);
  if (ids === null) return {};
  return { OR: [{ ownerId: { in: ids } }, { visibility: "EVERYONE" }] };
}

/**
 * Resolve the visibility an Opportunity should be saved with. Only ADMIN may make a deal visible to
 * every Account Manager — anyone else's submitted choice is ignored, not merely hidden in the UI, same
 * as `resolveOwnerId` already does for reassigning ownership. When a non-admin (the owner) edits their
 * own opportunity, `existingVisibility` is kept as-is instead of being silently reset to "OWNER" —
 * otherwise saving any unrelated field would revert a visibility an Admin had deliberately granted.
 */
export function resolveVisibility(
  user: { role: Role },
  requestedVisibility: string | undefined,
  existingVisibility: string = "OWNER"
) {
  if (user.role !== "ADMIN") return existingVisibility;
  return requestedVisibility === "EVERYONE" ? "EVERYONE" : "OWNER";
}

/** Whether `user` is allowed to view/edit a record owned by `ownerId`, per the org hierarchy. */
export async function canAccessOwner(user: { id: string; role: Role }, ownerId: string): Promise<boolean> {
  const ids = await visibleUserIds(user);
  if (ids === null) return true;
  return ids.includes(ownerId);
}

/** Same as `canAccessOwner`, but also lets anyone view (not edit) an Opportunity the Admin marked
 * visible to everyone — editing still requires actually owning it (or being Admin/Management). */
export async function canViewOpportunity(
  user: { id: string; role: Role },
  opportunity: { ownerId: string; visibility: string }
): Promise<boolean> {
  if (opportunity.visibility === "EVERYONE") return true;
  return canAccessOwner(user, opportunity.ownerId);
}

/**
 * Resolve the ownerId a record should be saved with. An Account Manager can never
 * assign a record to anyone but themselves — the client-supplied owner is ignored,
 * not merely hidden in the UI. Only ADMIN may set/reassign an arbitrary owner.
 */
export function resolveOwnerId(user: { id: string; role: Role }, requestedOwnerId: string) {
  if (user.role !== "ADMIN") return user.id;
  return requestedOwnerId;
}

/** Active users this person can assign records/tasks to (only themselves, or everyone for admins/management). */
export async function visibleTeamUsers(user: { id: string; role: Role }) {
  const ids = await visibleUserIds(user);
  return prisma.user.findMany({
    where: { active: true, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
