import Link from "next/link";
import { Pencil, Phone, Mail, Users, Clock, CircleDot, CalendarClock, ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ownedScope, opportunityScope, visibleTeamUsers } from "@/lib/scope";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskForm } from "@/components/tasks/task-form";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { EmptyState } from "@/components/ui/empty-state";
import { createTask, updateTask, deleteTask, toggleTaskDone } from "@/lib/actions/tasks";
import { canWrite, type TaskPriority, type TaskType } from "@/lib/validations";
import { taskPriorityTone } from "@/lib/badge-tones";
import { cn, formatDateMaybeTime } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { taskPriorityLabel, taskTypeLabel } from "@/i18n/enum-labels";

const TASK_TYPE_ICON: Record<TaskType, typeof Phone> = {
  MEETING: Users,
  CALL: Phone,
  EMAIL: Mail,
  FOLLOW_UP: Clock,
  OTHER: CircleDot,
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string; opportunityId?: string; flash?: string }>;
}) {
  const user = await requireUser();
  const { contactId, opportunityId, flash } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [tasks, assignees, contactOptions, opportunityOptions] = await Promise.all([
    prisma.task.findMany({
      where: await ownedScope(user, "assigneeId"),
      include: { assignee: true, contact: true, opportunity: true },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
    }),
    visibleTeamUsers(user),
    prisma.contact.findMany({ where: await ownedScope(user), orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.opportunity.findMany({
      where: await opportunityScope(user),
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }).then((rows) => rows.map((o) => ({ id: o.id, name: o.title }))),
  ]);

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const now = new Date();
  const canManageTasks = canWrite(user.role);
  const upcomingMeetings = pending
    .filter((t) => t.type === "MEETING")
    .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{dict.tasks.title}</h1>
      </div>

      {canManageTasks ? (
        <Card>
          <CardHeader title={dict.tasks.quickAddTask} />
          <CardBody>
            <TaskForm
              action={createTask}
              currentUser={user}
              assignees={assignees}
              defaultValues={{ contactId, opportunityId }}
              submitLabel={dict.common.add}
              compact
              resetOnSuccess
            />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={dict.tasks.upcomingMeetings} />
        <CardBody className="space-y-2">
          {upcomingMeetings.length === 0 ? (
            <EmptyState icon={CalendarClock} message={dict.tasks.noUpcomingMeetings} />
          ) : (
            upcomingMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarClock className="size-4" />
                </span>
                <div className="min-w-48 flex-1">
                  <div className="text-sm font-medium text-foreground">{meeting.title}</div>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    {meeting.contact ? (
                      <span className="inline-flex items-center gap-1">
                        {dict.tasks.meetingWith} {meeting.contact.name}
                      </span>
                    ) : null}
                    {meeting.contact?.email ? (
                      <a href={`mailto:${meeting.contact.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Mail className="size-3" />
                        {meeting.contact.email}
                      </a>
                    ) : null}
                  </div>
                </div>
                <span className="text-sm font-medium text-foreground">{formatDateMaybeTime(meeting.dueDate)}</span>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <TaskGroup title={dict.tasks.groupPending} tasks={pending} />
      <TaskGroup title={dict.tasks.groupCompleted} tasks={done} />
    </div>
  );

  function TaskGroup({
    title,
    tasks: items,
  }: {
    title: string;
    tasks: typeof tasks;
  }) {
    return (
      <Card>
        <CardHeader title={dict.tasks.groupHeader.replace("{title}", title).replace("{count}", String(items.length))} />
        <CardBody className="space-y-2">
          {items.map((task) => {
            const isOverdue = !task.done && !!task.dueDate && task.dueDate < now;
            const TypeIcon = TASK_TYPE_ICON[task.type as TaskType] ?? CircleDot;
            return (
            <div
              key={task.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <form action={toggleTaskDone.bind(null, task.id, !task.done)}>
                <button
                  type="submit"
                  disabled={!canManageTasks}
                  className={cn(
                    "flex size-5 items-center justify-center rounded border disabled:opacity-50",
                    task.done ? "border-success bg-success text-white" : "border-border"
                  )}
                  aria-label={dict.tasks.markTaskDone}
                >
                  {task.done ? "✓" : ""}
                </button>
              </form>

              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                title={taskTypeLabel(dict, task.type)}
              >
                <TypeIcon className="size-3.5" />
              </span>

              <div className="min-w-40 flex-1">
                <div className={cn("text-sm font-medium text-foreground", task.done && "text-muted line-through")}>
                  {task.title}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                  {task.contact ? (
                    <Link href={`/contacts/${task.contact.id}`} className="hover:underline">
                      {task.contact.name}
                    </Link>
                  ) : null}
                  {task.contact?.email ? (
                    <a href={`mailto:${task.contact.email}`} className="inline-flex items-center gap-1 hover:text-primary hover:underline">
                      <Mail className="size-3" />
                      {task.contact.email}
                    </a>
                  ) : null}
                  {task.opportunity ? (
                    <Link href={`/opportunities/${task.opportunity.id}`} className="hover:underline">
                      {task.opportunity.title}
                    </Link>
                  ) : null}
                  <span>{task.assignee.name}</span>
                </div>
              </div>

              <Badge tone={isOverdue ? "danger" : taskPriorityTone[task.priority as TaskPriority] ?? "default"}>
                {taskPriorityLabel(dict, task.priority)}
              </Badge>
              {task.dueDate ? (
                <span className={cn("text-xs", isOverdue ? "text-danger" : "text-muted")}>
                  {formatDateMaybeTime(task.dueDate)}
                </span>
              ) : null}
              {canManageTasks ? (
                <ModalFormTrigger
                  title={dict.tasks.editTitle}
                  closeSignal={flash ?? null}
                  trigger={
                    <button
                      type="button"
                      className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                  }
                >
                  <div className="space-y-4">
                    <TaskForm
                      action={updateTask.bind(null, task.id)}
                      currentUser={user}
                      assignees={assignees}
                      contacts={contactOptions}
                      opportunities={opportunityOptions}
                      defaultValues={task}
                      submitLabel={dict.common.saveChanges}
                    />
                    <ConfirmDeleteForm
                      action={deleteTask.bind(null, task.id)}
                      confirmMessage={dict.tasks.deleteConfirm}
                      label={dict.common.delete}
                    />
                  </div>
                </ModalFormTrigger>
              ) : null}
            </div>
            );
          })}
          {items.length === 0 ? <EmptyState icon={ListChecks} message={dict.tasks.noTasksHere} /> : null}
        </CardBody>
      </Card>
    );
  }
}
