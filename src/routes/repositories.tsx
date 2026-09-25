import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { RepositoriesScreen } from '@/screens/repositories/repositories-screen'

export const Route = createFileRoute('/repositories')({
  ssr: false,
  component: RepositoriesRoute,
})

function RepositoriesRoute() {
  usePageTitle('Repos')
  return <RepositoriesScreen />
}
