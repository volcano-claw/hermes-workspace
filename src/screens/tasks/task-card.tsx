import { cn } from '@/lib/utils'
import type { ClaudeTask } from '@/lib/tasks-api'
import { PRIORITY_COLORS, isOverdue } from '@/lib/tasks-api'

type Props = {
  task: ClaudeTask
  assigneeLabels?: Record<string, string>
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  isDragging?: boolean
}

export function formatTaskAssigneeLabel(
  assignee: string | null,
  assigneeLabels: Record<string, string>,
): string {
  const resolvedLabel = assignee ? (assigneeLabels[assignee] ?? assignee) : 'Unassigned'
  return `Assignee: ${resolvedLabel}`
}

export function formatTaskActivityLabel(task: ClaudeTask): string | null {
  if (!task.native_kanban_id && !task.activity_label && !task.native_status) return null
  if (task.activity_label) return task.activity_label
  if (task.native_status === 'running') {
    const age = typeof task.heartbeat_age_sec === 'number' ? `${task.heartbeat_age_sec}s ago` : 'unknown heartbeat'
    const run = task.native_run_id ? `run #${task.native_run_id}` : 'running'
    return `Active: ${run}, heartbeat ${age}`
  }
  if (task.native_status) return `Native: ${task.native_status}`
  return null
}

export function TaskCard({ task, assigneeLabels = {}, onClick, onDragStart, isDragging }: Props) {
  const overdue = isOverdue(task)
  const priorityColor = PRIORITY_COLORS[task.priority]
  const visibleTags = task.tags.slice(0, 2)
  const extraTagCount = task.tags.length - 2
  const assigneeLabel = formatTaskAssigneeLabel(task.assignee, assigneeLabels)
  const projectLabel = task.project_id || task.group_label || null
  const systemLabel = task.system || null
  const activityLabel = formatTaskActivityLabel(task)
  const activityState = task.activity_state || (task.native_status === 'running' ? 'active' : null)
  const activityClass = activityState === 'stale'
    ? 'border-amber-400/60 bg-amber-400/10 text-amber-300'
    : activityState === 'dead'
      ? 'border-red-400/60 bg-red-400/10 text-red-300'
      : 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        'relative rounded-lg border p-3 cursor-pointer transition-all select-none',
        'bg-[var(--theme-card)] border-[var(--theme-border)]',
        'hover:border-[var(--theme-accent)]',
        isDragging ? 'opacity-40 rotate-1 shadow-2xl' : 'hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)]',
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: priorityColor }}
    >
      {/* Priority dot in top-right */}
      <span
        className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full shrink-0"
        style={{ background: priorityColor }}
        title={`Priority: ${task.priority}`}
      />

      <p className="text-sm font-medium text-[var(--theme-text)] leading-snug mb-1 line-clamp-2 pr-4">
        {task.title}
      </p>

      {task.description && (
        <p className="text-xs text-[var(--theme-muted)] line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {(projectLabel || systemLabel || activityLabel) && (
        <div className="mb-2 flex flex-wrap gap-1 text-[10px]">
          {projectLabel && (
            <span className="rounded-md bg-[var(--theme-hover)] px-1.5 py-0.5 text-[var(--theme-muted)]">
              Project: {projectLabel}
            </span>
          )}
          {systemLabel && (
            <span className="rounded-md bg-[var(--theme-hover)] px-1.5 py-0.5 text-[var(--theme-muted)]">
              System: {systemLabel}
            </span>
          )}
          {activityLabel && (
            <span
              className={cn('rounded-md border px-1.5 py-0.5 font-semibold', activityClass)}
              title={task.activity_detail || undefined}
            >
              {activityLabel}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--theme-hover)] text-[var(--theme-muted)]">
            {assigneeLabel}
          </span>
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--theme-hover)] text-[var(--theme-muted)]"
            >
              {tag}
            </span>
          ))}
          {extraTagCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--theme-hover)] text-[var(--theme-muted)]">
              +{extraTagCount} more
            </span>
          )}
        </div>

        {task.due_date && (
          <div className="flex items-center gap-1 text-[10px] tabular-nums">
            {overdue && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="text-red-400 font-semibold">Overdue</span>
                <span className="text-[var(--theme-muted)] mx-0.5">·</span>
              </>
            )}
            <span className={overdue ? 'text-red-400 font-semibold' : 'text-[var(--theme-muted)]'}>
              {(() => {
                const [y, m, d] = task.due_date!.split('-').map(Number)
                return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              })()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
