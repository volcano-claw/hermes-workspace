import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadStoreWithTasks(tasks: Array<Record<string, unknown>>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-workspace-tasks-'))
  process.env.HERMES_WORKSPACE_TASKS_HOME = dir
  fs.writeFileSync(path.join(dir, 'tasks.json'), JSON.stringify({ tasks }, null, 2) + '\n', 'utf-8')
  vi.resetModules()
  const mod = await import('./tasks-store')
  return { mod, dir }
}

afterEach(() => {
  delete process.env.HERMES_WORKSPACE_TASKS_HOME
  vi.resetModules()
})

describe('tasks-store', () => {
  it('excludes soft-deleted rows from visible task totals even when done tasks are included', async () => {
    const now = '2026-09-05T00:00:00.000Z'
    const base = {
      description: '',
      priority: 'medium',
      assignee: null,
      tags: [],
      due_date: null,
      position: 0,
      created_by: 'test',
      created_at: now,
      updated_at: now,
    }
    const { mod } = await loadStoreWithTasks([
      { ...base, id: 'done-1', title: 'Visible done 1', column: 'done' },
      { ...base, id: 'done-2', title: 'Visible done 2', column: 'done' },
      { ...base, id: 'deleted-1', title: 'Hidden old test row', column: 'deleted' },
    ])

    const visible = mod.listTasks({ includeDone: true })
    expect(visible.map((task) => task.id)).toEqual(['done-1', 'done-2'])
    expect(visible.every((task) => task.column !== 'deleted')).toBe(true)
  })

  it('still allows explicit deleted-column inspection for diagnostics', async () => {
    const now = '2026-09-05T00:00:00.000Z'
    const base = {
      description: '',
      priority: 'medium',
      assignee: null,
      tags: [],
      due_date: null,
      position: 0,
      created_by: 'test',
      created_at: now,
      updated_at: now,
    }
    const { mod } = await loadStoreWithTasks([
      { ...base, id: 'done-1', title: 'Visible done', column: 'done' },
      { ...base, id: 'deleted-1', title: 'Hidden old test row', column: 'deleted' },
    ])

    const deleted = mod.listTasks({ column: 'deleted', includeDone: true })
    expect(deleted).toHaveLength(1)
    expect(deleted[0]).toMatchObject({ id: 'deleted-1', column: 'deleted' })
  })

  it('preserves hierarchy metadata and returns archived rows only when requested', async () => {
    const now = '2026-09-05T00:00:00.000Z'
    const base = {
      description: '',
      priority: 'medium',
      assignee: null,
      tags: [],
      due_date: null,
      position: 0,
      created_by: 'test',
      created_at: now,
      updated_at: now,
    }
    const { mod } = await loadStoreWithTasks([
      {
        ...base,
        id: 'active-1',
        title: 'Active grouped task',
        column: 'todo',
        project_id: 'operator-elite-system-improvements',
        system: 'Workspace',
        group_label: 'Workspace hierarchy',
        visibility_state: 'active',
      },
      {
        ...base,
        id: 'archived-1',
        title: 'Archived projected task',
        column: 'deleted',
        project_id: 'operator-elite-system-improvements',
        system: 'Workspace',
        group_label: 'Workspace hierarchy',
        visibility_state: 'archived_done',
      },
    ])

    const active = mod.listTasks({ includeDone: true })
    expect(active.map((task) => task.id)).toEqual(['active-1'])
    expect(active[0]).toMatchObject({
      project_id: 'operator-elite-system-improvements',
      system: 'Workspace',
      group_label: 'Workspace hierarchy',
    })

    const archive = mod.listTasks({ includeDone: true, includeArchived: true })
    expect(archive.map((task) => task.id)).toEqual(['active-1', 'archived-1'])
    expect(archive[1]).toMatchObject({ column: 'deleted', visibility_state: 'archived_done' })
  })
})