import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, ArrowRightCircle, Mail, Phone, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canAccessOwner, visibleTeamUsers } from "@/lib/scope";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { ServerActionForm } from "@/components/server-action-form";
import { ActivityTimeline } from "@/components/activity-timeline";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { LeadForm } from "@/components/leads/lead-form";
import { deleteLead, convertLead, updateLead } from "@/lib/actions/leads";
import { toggleTaskDone } from "@/lib/actions/tasks";
import { canWrite, type LeadStatus } from "@/lib/validations";
import { leadStatusTone } from "@/lib/badge-tones";
import { cn, formatDate } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { leadStatusLabel, sourceLabel } from "@/i18n/enum-labels";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [lead, owners] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        owner: true,
        convertedAccount: true,
        convertedContact: true,
        convertedOpportunity: true,
        tasks: { orderBy: { dueDate: "asc" } },
        activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
      },
    }),
    visibleTeamUsers(user),
  ]);

  if (!lead) notFound();
  if (!(await canAccessOwner(user, lead.ownerId))) notFound();

  const canEdit = canWrite(user.role) && (await canAccessOwner(user, lead.ownerId));
  const isConverted = lead.status === "CONVERTED";
  const canConvert = canEdit && !isConverted;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{lead.name}</h1>
            <Badge tone={leadStatusTone[lead.status as LeadStatus] ?? "default"}>
              {leadStatusLabel(dict, lead.status)}
            </Badge>
            <Badge tone="default">{dict.leads.scoreBadge.replace("{score}", String(lead.score))}</Badge>
          </div>
          <p className="text-sm text-muted">
            {lead.jobTitle ? `${lead.jobTitle} · ` : ""}
            {lead.companyName || dict.leads.noCompany} · {dict.fields.owner}: {lead.owner.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canConvert ? (
            <ServerActionForm action={convertLead.bind(null, lead.id)}>
              <Button type="submit">
                <ArrowRightCircle className="size-4" />
                {dict.leads.convert}
              </Button>
            </ServerActionForm>
          ) : null}
          {canEdit && !isConverted ? (
            <>
              <ModalFormTrigger
                title={dict.leads.editTitle}
                trigger={
                  <Button variant="secondary">
                    <Pencil className="size-4" />
                    {dict.common.edit}
                  </Button>
                }
              >
                <LeadForm
                  action={updateLead.bind(null, lead.id)}
                  currentUser={user}
                  owners={owners}
                  defaultValues={lead}
                  submitLabel={dict.common.saveChanges}
                />
              </ModalFormTrigger>
              <ConfirmDeleteForm action={deleteLead.bind(null, lead.id)} confirmMessage={dict.leads.deleteConfirm} label={dict.common.delete} />
            </>
          ) : null}
        </div>
      </div>

      {isConverted ? (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-success">{dict.leads.convertedOn.replace("{date}", formatDate(lead.convertedAt))}</span>
            {lead.convertedAccount ? (
              <Link href={`/companies/${lead.convertedAccount.id}`} className="text-primary hover:underline">
                {dict.leads.viewAccount.replace("{name}", lead.convertedAccount.name)}
              </Link>
            ) : null}
            {lead.convertedContact ? (
              <Link href={`/contacts/${lead.convertedContact.id}`} className="text-primary hover:underline">
                {dict.leads.viewContact.replace("{name}", lead.convertedContact.name)}
              </Link>
            ) : null}
            {lead.convertedOpportunity ? (
              <Link href={`/opportunities/${lead.convertedOpportunity.id}`} className="text-primary hover:underline">
                {dict.leads.viewOpportunity.replace("{name}", lead.convertedOpportunity.title)}
              </Link>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={dict.leads.activity} />
            <CardBody>
              <ActivityTimeline activities={lead.activities} leadId={lead.id} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={dict.leads.leadInfo} />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Building2 className="size-4 text-muted" />
                {lead.companyName || "—"}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="size-4 text-muted" />
                {lead.email || "—"}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Phone className="size-4 text-muted" />
                {lead.phone || "—"}
              </div>
              <div className="border-t border-border pt-3 text-xs text-muted">
                {dict.leads.industryLabel.replace("{value}", lead.industry || "—")}
                <br />
                {dict.leads.sourceLabel.replace("{value}", lead.source ? sourceLabel(dict, lead.source) : "—")}
                <br />
                {dict.leads.nextFollowUpLabel.replace("{value}", lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : "—")}
                <br />
                {dict.leads.addedLabel.replace("{value}", formatDate(lead.createdAt))}
              </div>
              {lead.notes ? (
                <div className="border-t border-border pt-3 text-sm whitespace-pre-wrap text-foreground">
                  {lead.notes}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={dict.leads.tasks}
              action={
                <LinkButton href={`/tasks`} size="sm" variant="secondary">
                  <Plus className="size-4" />
                  {dict.leads.task}
                </LinkButton>
              }
            />
            <CardBody className="space-y-2">
              {lead.tasks.map((task) => (
                <ServerActionForm
                  key={task.id}
                  action={toggleTaskDone.bind(null, task.id, !task.done)}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <button
                    type="submit"
                    className={cn(
                      "flex size-5 items-center justify-center rounded border",
                      task.done ? "border-success bg-success text-white" : "border-border"
                    )}
                    aria-label={dict.leads.markTaskDone}
                  >
                    {task.done ? "✓" : ""}
                  </button>
                  <span className={cn("flex-1", task.done && "text-muted line-through")}>{task.title}</span>
                  {task.dueDate ? <span className="text-xs text-muted">{formatDate(task.dueDate)}</span> : null}
                </ServerActionForm>
              ))}
              {lead.tasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">{dict.leads.noTasksLinked}</p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
