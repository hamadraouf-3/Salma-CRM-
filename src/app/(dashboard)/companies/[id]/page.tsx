import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Globe, Phone, MapPin, Mail, Flame } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canAccessOwner, visibleTeamUsers } from "@/lib/scope";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatGrid } from "@/components/ui/stat-grid";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/tasks/task-list";
import { TaskForm } from "@/components/tasks/task-form";
import { ContactForm } from "@/components/contacts/contact-form";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { CompanyForm } from "@/components/companies/company-form";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { deleteCompany, updateCompany } from "@/lib/actions/companies";
import { createTask } from "@/lib/actions/tasks";
import { createContact } from "@/lib/actions/contacts";
import { createOpportunity } from "@/lib/actions/opportunities";
import { getPipelineStages, getPipelineStagesForOpportunities } from "@/lib/pipeline-stages";
import {
  canWrite,
  type ContactStatus,
  type OpportunityStage,
  type AccountStatus,
  type LeadStatus,
} from "@/lib/validations";
import { contactStatusTone, opportunityStageTone, accountStatusTone, leadStatusTone } from "@/lib/badge-tones";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { contactStatusLabel, resolveStageLabel, accountStatusLabel, leadStatusLabel } from "@/i18n/enum-labels";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [company, assignees, newOpportunityStages] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        owner: true,
        contacts: { orderBy: { createdAt: "desc" }, include: { owner: true } },
        opportunities: { orderBy: { createdAt: "desc" }, include: { owner: true } },
        activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
        tasks: { orderBy: [{ done: "asc" }, { dueDate: "asc" }], include: { assignee: true } },
        leads: { orderBy: { createdAt: "desc" } },
      },
    }),
    visibleTeamUsers(user),
    getPipelineStages(),
  ]);

  if (!company) notFound();

  const stages = await getPipelineStagesForOpportunities(company.opportunities.map((o) => o.id));
  if (!(await canAccessOwner(user, company.ownerId))) notFound();

  const canEdit = canWrite(user.role) && (await canAccessOwner(user, company.ownerId));

  const openOpportunities = company.opportunities.filter((o) => !["WON", "LOST"].includes(o.stage));
  const wonOpportunities = company.opportunities.filter((o) => o.stage === "WON");
  const lostOpportunities = company.opportunities.filter((o) => o.stage === "LOST");
  const pipelineValue = openOpportunities.reduce((sum, o) => sum + o.value, 0);
  const wonValue = wonOpportunities.reduce((sum, o) => sum + o.value, 0);
  const winRate =
    wonOpportunities.length + lostOpportunities.length > 0
      ? Math.round((wonOpportunities.length / (wonOpportunities.length + lostOpportunities.length)) * 100)
      : null;
  const openTasks = company.tasks.filter((t) => !t.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
            <Badge tone={accountStatusTone[company.accountStatus as AccountStatus] ?? "default"}>
              {accountStatusLabel(dict, company.accountStatus)}
            </Badge>
          </div>
          <p className="text-sm text-muted">{dict.fields.owner}: {company.owner.name}</p>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <ModalFormTrigger
              title={dict.companies.editTitle}
              trigger={
                <Button variant="secondary">
                  <Pencil className="size-4" />
                  {dict.common.edit}
                </Button>
              }
            >
              <CompanyForm
                action={updateCompany.bind(null, company.id)}
                currentUser={user}
                owners={assignees}
                defaultValues={company}
                submitLabel={dict.common.saveChanges}
              />
            </ModalFormTrigger>
            <ConfirmDeleteForm
              action={deleteCompany.bind(null, company.id)}
              confirmMessage={dict.companies.deleteConfirm}
              label={dict.common.delete}
            />
          </div>
        ) : null}
      </div>

      <StatGrid
        stats={[
          { label: dict.companies.statContacts, value: String(company.contacts.length) },
          { label: dict.companies.statOpportunities, value: String(company.opportunities.length) },
          { label: dict.companies.statPipelineValue, value: formatCurrency(pipelineValue) },
          { label: dict.companies.statWonValue, value: formatCurrency(wonValue), tone: "success" },
          { label: dict.companies.statWinRate, value: winRate === null ? "—" : `${winRate}%` },
          { label: dict.companies.statOpenTasks, value: String(openTasks.length), tone: openTasks.length > 0 ? "danger" : "default" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {company.leads.length > 0 ? (
            <Card>
              <CardHeader title={dict.companies.originatedFrom} />
              <CardBody className="space-y-2">
                {company.leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-background"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Flame className="size-4 text-muted" />
                      {lead.name}
                    </div>
                    <Badge tone={leadStatusTone[lead.status as LeadStatus] ?? "default"}>
                      {leadStatusLabel(dict, lead.status)}
                    </Badge>
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={dict.companies.activity} />
            <CardBody>
              <ActivityTimeline activities={company.activities} companyId={company.id} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dict.companies.opportunities} />
            <CardBody className="space-y-4">
              {canEdit ? (
                company.contacts.length > 0 ? (
                  <OpportunityForm
                    action={createOpportunity}
                    currentUser={user}
                    owners={assignees}
                    contacts={company.contacts.map((c) => ({ id: c.id, name: c.name }))}
                    companies={[]}
                    stages={newOpportunityStages}
                    defaultValues={{ companyId: company.id }}
                    returnTo={`/companies/${company.id}`}
                    submitLabel={dict.common.add}
                    compact
                    resetOnSuccess
                  />
                ) : (
                  <p className="text-xs text-muted">{dict.companies.addContactFirst}</p>
                )
              ) : null}
              <div className="space-y-2">
                {company.opportunities.map((o) => (
                  <Link
                    key={o.id}
                    href={`/opportunities/${o.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-background"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">{o.title}</div>
                      <div className="text-xs text-muted">{o.owner.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">{formatCurrency(o.value, o.currency)}</span>
                      <Badge tone={opportunityStageTone[o.stage as OpportunityStage] ?? "primary"}>
                        {resolveStageLabel(dict, o.stage, stages)}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {company.opportunities.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted">{dict.companies.noOpportunities}</p>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dict.companies.contactsTitle} />
            <CardBody className="space-y-4">
              {canEdit ? (
                <ContactForm
                  action={createContact}
                  currentUser={user}
                  owners={assignees}
                  companies={[]}
                  defaultValues={{ companyId: company.id }}
                  returnTo={`/companies/${company.id}`}
                  submitLabel={dict.common.add}
                  compact
                  resetOnSuccess
                />
              ) : null}
              <div className="space-y-2">
                {company.contacts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contacts/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-background"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {c.name}
                        {c.isPrimary ? <span className="ms-2 text-xs text-primary">{dict.companies.primary}</span> : null}
                      </div>
                      <div className="text-xs text-muted">{c.jobTitle || c.email || c.phone || "—"}</div>
                    </div>
                    <Badge tone={contactStatusTone[c.status as ContactStatus] ?? "default"}>
                      {contactStatusLabel(dict, c.status)}
                    </Badge>
                  </Link>
                ))}
                {company.contacts.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted">{dict.companies.noContacts}</p>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dict.companies.tasks} />
            <CardBody className="space-y-4">
              {canEdit ? (
                <TaskForm
                  action={createTask}
                  currentUser={user}
                  assignees={assignees}
                  defaultValues={{ companyId: company.id }}
                  submitLabel={dict.common.add}
                  compact
                  resetOnSuccess
                />
              ) : null}
              <TaskList
                tasks={company.tasks}
                canManage={canEdit}
                currentUser={user}
                assignees={assignees}
                emptyMessage={dict.companies.noTasksLinked}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={dict.companies.accountInfo} />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Globe className="size-4 text-muted" />
                {company.website || "—"}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="size-4 text-muted" />
                {company.email || "—"}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Phone className="size-4 text-muted" />
                {company.phone || "—"}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="size-4 text-muted" />
                {[company.city, company.country].filter(Boolean).join(", ") || company.address || "—"}
              </div>
              <div className="border-t border-border pt-3 text-xs text-muted">
                {company.legalName ? (
                  <>
                    {dict.companies.legalNameLabel.replace("{value}", company.legalName)}
                    <br />
                  </>
                ) : null}
                {dict.companies.industryLabel.replace("{value}", company.industry || "—")}
                <br />
                {dict.companies.companySizeLabel.replace("{value}", company.companySize || "—")}
                <br />
                {dict.companies.sourceLabel.replace("{value}", company.source || "—")}
                <br />
                {dict.companies.addedLabel.replace("{value}", formatDate(company.createdAt))}
              </div>
              {company.notes ? (
                <div className="border-t border-border pt-3 text-sm whitespace-pre-wrap text-foreground">
                  {company.notes}
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
