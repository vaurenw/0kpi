"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "./header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DollarSign, Target, TrendingUp, Clock } from "lucide-react"

interface Goal {
  id: string
  title: string
  description: string
  deadline: number
  pledgeAmount: number
  completed: boolean
  paymentProcessed: boolean
  userId: string
  displayName: string
  userImage?: string
  creationTime: number
}

export function UserProfile() {
  const [user, setUser] = useState<any>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/sign-in")
      return
    }

    const currentUser = JSON.parse(userData)
    setUser(currentUser)

    // Load user's goals
    const savedGoals = localStorage.getItem("goals")
    if (savedGoals) {
      const allGoals = JSON.parse(savedGoals)
      const userGoals = allGoals.filter((goal: Goal) => goal.userId === currentUser.id)
      setGoals(userGoals)
    }
  }, [router])

  if (!user) return null

  const completedGoals = goals.filter((goal) => goal.completed)
  const failedGoals = goals.filter((goal) => !goal.completed && Date.now() > goal.deadline)
  const activeGoals = goals.filter((goal) => !goal.completed && Date.now() <= goal.deadline)

  const totalSaved = completedGoals.reduce((sum, goal) => sum + goal.pledgeAmount, 0)
  const totalLost = failedGoals.reduce((sum, goal) => sum + (goal.paymentProcessed ? goal.pledgeAmount : 0), 0)
  const completionRate = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0

  const stats = [
    {
      label: "Total Goals",
      value: goals.length.toString(),
      icon: Target,
      color: "text-foreground",
    },
    {
      label: "Active Goals",
      value: activeGoals.length.toString(),
      icon: Clock,
      color: "text-blue-600",
    },
    {
      label: "Completed Goals",
      value: completedGoals.length.toString(),
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "Failed Goals",
      value: failedGoals.length.toString(),
      icon: Target,
      color: "text-red-600",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: completionRate >= 70 ? "text-green-600" : completionRate >= 40 ? "text-yellow-600" : "text-red-600",
    },
    {
      label: "Money Saved",
      value: `$${totalSaved.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "Money Lost",
      value: `$${totalLost.toFixed(2)}`,
      icon: DollarSign,
      color: "text-red-600",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.image || "/placeholder.svg?height=64&width=64"} />
              <AvatarFallback className="text-xl">{user.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{user.name || "User"}</h1>
              <p className="text-sm text-muted-foreground">Member since {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Statistics List */}
          <Card className="border border-border/40 mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {stats.map((stat, index) => {
                  const Icon = stat.icon
                  return (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                        <span className="text-sm font-medium text-foreground">{stat.label}</span>
                      </div>
                      <span className={`text-sm font-semibold ${stat.color}`}>{stat.value}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Goal Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Active Goals ({activeGoals.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {activeGoals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs h-5 px-2">
                      ${goal.pledgeAmount}
                    </Badge>
                  </div>
                ))}
                {activeGoals.length === 0 && <p className="text-xs text-muted-foreground">No active goals</p>}
                {activeGoals.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{activeGoals.length - 3} more</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Completed ({completedGoals.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {completedGoals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Completed: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-green-50 text-green-700 border-green-200 text-xs h-5 px-2">
                      ${goal.pledgeAmount}
                    </Badge>
                  </div>
                ))}
                {completedGoals.length === 0 && <p className="text-xs text-muted-foreground">No completed goals yet</p>}
                {completedGoals.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{completedGoals.length - 3} more</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Failed ({failedGoals.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {failedGoals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Expired: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs h-5 px-2">
                      ${goal.pledgeAmount}
                    </Badge>
                  </div>
                ))}
                {failedGoals.length === 0 && <p className="text-xs text-muted-foreground">No failed goals</p>}
                {failedGoals.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{failedGoals.length - 3} more</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
