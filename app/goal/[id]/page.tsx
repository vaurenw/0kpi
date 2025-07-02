import { GoalDetail } from "@/components/goal-detail"

interface GoalPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function GoalPage({ params }: GoalPageProps) {
  const { id } = await params
  
  return (
    <div className="min-h-screen bg-gray-50">
      <GoalDetail goalId={id} />
    </div>
  )
}
