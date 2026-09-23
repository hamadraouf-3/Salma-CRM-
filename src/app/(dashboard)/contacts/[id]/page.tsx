import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  Mail,
  Phone,
  Building2,
  ExternalLink,
  Star,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canAccessOwner, ownedScope, visibleTeamUsers } from "@/lib/scope";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatGrid } from "@/components/ui/stat-grid";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/tasks/task-list";
import { TaskForm } from "@/components/tasks/task-form";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { ContactForm } from "@/components/contacts/contact-form";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { deleteContact, updateContact } from "@/lib/actions/contacts";
import { createTask } from "@/lib/actions/tasks";
import { createOpportunity } from "@/lib/actions/opportunities";
import { getPipelineStages, getPipelineStagesForOpportunities } from "@/lib/pipeline-stages";
import {
  canWrite,
  type ContactStatus,
  type OpportunityStage,
  type LeadStatus,
} from "@/lib/validations";
import { contactStatusTone, opportunityStageTone, leadStatusTone } from "@/lib/badge-tones";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { contactStatusLabel, resolveStageLabel, leadStatusLabel } from "@/i18n/enum-labels";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      owner: true,
      company: true,
      tags: true,
      opportunities: { orderBy: { createdAt: "desc" }, include: { owner: true } },
      tasks: { orderBy: [{ done: "asc" }, { dueDate: "asc" }], include: { assignee: true } },
      activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
      leads: { orderBy: { createdAt: "desc" }, include: { owner: true } },
    },
  });

  if (!contact) notFound();
  if (!(await canAccessOwner(user, contact.ownerId))) notFound();

  const scope = await ownedScope(user);
  const [assignees, companies, newOpportunityStages] = await Promise.all([
    visibleTeamUsers(user),
    // Scoped to what this user owns, but always including the contact's *current* company even if it
    // belongs to someone else, so the edit form's dropdown can't silently drop the real selection.
    prisma.company.findMany({
      where: { OR: [scope, { id: contact.companyId ?? "" }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getPipelineStages(),
  ]);

  const stages = await getPipelineStagesForOpportunities(contact.opportunities.map((o) => o.id));

  const canEdit = canWrite(user.role) && (await canAccessOwner(user, contact.ownerId));

  const openOpportunities = contact.opportunities.filter((o) => !["WON", "LOST"].includes(o.stage));
  const wonOpportunities = contact.opportunities.filter((o) => o.stage === "WON");
  const lostOpportunities = contact.opportunities.filter((o) => o.stage === "LOST");
  const pipelineValue = openOpportunities.reduce((sum, o) => sum + o.value, 0);
  const wonValue = wonOpportunities.reduce((sum, o) => sum + o.value, 0);
  const winRate =
    wonOpportunities.length + lostOpportunities.length > 0
      ? Math.round((wonOpportunities.length / (wonOpportunities.length + lostOpportunities.length)) * 100)
      : null;
  const openTasks = contact.tasks.filter((t) => !t.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{contact.name}</h1>
            <Badge tone={contactStatusTone[contact.status as ContactStatus] ?? "default"}>
              {contactStatusLabel(dict, contact.status)}
            </Badge>
            {contact.isDecisionMaker ? (
              <Badge tone="primary">
                <ShieldCheck className="me-1 size-3" />
                {dict.fields.decisionMaker}
              </Badge>
            ) : null}
            {contact.isPrimary ? (
              <Badge tone="success">
                <Star className="me-1 size-3" />
                {dict.contacts.primary}
              </Badge>
            ) : null}
            {contact.tags.map((t) => (
              <Badge key={t.id} tone="default">
                {t.name}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted">
            {contact.jobTitle ? `${contact.jobTitle} · ` : ""}
            {dict.fields.owner}: {contact.owner.name}
            {contact.company ? (
              <>
                {" · "}
                <Link href={`/companies/${contact.company.id}`} className="text-primary hover:underline">
                  {contact.company.name}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <ModalFormTrigger
              title={dict.contacts.editTitle}
              trigger={
                <Button variant="secondary">
                  <Pencil className="size-4" />
                  {dict.common.edit}
                </Button>
              }
            >
              <ContactForm
                action={updateContact.bind(null, contact.id)}
                currentUser={user}
                owners={assignees}
                companies={companies}
                defaultValues={{ ...contact, tags: contact.tags.map((t) => t.name).join(", ") }}
                submitLabel={dict.common.saveChanges}
              />
            </ModalFormTrigger>
            <ConfirmDeleteForm
              action={deleteContact.bind(null, contact.id)}
              confirmMessage={dict.contacts.deleteConfirm}
              label={dict.common.delete}
            />
          </div>
        ) : null}
      </div>

      <StatGrid
        stats={[
          { label: dict.contacts.statOpportunities, value: String(contact.opportunities.length) },
          { label: dict.contacts.statPipelineValue, value: formatCurrency(pipelineValue) },
          { label: dict.contacts.statWonValue, value: formatCurrency(wonValue), tone: "success" },
          { label: dict.contacts.statWinRate, value: winRate === null ? "—" : `${winRate}%` },
          { label: dict.contacts.statOpenTasks, value: String(openTasks.length), tone: openTasks.length > 0 ? "danger" : "default" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {contact.leads.length > 0 ? (
            <Card>
              <CardHeader title={dict.contacts.originatedFrom} />
              <CardBody className="space-y-2">
                {contact.leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-background"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Flame className="size-4 text-muted" />
                        {lead.name}
                      </div>
                      <div className="mt-0.5 ps-6 text-xs text-muted">
                        {dict.opportunities.createdBy}: {lead.owner.name}
                      </div>
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
            <CardHeader title={dict.contacts.activity} />
            <CardBody>
              <ActivityTimeline activities={contact.activities} contactId={contact.id} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dict.contacts.opportunities} />
            <CardBody className="space-y-4">
              {canEdit ? (
                <OpportunityForm
                  action={createOpportunity}
                  currentUser={user}
                  owners={assignees}
                  contacts={[]}
                  companies={[]}
                  stages={newOpportunityStages}
                  defaultValues={{ contactId: contact.id, companyId: contact.company?.id ?? null }}
                  returnTo={`/contacts/${contact.id}`}
                  submitLabel={dict.common.add}
                  compact
                  resetOnSuccess
                />
              ) : null}
              <div className="space-y-2">
                {contact.opportunities.map((opportunity) => (
                  <Link
                    key={opportunity.id}
                    href={`/opportunities/${opportunity.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-background"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">{opportunity.title}</div>
                      <div className="text-xs text-muted">{opportunity.owner.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(opportunity.value, opportunity.currency)}
                      </span>
                      <Badge tone={opportunityStageTone[opportunity.stage as OpportunityStage] ?? "primary"}>
                        {resolveStageLabel(dict, opportunity.stage, stages)}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {contact.opportunities.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted">{dict.contacts.noOpportunities}</p>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dict.contacts.tasks} />
            <CardBody className="space-y-4">
              {canEdit ? (
                <TaskForm
                  action={createTask}
                  currentUser={user}
                  assignees={assignees}
                  defaultValues={{ contactId: contact.id }}
                  submitLabel={dict.common.add}
                  compact
                  resetOnSuccess
                />
              ) : null}
              <TaskList
                tasks={contact.tasks}
                canManage={canEdit}
                currentUser={user}
                assignees={assignees}
                emptyMessage={dict.contacts.noTasksLinked}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={dict.contacts.contactInfo} />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Building2 className="size-4 text-muted" />
                {contact.company?.name ?? "—"}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="size-4 text-muted" />
                {contact.email || "—"}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Phone className="size-4 text-muted" />
                {contact.phone || "—"}
              </div>
              {contact.linkedIn ? (
                <div className="flex items-center gap-2 text-foreground">
                  <ExternalLink className="size-4 text-muted" />
                  <a href={contact.linkedIn} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {dict.contacts.linkedinProfile}
                  </a>
                </div>
              ) : null}
              <div className="border-t border-border pt-3 text-xs text-muted">
                {dict.contacts.departmentLabel.replace("{value}", contact.department || "—")}
                <br />
                {dict.contacts.sourceLabel.replace("{value}", contact.source || "—")}
                <br />
                {dict.contacts.addedLabel.replace("{value}", formatDate(contact.createdAt))}
              </div>
              {contact.notes ? (
                <div className="border-t border-border pt-3 text-sm whitespace-pre-wrap text-foreground">
                  {contact.notes}
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
