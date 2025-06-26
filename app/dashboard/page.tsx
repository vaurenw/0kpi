"use client"

import { SignedIn } from "@clerk/nextjs"
import { Header } from "@/components/header"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Target, CheckCircle, XCircle, Clock, User, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

export default function DashboardPage() {
  return (
    <SignedIn>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your goals and account</p>
          </div>
          
          <DashboardContent />
        </div>
      </div>
    </SignedIn>
  )
}

function DashboardContent() {
  const { user } = useUser()
  const { convexUser } = useAuth()
  const searchParams = useSearchParams()
  
  // Handle success redirect from Stripe Checkout
  useEffect(() => {
    const success = searchParams.get('success')
    const sessionId = searchParams.get('session_id')
    
    if (success === 'true' && sessionId) {
      handlePaymentSuccess(sessionId)
    }
  }, [searchParams])

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      // Get the pending goal data from sessionStorage
      const pendingGoalData = sessionStorage.getItem('pendingGoal')
      if (!pendingGoalData) {
        toast.error('No pending goal found')
        return
      }

      const goalData = JSON.parse(pendingGoalData)

      // Complete the goal creation
      const response = await fetch('/api/stripe/complete-goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          goalData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete goal creation')
      }

      // Clear the pending goal data
      sessionStorage.removeItem('pendingGoal')

      toast.success('Goal created successfully! Your payment method has been set up.')
      
      // Remove the success parameters from the URL
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
      
    } catch (error) {
      console.error('Error completing goal creation:', error)
      toast.error('Failed to complete goal creation. Please try again.')
    }
  }
  
  // Fetch user's goals from Convex
  const userGoals = useQuery(
    api.goals.getUserGoals,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  )

  if (!user) return null

  const goals = userGoals || []
  const isLoading = userGoals === undefined

  return (
    <Tabs defaultValue="goals" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="goals" className="flex items-center space-x-2">
          <Target className="w-4 h-4" />
          <span>My Goals</span>
        </TabsTrigger>
        <TabsTrigger value="profile" className="flex items-center space-x-2">
          <User className="w-4 h-4" />
          <span>Profile</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="goals" className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">My Goals</h2>
            <p className="text-sm text-muted-foreground">Track your personal goals and pledges</p>
          </div>
          <Link href="/create-goal">
            <Button size="sm" className="h-8">
              <Plus className="w-4 h-4 mr-1" />
              Create Goal
            </Button>
          </Link>
        </div>
        
        <GoalsContent goals={goals} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="profile" className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
        </div>
        
        <ProfileContent goals={goals} />
      </TabsContent>
    </Tabs>
  )
}

function GoalsContent({ goals, isLoading }: { goals: any[], isLoading: boolean }) {
  const { convexUser } = useAuth()
  const completeGoal = useMutation(api.goals.completeGoal)
  const [completingGoalId, setCompletingGoalId] = useState<string | null>(null)

  // Deduplicate goals by _id
  const uniqueGoals = Array.from(new Map(goals.map(g => [g._id, g])).values())

  const handleCompleteGoal = async (goalId: string) => {
    if (!convexUser) {
      toast.error("You must be logged in to complete goals")
      return
    }

    setCompletingGoalId(goalId)
    
    try {
      await completeGoal({
        goalId,
        userId: convexUser._id,
      })
      
      toast.success("Goal completed successfully! 🎉")
    } catch (error) {
      console.error("Error completing goal:", error)
      toast.error(error instanceof Error ? error.message : "Failed to complete goal")
    } finally {
      setCompletingGoalId(null)
    }
  }

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

  if (uniqueGoals.length === 0) {
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
      {uniqueGoals.map((goal) => (
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
            
            {/* Completion Button */}
            {!goal.completed && goal.deadline > Date.now() && (
              <div className="mt-4 pt-3 border-t border-border/40">
                <Button 
                  onClick={() => handleCompleteGoal(goal._id)}
                  disabled={completingGoalId === goal._id}
                  className="w-full"
                  size="sm"
                >
                  {completingGoalId === goal._id ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Complete this goal to avoid being charged ${goal.pledgeAmount}
                </p>
              </div>
            )}

            {/* Success Message */}
            {goal.completed && (
              <div className="mt-4 pt-3 border-t border-border/40">
                <div className="flex items-center justify-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">
                    Goal completed! Saved ${goal.pledgeAmount} 🎉
                  </span>
                </div>
              </div>
            )}

            {/* Expired Message */}
            {!goal.completed && goal.deadline <= Date.now() && (
              <div className="mt-4 pt-3 border-t border-border/40">
                <div className="flex items-center justify-center text-red-600">
                  <XCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">
                    Goal expired. Payment may be processed.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ProfileContent({ goals }: { goals: any[] }) {
  const { user } = useUser()

  if (!user) return null

  const completedGoals = goals.filter(goal => goal.completed).length
  const totalGoals = goals.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.imageUrl} />
              <AvatarFallback className="text-lg">
                {user.firstName?.charAt(0)?.toUpperCase() || user.emailAddresses[0]?.emailAddress?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">
                {user.fullName || user.firstName || "User"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalGoals}</div>
              <div className="text-sm text-muted-foreground">Goals Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedGoals}</div>
              <div className="text-sm text-muted-foreground">Goals Completed</div>
            </div>
          </div>
          {totalGoals > 0 && (
            <div className="mt-4 text-center">
              <div className="text-sm text-muted-foreground">
                Success Rate: {Math.round((completedGoals / totalGoals) * 100)}%
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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