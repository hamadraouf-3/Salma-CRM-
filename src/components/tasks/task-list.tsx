"use client";

import { Pencil, Phone, Mail, Users, Clock, CircleDot, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ModalFormTrigger } from "@/components/ui/modal-form-trigger";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { TaskForm } from "@/components/tasks/task-form";
import { toggleTaskDone, updateTask, deleteTask } from "@/lib/actions/tasks";
import { type TaskPriority, type TaskType } from "@/lib/validations";
import { taskPriorityTone } from "@/lib/badge-tones";
import { cn, formatDateMaybeTime } from "@/lib/utils";
import { useDict } from "@/i18n/locale-context";
import { taskPriorityLabel, taskTypeLabel } from "@/i18n/enum-labels";

const TASK_TYPE_ICON: Record<TaskType, typeof Phone> = {
  MEETING: Users,
  CALL: Phone,
  EMAIL: Mail,
  FOLLOW_UP: Clock,
  OTHER: CircleDot,
};

type Option = { id: string; name: string };

type TaskItem = {
  id: string;
  title: string;
  description?: string | null;
  done: boolean;
  dueDate: Date | string | null;
  priority: string;
  type?: string;
  assigneeId: string;
  leadId?: string | null;
  companyId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  assignee: { name: string };
};

export function TaskList({
  tasks,
  canManage,
  currentUser,
  assignees,
  emptyMessage,
}: {
  tasks: TaskItem[];
  canManage: boolean;
  currentUser?: { id: string; role: string };
  assignees?: Option[];
  emptyMessage?: string;
}) {
  const dict = useDict();
  const now = new Date();
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const overdue = !task.done && !!task.dueDate && new Date(task.dueDate) < now;
        const TypeIcon = TASK_TYPE_ICON[task.type as TaskType] ?? CircleDot;
        return (
          <div
            key={task.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <form action={toggleTaskDone.bind(null, task.id, !task.done)}>
              <button
                type="submit"
                disabled={!canManage}
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
              title={taskTypeLabel(dict, task.type ?? "OTHER")}
            >
              <TypeIcon className="size-3.5" />
            </span>

            <div className="min-w-40 flex-1">
              <div className={cn("text-sm font-medium text-foreground", task.done && "text-muted line-through")}>
                {task.title}
              </div>
              <div className="text-xs text-muted">{task.assignee.name}</div>
            </div>

            <Badge tone={overdue ? "danger" : taskPriorityTone[task.priority as TaskPriority] ?? "default"}>
              {taskPriorityLabel(dict, task.priority)}
            </Badge>
            {task.dueDate ? (
              <span className={cn("text-xs", overdue ? "text-danger" : "text-muted")}>
                {formatDateMaybeTime(task.dueDate)}
              </span>
            ) : null}
            {canManage && currentUser && assignees ? (
              <ModalFormTrigger
                title={dict.tasks.editTitle}
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
                    currentUser={currentUser}
                    assignees={assignees}
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
      {tasks.length === 0 ? <EmptyState icon={ListChecks} message={emptyMessage ?? dict.tasks.noTasksYet} /> : null}
    </div>
  );
}
