import {
  LayoutDashboard,
  Flame,
  Users,
  Building2,
  Handshake,
  ListChecks,
  BarChart3,
  UserCog,
  Target,
  PlusCircle,
} from "lucide-react";
import { WRITE_ROLES } from "@/lib/validations";

export const ALL_ROLES = ["ADMIN", "ACCOUNT_MANAGER", "MANAGEMENT"] as const;

export const workspaceNavItems = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
  { href: "/sales/new", labelKey: "new_opportunity", icon: PlusCircle, roles: WRITE_ROLES },
  { href: "/leads", labelKey: "leads", icon: Flame, roles: ALL_ROLES },
  { href: "/contacts", labelKey: "contacts", icon: Users, roles: ALL_ROLES },
  { href: "/companies", labelKey: "accounts", icon: Building2, roles: ALL_ROLES },
  { href: "/opportunities", labelKey: "opportunities", icon: Handshake, roles: ALL_ROLES },
  { href: "/tasks", labelKey: "tasks", icon: ListChecks, roles: ALL_ROLES },
  { href: "/reports", labelKey: "reports", icon: BarChart3, roles: ALL_ROLES },
] as const;

export const managementNavItems = [
  { href: "/targets", labelKey: "sales_targets", icon: Target, roles: ALL_ROLES },
  { href: "/users", labelKey: "users", icon: UserCog, roles: ["ADMIN"] },
] as const;

export const allNavItems = [...workspaceNavItems, ...managementNavItems];
