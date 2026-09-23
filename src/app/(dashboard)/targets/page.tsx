import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { TargetForm } from "@/components/targets/target-form";
import { createTarget } from "@/lib/actions/targets";
import { DEFAULT_CURRENCY } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { computeTargetAchievement, formatPeriodLabel, activeAccountManagers } from "@/lib/targets";
import { TargetsTable, type TargetRow } from "@/components/targets/targets-table";
import { MyTargets } from "@/components/targets/my-targets";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const user = await requireUser();
  const { flash } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const isAccountManager = user.role === "ACCOUNT_MANAGER";

  const targets = await prisma.salesTarget.findMany({
    where: isAccountManager ? { userId: user.id, status: { in: ["ACTIVE", "COMPLETED"] } } : {},
    include: { user: { select: { id: true, name: true } } },
    orderBy: { periodStart: "desc" },
  });

  const rows: TargetRow[] = await Promise.all(
    targets.map(async (t) => {
      const { actual, achievementPct } = await computeTargetAchievement(t);
      return {
        id: t.id,
        userId: t.userId,
        accountManagerName: t.user.name,
        periodLabel: formatPeriodLabel(t, locale),
        periodType: t.periodType,
        year: t.periodStart.getFullYear(),
        periodNumber:
          t.periodType === "MONTHLY"
            ? t.periodStart.getMonth() + 1
            : t.periodType === "QUARTERLY"
              ? Math.floor(t.periodStart.getMonth() / 3) + 1
              : 1,
        targetType: t.targetType,
        targetValue: t.targetValue,
        currency: t.currency,
        status: t.status,
        actual,
        achievementPct,
      };
    })
  );

  if (isAccountManager) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{dict.targets.title}</h1>
        </div>
        <MyTargets rows={rows} dict={dict} />
      </div>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const revenueRows = rows.filter((r) => r.targetType === "REVENUE" && r.currency === DEFAULT_CURRENCY);
  const totalTarget = revenueRows.reduce((sum, r) => sum + r.targetValue, 0);
  const totalAchieved = revenueRows.reduce((sum, r) => sum + r.actual, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
  const accountManagerCount = new Set(rows.map((r) => r.accountManagerName)).size;
  const accountManagers = isAdmin ? await activeAccountManagers() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{dict.targets.title}</h1>
        </div>
        {isAdmin ? (
          <ModalFormTrigger
            title={dict.targets.createTarget}
            closeSignal={flash ?? null}
            trigger={
              <Button>
                <Plus className="size-4" />
                {dict.targets.createTarget}
              </Button>
            }
          >
            <TargetForm action={createTarget} accountManagers={accountManagers} submitLabel={dict.targets.createTarget} />
          </ModalFormTrigger>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardBody>
            <div className="text-xs font-medium text-muted">{dict.targets.totalTarget}</div>
            <div className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(totalTarget, DEFAULT_CURRENCY)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs font-medium text-muted">{dict.targets.totalAchieved}</div>
            <div className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(totalAchieved, DEFAULT_CURRENCY)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs font-medium text-muted">{dict.targets.overallAchievement}</div>
            <div className="mt-1 text-xl font-semibold text-foreground">{overallPct}%</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs font-medium text-muted">{dict.targets.accountManagersCount}</div>
            <div className="mt-1 text-xl font-semibold text-foreground">{accountManagerCount}</div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <TargetsTable rows={rows} canManage={isAdmin} accountManagers={accountManagers} flash={flash ?? null} />
      </Card>
    </div>
  );
}
