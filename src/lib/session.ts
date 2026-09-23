import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { WRITE_ROLES, type Role } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** Use in Server Components / layouts to gate a page. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in Server Components to gate a page to specific roles. */
export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

/**
 * Use inside Server Actions. Next.js Server Functions are reachable by direct
 * POST request regardless of proxy.ts matchers, so every action re-checks
 * auth/role instead of relying on the proxy redirect alone.
 *
 * Called with no roles, this defaults to WRITE_ROLES rather than "any signed-in
 * user" — MANAGEMENT is a read-only company-wide role and must never be able to
 * create/update/delete a record just because a call site forgot to list allowed
 * roles explicitly.
 */
export async function requireActionUser(...roles: Role[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error(translateMessage(await getServerDict(), "You are not signed in"));
  }
  const allowed = roles.length > 0 ? roles : WRITE_ROLES;
  if (!allowed.includes(user.role)) {
    throw new Error(translateMessage(await getServerDict(), "You do not have permission to perform this action"));
  }
  return user;
}
