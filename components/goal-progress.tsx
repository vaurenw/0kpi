"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign } from "lucide-react"

interface GoalProgressProps {
  goal: {
    _id: string
    title: string
    deadline: number
    pledgeAmount: number
    completed: boolean
    _creationTime: number
  }
}

export function GoalProgress({ goal }: GoalProgressProps) {
  const now = Date.now()
  const totalTime = goal.deadline - goal._creationTime
  const elapsedTime = now - goal._creationTime
  const progress = Math.min((elapsedTime / totalTime) * 100, 100)
  const timeLeft = goal.deadline - now
  const isExpired = timeLeft <= 0

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return "Expired"

    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h left`
    if (hours > 0) return `${hours}h ${minutes}m left`
    return `${minutes}m left`
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{goal.title}</CardTitle>
          <Badge variant={goal.completed ? "default" : isExpired ? "destructive" : "secondary"}>
            {goal.completed ? "Completed" : isExpired ? "Expired" : "Active"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{formatTimeLeft(timeLeft)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <DollarSign className="w-4 h-4" />
            <span>${goal.pledgeAmount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
