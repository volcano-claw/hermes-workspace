import { describe, expect, it } from 'vitest'

import { formatTaskAssigneeLabel } from './task-card'
import {
  getTaskGroupLabel,
  getTaskProjectId,
  getTaskSystem,
  groupTasksByLabel,
  isArchivedTask,
  TASKS_BOARD_HELP_TEXT,
} from './tasks-screen'
import type { ClaudeTask } from '@/lib/tasks-api'

describe('tasks UX copy', () => {
  it('exposes helper copy that explains drag and assignment behavior', () => {
    expect(TASKS_BOARD_HELP_TEXT).toBe(
      'Workspace Tasks is the active cockpit. Use Project/System filters for current work; completed native Kanban slices live in Archive, reports, and ledger.',
    )
  })

  it('formats assignee labels explicitly for assigned and unassigned tasks', () => {
    expect(formatTaskAssigneeLabel('jarvis', { jarvis: 'Jarvis' })).toBe(
      'Assignee: Jarvis',
    )
    expect(formatTaskAssigneeLabel(null, {})).toBe('Assignee: Unassigned')
  })

  function task(overrides: Partial<ClaudeTask>): ClaudeTask {
    return {
      id: 'task-1',
      title: 'Task',
      description: '',
      column: 'todo',
      priority: 'medium',
      assignee: null,
      tags: [],
      due_date: null,
      position: 0,
      created_by: 'test',
      created_at: '2026-09-05T00:00:00Z',
      updated_at: '2026-09-05T00:00:00Z',
      ...overrides,
    }
  }

  it('derives project/system grouping metadata with safe fallbacks', () => {
    const grouped = task({
      project_id: 'operator-elite-system-improvements',
      system: 'Workspace',
      group_label: 'Operator Elite / Workspace / t_76891716',
    })
    expect(getTaskProjectId(grouped)).toBe('operator-elite-system-improvements')
    expect(getTaskSystem(grouped)).toBe('Workspace')
    expect(getTaskGroupLabel(grouped)).toBe('Operator Elite / Workspace / t_76891716')

    const fallback = task({ tags: ['project:dbm', 'system:DBM'] })
    expect(getTaskProjectId(fallback)).toBe('dbm')
    expect(getTaskSystem(fallback)).toBe('DBM')
    expect(getTaskGroupLabel(fallback)).toBe('dbm / DBM')
  })

  it('groups tasks by label and treats deleted projected cards as archive', () => {
    const active = task({ id: 'active', group_label: 'A', position: 2 })
    const archived = task({ id: 'archived', group_label: 'A', column: 'deleted', visibility_state: 'archived_done', position: 1 })
    const groups = groupTasksByLabel([active, archived])
    expect(groups).toHaveLength(1)
    expect(groups[0].tasks.map(t => t.id)).toEqual(['archived', 'active'])
    expect(isArchivedTask(active)).toBe(false)
    expect(isArchivedTask(archived)).toBe(true)
  })
})
