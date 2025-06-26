"use client"

import { SignedIn } from "@clerk/nextjs"
import { Header } from "@/components/header"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Target, CheckCircle, XCircle, Clock } from "lucide-react"
import Link from "next/link"

export default function MyGoalsPage() {
  return (
    <SignedIn>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">My Goals</h1>
              <p className="text-sm text-muted-foreground">Track your personal goals and pledges</p>
            </div>
            <Link href="/create-goal">
              <Button size="sm" className="h-8">
                <Plus className="w-4 h-4 mr-1" />
                Create Goal
              </Button>
            </Link>
          </div>
          
          <MyGoalsContent />
        </div>
      </div>
    </SignedIn>
  )
}

function MyGoalsContent() {
  const { user } = useUser()
  const { convexUser } = useAuth()
  
  // Fetch user's goals from Convex
  const userGoals = useQuery(
    api.goals.getUserGoals,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  )

  if (!user) return null

  const goals = userGoals || []
  const isLoading = userGoals === undefined

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No goals yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first goal to start your accountability journey
          </p>
          <Link href="/create-goal">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <Card key={goal._id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{goal.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  ${goal.pledgeAmount} pledge
                </p>
              </div>
              <GoalStatus goal={goal} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {goal.description}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Deadline: {new Date(goal.deadline).toLocaleDateString()}
              </div>
              <div>
                Created: {new Date(goal._creationTime).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function GoalStatus({ goal }: { goal: any }) {
  const now = Date.now()
  const isExpired = goal.deadline <= now
  const isCompleted = goal.completed

  if (isCompleted) {
    return (
      <div className="flex items-center text-green-600">
        <CheckCircle className="w-4 h-4 mr-1" />
        <span className="text-sm font-medium">Completed</span>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="flex items-center text-red-600">
        <XCircle className="w-4 h-4 mr-1" />
        <span className="text-sm font-medium">Expired</span>
      </div>
    )
  }

  return (
    <div className="flex items-center text-blue-600">
      <Target className="w-4 h-4 mr-1" />
      <span className="text-sm font-medium">Active</span>
    </div>
  )
}
