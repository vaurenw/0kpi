"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "./header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Calendar, DollarSign, CheckCircle, Clock, ArrowLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

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

interface GoalDetailProps {
  goalId: string
}

export function GoalDetail({ goalId }: GoalDetailProps) {
  const [user, setUser] = useState<any>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/sign-in")
      return
    }

    setUser(JSON.parse(userData))

    // Load specific goal
    const savedGoals = localStorage.getItem("goals")
    if (savedGoals) {
      const goals = JSON.parse(savedGoals)
      const foundGoal = goals.find((g: Goal) => g.id === goalId)
      setGoal(foundGoal || null)
    }
  }, [goalId, router])

  const handleCompleteGoal = () => {
    if (!goal || !user || user.id !== goal.userId || goal.completed) return

    const savedGoals = localStorage.getItem("goals")
    if (savedGoals) {
      const goals = JSON.parse(savedGoals)
      const updatedGoals = goals.map((g: Goal) => (g.id === goal.id ? { ...g, completed: true } : g))
      localStorage.setItem("goals", JSON.stringify(updatedGoals))
      setGoal({ ...goal, completed: true })
    }
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">Goal not found</p>
            <Link href="/">
              <Button className="mt-4">Back to Feed</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = user?.id === goal.userId
  const isExpired = Date.now() > goal.deadline
  const timeLeft = formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })

  const now = Date.now()
  const totalTime = goal.deadline - goal.creationTime
  const elapsedTime = now - goal.creationTime
  const progress = Math.min((elapsedTime / totalTime) * 100, 100)

  const getStatusBadge = () => {
    if (goal.completed) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    }
    if (isExpired && goal.paymentProcessed) {
      return <Badge variant="destructive">Failed - Payment Processed</Badge>
    }
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>
    }
    return <Badge variant="secondary">In Progress</Badge>
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4">
          <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Feed
          </Link>
        </div>

        <Card className="border border-border/40">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={goal.userImage || "/placeholder.svg?height=40&width=40"} />
                  <AvatarFallback className="text-sm">{goal.userName?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{goal.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(goal.creationTime), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {getStatusBadge()}
            </div>

            <CardTitle className="text-lg">{goal.title}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{goal.description}</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Time Progress</span>
                  <span className="text-foreground font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Deadline</p>
                  <p className="text-xs text-muted-foreground">{new Date(goal.deadline).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{isExpired ? "Expired" : timeLeft}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Pledge Amount</p>
                  <p className="text-xs text-muted-foreground">${goal.pledgeAmount}</p>
                  <p className="text-xs text-muted-foreground">
                    {goal.completed ? "Saved!" : isExpired && goal.paymentProcessed ? "Charged" : "At risk"}
                  </p>
                </div>
              </div>
            </div>

            {isOwner && !goal.completed && !isExpired && (
              <div className="pt-4 border-t border-border/40">
                <Button onClick={handleCompleteGoal} className="w-full h-9 text-sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Completed
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Complete your goal to avoid the ${goal.pledgeAmount} charge
                </p>
              </div>
            )}

            {isOwner && goal.completed && (
              <div className="pt-4 border-t border-border/40 text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-800">Congratulations!</p>
                  <p className="text-xs text-green-700">You completed your goal and saved ${goal.pledgeAmount}!</p>
                </div>
              </div>
            )}

            {isExpired && goal.paymentProcessed && (
              <div className="pt-4 border-t border-border/40 text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <Clock className="w-6 h-6 text-red-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-red-800">Goal Expired</p>
                  <p className="text-xs text-red-700">
                    The deadline was missed and ${goal.pledgeAmount} was charged to your account.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
