import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { readGitHubFleetAudit } from '../../server/github-fleet'

export const Route = createFileRoute('/api/github-fleet')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) return json({ error: 'Unauthorized' }, { status: 401 })
        try {
          return json(readGitHubFleetAudit(), {
            headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
          })
        } catch (error) {
          return json(
            { error: error instanceof Error ? error.message : 'GitHub fleet audit unavailable' },
            { status: 503 },
          )
        }
      },
    },
  },
})
