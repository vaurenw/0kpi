import { GoalDetail } from "@/components/goal-detail"

interface GoalPageProps {
  params: {
    id: string
  }
}

export default function GoalPage({ params }: GoalPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <GoalDetail goalId={params.id} />
    </div>
  )
}
