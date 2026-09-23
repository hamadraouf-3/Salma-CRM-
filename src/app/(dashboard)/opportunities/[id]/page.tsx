import Link from "next/link";
import { notFound } from "next/navigation";
import { Flame, Building2, Mail, Phone, User as UserIcon, AlertTriangle, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canAccessOwner, canViewOpportunity, ownedScope, visibleTeamUsers } from "@/lib/scope";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatGrid } from "@/components/ui/stat-grid";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/tasks/task-list";
import { TaskForm } from "@/components/tasks/task-form";
import { RequirementCard } from "@/components/opportunities/requirement-card";
import { OpportunityHeader } from "@/components/opportunities/opportunity-header";
import { createTask } from "@/lib/actions/tasks";
import { getPipelineStages } from "@/lib/pipeline-stages";
import { canWrite } from "@/lib/validations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { lostReasonLabel, sourceLabel } from "@/i18n/enum-labels";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      owner: true,
      createdBy: true,
      contact: true,
      company: true,
      convertedFromLead: { include: { owner: true } },
      tasks: { orderBy: [{ done: "asc" }, { dueDate: "asc" }], include: { assignee: true } },
      activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
      requirement: true,
    },
  });

  if (!opportunity) notFound();
  if (!(await canViewOpportunity(user, opportunity))) notFound();

  // Scoped to what this user owns, but always including the opportunity's *current* contact/company even
  // if it belongs to someone else (e.g. an Admin-registered deal reassigned to this owner) — otherwise the
  // edit form's dropdown would silently drop the real selection and reassign it on save.
  const scope = await ownedScope(user);
  const [assignees, contacts, companies, stages] = await Promise.all([
    visibleTeamUsers(user),
    prisma.contact.findMany({
      where: { OR: [scope, { id: opportunity.contactId }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.company.findMany({
      where: { OR: [scope, { id: opportunity.companyId ?? "" }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getPipelineStages(id),
  ]);

  const canEdit = canWrite(user.role) && (await canAccessOwner(user, opportunity.ownerId));
  const weightedValue = (opportunity.value * opportunity.probability) / 100;
  const daysInStage = Math.floor((new Date().getTime() - opportunity.stageChangedAt.getTime()) / 86_400_000);
  const isStale = !["WON", "LOST"].includes(opportunity.stage) && daysInStage >= 14;
  const openTasks = opportunity.tasks.filter((t) => !t.done);
  const lastActivityAt = opportunity.activities[0]?.createdAt ?? opportunity.createdAt;
  const daysSinceActivity = Math.floor((new Date().getTime() - new Date(lastActivityAt).getTime()) / 86_400_000);
  const needsAttention = !["WON", "LOST"].includes(opportunity.stage) && daysSinceActivity >= 7;

  return (
    <div className="space-y-6">
      <OpportunityHeader
        opportunity={opportunity}
        canEdit={canEdit}
        weightedValue={weightedValue}
        isStale={isStale}
        daysInStage={daysInStage}
        currentUser={user}
        owners={assignees}
        contacts={contacts}
        companies={companies}
        stages={stages}
      />

      <StatGrid
        stats={[
          { label: dict.opportunities.statValue, value: formatCurrency(opportunity.value, opportunity.currency) },
          { label: dict.opportunities.statWeighted, value: formatCurrency(weightedValue, opportunity.currency) },
          { label: dict.opportunities.statProbability, value: `${opportunity.probability}%` },
          { label: dict.opportunities.statDaysInStage, value: String(daysInStage), tone: isStale ? "danger" : "default" },
          { label: dict.opportunities.statOpenTasks, value: String(openTasks.length), tone: openTasks.length > 0 ? "danger" : "default" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {opportunity.convertedFromLead ? (
            <Card>
              <CardHeader title={dict.opportunities.originatedFrom} />
              <CardBody>
                <Link
                  href={`/leads/${opportunity.convertedFromLead.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-background"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Flame className="size-4 text-muted" />
                    {opportunity.convertedFromLead.name}
                  </div>
                  <span className="text-xs text-muted">
                    {dict.opportunities.createdBy}: {opportunity.convertedFromLead.owner.name}
                  </span>
                </Link>
              </CardBody>
            </Card>
          ) : null}

          {needsAttention ? (
            <div className="flex items-center gap-3 rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                {dict.opportunities.noActivityWarning.replace("{days}", String(daysSinceActivity))}
              </span>
            </div>
          ) : null}

          <Card>
            <CardHeader title={dict.opportunities.activity} />
            <CardBody>
              <ActivityTimeline activities={opportunity.activities} opportunityId={opportunity.id} />
            </CardBody>
          </Card>

          <RequirementCard opportunityId={opportunity.id} requirement={opportunity.requirement} canEdit={canEdit} />

          <Card>
            <CardHeader title={dict.opportunities.tasks} />
            <CardBody className="space-y-4">
              {canEdit ? (
                <TaskForm
                  action={createTask}
                  currentUser={user}
                  assignees={assignees}
                  defaultValues={{ opportunityId: opportunity.id }}
                  submitLabel={dict.common.add}
                  compact
                  resetOnSuccess
                />
              ) : null}
              <TaskList
                tasks={opportunity.tasks}
                canManage={canEdit}
                currentUser={user}
                assignees={assignees}
                emptyMessage={dict.opportunities.noTasksLinked}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={dict.opportunities.details} />
            <CardBody className="space-y-2 text-sm text-foreground">
              <div className="flex justify-between">
                <span className="text-muted">{dict.opportunities.expectedCloseDate}</span>
                <span>{formatDate(opportunity.expectedCloseDate)}</span>
              </div>
              {opportunity.source ? (
                <div className="flex justify-between">
                  <span className="text-muted">{dict.opportunities.source}</span>
                  <span>{sourceLabel(dict, opportunity.source)}</span>
                </div>
              ) : null}
              {opportunity.competitor ? (
                <div className="flex justify-between">
                  <span className="text-muted">{dict.opportunities.competitor}</span>
                  <span>{opportunity.competitor}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted">{dict.opportunities.created}</span>
                <span>{formatDate(opportunity.createdAt)}</span>
              </div>
              {opportunity.createdBy ? (
                <div className="flex justify-between">
                  <span className="text-muted">{dict.opportunities.createdBy}</span>
                  <span>{opportunity.createdBy.name}</span>
                </div>
              ) : null}
              {opportunity.visibility === "EVERYONE" ? (
                <div className="flex justify-between">
                  <span className="text-muted">{dict.opportunities.visibilityLabel}</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Users className="size-3.5" />
                    {dict.opportunities.visibilityEveryone}
                  </span>
                </div>
              ) : null}
              {opportunity.closedAt ? (
                <div className="flex justify-between">
                  <span className="text-muted">{dict.opportunities.closed}</span>
                  <span>{formatDate(opportunity.closedAt)}</span>
                </div>
              ) : null}
              {opportunity.stage === "LOST" && opportunity.lostReason ? (
                <div className="flex justify-between">
                  <span className="text-muted">{dict.opportunities.lostReason}</span>
                  <span>{lostReasonLabel(dict, opportunity.lostReason)}</span>
                </div>
              ) : null}
              {opportunity.nextAction ? (
                <div className="border-t border-border pt-2">
                  <span className="text-muted">{dict.opportunities.nextAction}</span>
                  <p className="mt-1 whitespace-pre-wrap">{opportunity.nextAction}</p>
                </div>
              ) : null}
              {opportunity.notes ? (
                <div className="border-t border-border pt-2">
                  <span className="text-muted">{dict.opportunities.notes}</span>
                  <p className="mt-1 whitespace-pre-wrap">{opportunity.notes}</p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dict.opportunities.contact} />
            <CardBody className="space-y-3 text-sm">
              <Link
                href={`/contacts/${opportunity.contact.id}`}
                className="flex items-center gap-2 font-medium text-primary hover:underline"
              >
                <UserIcon className="size-4" />
                {opportunity.contact.name}
              </Link>
              {opportunity.contact.jobTitle ? <div className="text-muted">{opportunity.contact.jobTitle}</div> : null}
              {opportunity.contact.email ? (
                <div className="flex items-center gap-2 text-foreground">
                  <Mail className="size-4 text-muted" />
                  {opportunity.contact.email}
                </div>
              ) : null}
              {opportunity.contact.phone ? (
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="size-4 text-muted" />
                  {opportunity.contact.phone}
                </div>
              ) : null}
            </CardBody>
          </Card>

          {opportunity.company ? (
            <Card>
              <CardHeader title={dict.opportunities.account} />
              <CardBody className="space-y-3 text-sm">
                <Link
                  href={`/companies/${opportunity.company.id}`}
                  className="flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <Building2 className="size-4" />
                  {opportunity.company.name}
                </Link>
                {opportunity.company.industry ? <div className="text-muted">{opportunity.company.industry}</div> : null}
                {opportunity.company.website ? <div className="text-foreground">{opportunity.company.website}</div> : null}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
