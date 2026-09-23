import Link from "next/link";
import {
  Handshake,
  Flame,
  ListChecks,
  Trophy,
  TrendingUp,
  Phone,
  Mail,
  Users,
  FileText,
  StickyNote,
  RotateCcw,
  ArrowRightLeft,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ownedScope, opportunityScope, visibleUserIds } from "@/lib/scope";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { StageBarChart } from "@/components/dashboard/stage-bar-chart";
import { TeamLeaderboard } from "@/components/dashboard/team-leaderboard";
import { Sparkline } from "@/components/dashboard/sparkline";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { DEFAULT_CURRENCY } from "@/lib/validations";
import { getPipelineStages } from "@/lib/pipeline-stages";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { plural } from "@/i18n/plural";
import { resolveStageLabel } from "@/i18n/enum-labels";
import { computeTargetAchievement, formatPeriodLabel } from "@/lib/targets";
import { MyTargets } from "@/components/targets/my-targets";
import type { TargetRow } from "@/components/targets/targets-table";

const ACTIVITY_TYPE_ICONS: Record<string, LucideIcon> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  DEMO: Handshake,
  FOLLOW_UP: RotateCcw,
  NOTE: StickyNote,
  PROPOSAL: FileText,
  STAGE_CHANGE: ArrowRightLeft,
};

const TASK_TYPE_ICONS: Record<string, LucideIcon> = {
  MEETING: Users,
  CALL: Phone,
  EMAIL: Mail,
  FOLLOW_UP: RotateCcw,
  OTHER: Calendar,
};

export default async function DashboardHomePage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const oppScope = await opportunityScope(user);
  const taskScope = await ownedScope(user, "assigneeId");
  const leadScope = await ownedScope(user);
  const visibleIds = await visibleUserIds(user);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    openOpportunities,
    wonThisMonth,
    openOpportunitiesForForecast,
    newLeadsThisMonth,
    overdueTasks,
    opportunitiesByStage,
    recentActivities,
    upcomingTasks,
    currentTargets,
    leaderboardOpportunities,
    trendOpportunities,
    stages,
  ] = await Promise.all([
    prisma.opportunity.aggregate({
      where: { ...oppScope, stage: { notIn: ["WON", "LOST"] } },
      _sum: { value: true },
      _count: true,
    }),
    prisma.opportunity.aggregate({
      where: { ...oppScope, stage: "WON", closedAt: { gte: startOfMonth } },
      _sum: { value: true },
      _count: true,
    }),
    prisma.opportunity.findMany({
      where: { ...oppScope, stage: { notIn: ["WON", "LOST"] }, currency: DEFAULT_CURRENCY },
      select: { value: true, probability: true },
    }),
    prisma.lead.count({ where: { ...leadScope, createdAt: { gte: startOfMonth } } }),
    prisma.task.count({ where: { ...taskScope, done: false, dueDate: { lt: new Date() } } }),
    prisma.opportunity.groupBy({
      by: ["stage"],
      where: oppScope,
      _sum: { value: true },
      _count: true,
    }),
    prisma.activity.findMany({
      where: visibleIds ? { userId: { in: visibleIds } } : {},
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true, contact: true, opportunity: true, lead: true, company: true },
    }),
    prisma.task.findMany({
      where: { ...taskScope, done: false },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: { assignee: true },
    }),
    prisma.salesTarget.findMany({
      where: {
        status: "ACTIVE",
        periodStart: { lte: now },
        periodEnd: { gt: now },
        ...(visibleIds ? { userId: { in: visibleIds } } : {}),
      },
      include: { user: { select: { id: true, name: true } } },
    }),
    user.role === "ACCOUNT_MANAGER"
      ? Promise.resolve([])
      : prisma.opportunity.findMany({
          where: { ...oppScope, stage: "WON", closedAt: { gte: startOfMonth }, currency: DEFAULT_CURRENCY },
          select: { value: true, owner: { select: { id: true, name: true } } },
        }),
    user.role === "ACCOUNT_MANAGER"
      ? Promise.resolve([])
      : prisma.opportunity.findMany({
          where: { ...oppScope, stage: "WON", closedAt: { gte: sixMonthsAgo }, currency: DEFAULT_CURRENCY },
          select: { value: true, closedAt: true },
        }),
    getPipelineStages(),
  ]);

  // opportunitiesByStage is grouped by the raw `stage` column, which can be a per-opportunity custom
  // workflow step (not one of the three shared system stages) — fold anything that isn't WON/LOST into
  // the New bucket here, same as the Kanban board does.
  const stageData = stages.map((stage) => {
    const matching =
      stage.id === "NEW"
        ? opportunitiesByStage.filter((d) => d.stage !== "WON" && d.stage !== "LOST")
        : opportunitiesByStage.filter((d) => d.stage === stage.id);
    return {
      stage: resolveStageLabel(dict, stage.id, stages),
      value: matching.reduce((sum, d) => sum + (d._sum.value ?? 0), 0),
      count: matching.reduce((sum, d) => sum + d._count, 0),
    };
  });

  const weightedForecast = openOpportunitiesForForecast.reduce(
    (sum, d) => sum + (d.value * d.probability) / 100,
    0
  );

  const targetRows: TargetRow[] = await Promise.all(
    currentTargets.map(async (t) => {
      const { actual, achievementPct } = await computeTargetAchievement(t);
      return {
        id: t.id,
        accountManagerName: t.user.name,
        periodLabel: formatPeriodLabel(t, locale),
        targetType: t.targetType,
        targetValue: t.targetValue,
        currency: t.currency,
        status: t.status,
        actual,
        achievementPct,
      };
    })
  );
  const revenueTargetRows = targetRows.filter((r) => r.targetType === "REVENUE" && r.currency === DEFAULT_CURRENCY);
  const totalTargetAmount = revenueTargetRows.reduce((sum, r) => sum + r.targetValue, 0);
  const totalAchievedAmount = revenueTargetRows.reduce((sum, r) => sum + r.actual, 0);
  const overallAchievementPct = totalTargetAmount > 0 ? Math.round((totalAchievedAmount / totalTargetAmount) * 100) : 0;
  const accountManagerCount = new Set(targetRows.map((r) => r.accountManagerName)).size;

  const monthFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", { month: "short" });
  const trendBuckets: { key: string; month: string; value: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    trendBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: monthFormatter.format(d), value: 0 });
  }
  for (const opportunity of trendOpportunities) {
    if (!opportunity.closedAt) continue;
    const key = `${opportunity.closedAt.getFullYear()}-${opportunity.closedAt.getMonth()}`;
    const bucket = trendBuckets.find((b) => b.key === key);
    if (bucket) bucket.value += opportunity.value;
  }

  const leaderboardTotals = new Map<string, { name: string; won: number }>();
  for (const opportunity of leaderboardOpportunities) {
    const entry = leaderboardTotals.get(opportunity.owner.id) ?? { name: opportunity.owner.name, won: 0 };
    entry.won += opportunity.value;
    leaderboardTotals.set(opportunity.owner.id, entry);
  }
  const leaderboard = Array.from(leaderboardTotals.values())
    .sort((a, b) => b.won - a.won)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{dict.dashboard.title}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-2">
          <StatCard
            label={dict.dashboard.open_pipeline_value}
            value={formatCurrency(openOpportunities._sum.value ?? 0)}
            hint={plural(locale, openOpportunities._count, dict.dashboard.active_opportunities)}
            icon={Handshake}
            featured
          />
        </div>
        <StatCard
          label={dict.dashboard.won_this_month}
          value={formatCurrency(wonThisMonth._sum.value ?? 0)}
          hint={plural(locale, wonThisMonth._count, dict.dashboard.opportunities_count)}
          icon={Trophy}
          tone="success"
        />
        <StatCard
          label={dict.dashboard.weighted_forecast}
          value={formatCurrency(weightedForecast, DEFAULT_CURRENCY)}
          hint={dict.dashboard.weighted_forecast_hint}
          icon={TrendingUp}
        />
        <StatCard label={dict.dashboard.new_leads_this_month} value={String(newLeadsThisMonth)} icon={Flame} tone="primary" />
        <StatCard
          label={dict.dashboard.overdue_tasks}
          value={String(overdueTasks)}
          icon={ListChecks}
          tone={overdueTasks > 0 ? "danger" : "primary"}
        />
      </div>

      {user.role === "ACCOUNT_MANAGER" ? (
        targetRows.length > 0 ? (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{dict.dashboard.myTarget}</h2>
            <MyTargets rows={targetRows} dict={dict} />
          </div>
        ) : null
      ) : totalTargetAmount > 0 ? (
        <Card>
          <CardHeader title={dict.dashboard.salesPerformance} />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <div className="text-xs font-medium text-muted">{dict.targets.totalTarget}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(totalTargetAmount, DEFAULT_CURRENCY)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted">{dict.targets.totalAchieved}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(totalAchievedAmount, DEFAULT_CURRENCY)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted">{dict.targets.overallAchievement}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{overallAchievementPct}%</div>
                <ProgressBar pct={overallAchievementPct} className="mt-2" />
              </div>
              <div>
                <div className="text-xs font-medium text-muted">{dict.targets.accountManagersCount}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{accountManagerCount}</div>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="mb-1 text-xs font-medium text-muted">{dict.dashboard.sixMonthTrend}</div>
              <Sparkline data={trendBuckets} />
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={dict.dashboard.pipeline_by_stage} />
          <CardBody>
            <StageBarChart data={stageData} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={dict.dashboard.upcoming_tasks}
            action={
              <Link href="/tasks" className="text-xs text-primary">
                {dict.dashboard.view_all}
              </Link>
            }
          />
          <CardBody className="space-y-2">
            {upcomingTasks.map((t) => {
              const TaskIcon = TASK_TYPE_ICONS[t.type] ?? Calendar;
              return (
                <Link
                  key={t.id}
                  href="/tasks"
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-background"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TaskIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{t.title}</div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{t.assignee.name}</span>
                      <span className="shrink-0">{formatDate(t.dueDate)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {upcomingTasks.length === 0 ? <EmptyState icon={ListChecks} message={dict.dashboard.no_upcoming_tasks} /> : null}
          </CardBody>
        </Card>
      </div>

      {user.role !== "ACCOUNT_MANAGER" ? (
        <Card>
          <CardHeader title={dict.dashboard.team_leaderboard} />
          <CardBody>
            <TeamLeaderboard entries={leaderboard} dict={dict} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={dict.dashboard.recent_activity} />
        <CardBody className="space-y-3">
          {recentActivities.map((a) => {
            const ActivityIcon = ACTIVITY_TYPE_ICONS[a.type] ?? StickyNote;
            return (
              <div key={a.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ActivityIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{a.content}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {a.user.name} ·{" "}
                    {a.contact?.name ?? a.opportunity?.title ?? a.lead?.name ?? a.company?.name ?? ""} ·{" "}
                    {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          {recentActivities.length === 0 ? <EmptyState icon={TrendingUp} message={dict.dashboard.no_activity_yet} /> : null}
        </CardBody>
      </Card>
    </div>
  );
}
