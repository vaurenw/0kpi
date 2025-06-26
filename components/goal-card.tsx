"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, DollarSign, CheckCircle, Clock, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useState, useEffect } from "react"

interface Goal {
  id: string
  title: string
  description: string
  deadline: number
  pledgeAmount: number
  completed: boolean
  paymentProcessed: boolean
  userId: string
  userName: string
  userImage?: string
  creationTime: number
}

interface GoalCardProps {
  goal: Goal
}

export function GoalCard({ goal }: GoalCardProps) {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const isOwner = user?.id === goal.userId
  const isExpired = Date.now() > goal.deadline
  const timeLeft = formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })

  const handleCompleteGoal = () => {
    if (isOwner && !goal.completed && !isExpired) {
      // Update goal in localStorage
      const savedGoals = localStorage.getItem("goals")
      if (savedGoals) {
        const goals = JSON.parse(savedGoals)
        const updatedGoals = goals.map((g: Goal) => (g.id === goal.id ? { ...g, completed: true } : g))
        localStorage.setItem("goals", JSON.stringify(updatedGoals))
        window.location.reload() // Simple refresh to update UI
      }
    }
  }

  const getStatusBadge = () => {
    if (goal.completed) {
      return (
        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs">
          Completed
        </Badge>
      )
    }
    if (isExpired && goal.paymentProcessed) {
      return (
        <Badge variant="destructive" className="text-xs">
          Failed
        </Badge>
      )
    }
    if (isExpired) {
      return (
        <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
          Expired
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs">
        Active
      </Badge>
    )
  }

  return (
    <Card className="border border-border/40 hover:border-border/60 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={goal.userImage || "/placeholder.svg?height=28&width=28"} />
              <AvatarFallback className="text-xs">{goal.userName?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{goal.userName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(goal.creationTime), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            <Link href={`/goal/${goal.id}`}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground leading-tight">{goal.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{goal.description}</p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{isExpired ? "Expired" : timeLeft}</span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="w-3 h-3" />
              <span>${goal.pledgeAmount}</span>
            </div>
          </div>

          {isOwner && !goal.completed && !isExpired && (
            <Button onClick={handleCompleteGoal} size="sm" className="h-7 text-xs px-3">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Button>
          )}
        </div>

        {isOwner && goal.completed && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <p className="text-xs text-green-600 flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>Goal completed! Saved ${goal.pledgeAmount}</span>
            </p>
          </div>
        )}

        {isExpired && goal.paymentProcessed && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <p className="text-xs text-red-600 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Payment of ${goal.pledgeAmount} was processed</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
