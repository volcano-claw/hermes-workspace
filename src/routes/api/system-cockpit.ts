import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { getSystemCockpitSnapshot } from '../../server/system-cockpit'

export const Route = createFileRoute('/api/system-cockpit')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        return json(await getSystemCockpitSnapshot())
      },
    },
  },
})
