import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { OperatorScreen } from '@/screens/operator/operator-screen'

export const Route = createFileRoute('/operator')({
  ssr: false,
  component: OperatorRoute,
})

function OperatorRoute() {
  usePageTitle('Operator')
  return <OperatorScreen />
}
