import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/locale";
import type { TargetPeriodType } from "@/lib/validations";

/** Active Account Managers a target can be assigned to — shared by the create/edit target pages. */
export async function activeAccountManagers() {
  return prisma.user.findMany({
    where: { active: true, role: "ACCOUNT_MANAGER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Turns (year, period type, period number) into an inclusive/exclusive date range for querying. */
export function computePeriodRange(
  periodType: TargetPeriodType,
  year: number,
  periodNumber: number
): { start: Date; end: Date } {
  if (periodType === "MONTHLY") {
    return { start: new Date(year, periodNumber - 1, 1), end: new Date(year, periodNumber, 1) };
  }
  if (periodType === "QUARTERLY") {
    const startMonth = (periodNumber - 1) * 3;
    return { start: new Date(year, startMonth, 1), end: new Date(year, startMonth + 3, 1) };
  }
  return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
}

/** A short, locale-aware label for a target's period, e.g. "September 2026" / "Q3 2026" / "2026". */
export function formatPeriodLabel(target: { periodType: string; periodStart: Date }, locale: Locale): string {
  const d = new Date(target.periodStart);
  const intlLocale = locale === "ar" ? "ar" : "en-US";
  if (target.periodType === "MONTHLY") {
    return new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(d);
  }
  if (target.periodType === "QUARTERLY") {
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    return locale === "ar" ? `الربع ${quarter} ${d.getFullYear()}` : `Q${quarter} ${d.getFullYear()}`;
  }
  return String(d.getFullYear());
}

export type TargetAchievement = { actual: number; achievementPct: number };

/**
 * Achievement is always computed from real Opportunity data, never stored — Revenue targets
 * sum the value of that Account Manager's own Won opportunities (same currency as the target)
 * closed within the period; Deals Won targets count them. Not capped at 100%: a rep who beats
 * their target should show e.g. 125%, per the business rule this was built against.
 */
export async function computeTargetAchievement(target: {
  userId: string;
  targetType: string;
  targetValue: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<TargetAchievement> {
  const wonInPeriod = {
    ownerId: target.userId,
    stage: "WON",
    closedAt: { gte: target.periodStart, lt: target.periodEnd },
  };

  let actual: number;
  if (target.targetType === "REVENUE") {
    const result = await prisma.opportunity.aggregate({
      where: { ...wonInPeriod, currency: target.currency },
      _sum: { value: true },
    });
    actual = result._sum.value ?? 0;
  } else {
    actual = await prisma.opportunity.count({ where: wonInPeriod });
  }

  const achievementPct = target.targetValue > 0 ? (actual / target.targetValue) * 100 : 0;
  return { actual, achievementPct };
}
