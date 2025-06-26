"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "./header"
import { GoalCard } from "./goal-card"
import { Button } from "@/components/ui/button"
import { Plus, Filter } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type FilterType = "all" | "active" | "completed" | "failed"

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

export function MyGoals() {
  const [user, setUser] = useState<any>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [filter, setFilter] = useState<FilterType>("all")
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

  const filteredGoals = goals.filter((goal) => {
    const now = Date.now()
    switch (filter) {
      case "active":
        return !goal.completed && now <= goal.deadline
      case "completed":
        return goal.completed
      case "failed":
        return !goal.completed && now > goal.deadline
      default:
        return true
    }
  })

  const getFilterCount = (type: FilterType) => {
    const now = Date.now()
    switch (type) {
      case "active":
        return goals.filter((goal) => !goal.completed && now <= goal.deadline).length
      case "completed":
        return goals.filter((goal) => goal.completed).length
      case "failed":
        return goals.filter((goal) => !goal.completed && now > goal.deadline).length
      default:
        return goals.length
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">My Goals</h1>
            <p className="text-sm text-muted-foreground">Track your personal goals and progress</p>
          </div>
          <Link href="/create-goal">
            <Button size="sm" className="h-8">
              <Plus className="w-4 h-4 mr-1" />
              Create
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 mb-6">
          {[
            { key: "all" as FilterType, label: "All" },
            { key: "active" as FilterType, label: "Active" },
            { key: "completed" as FilterType, label: "Completed" },
            { key: "failed" as FilterType, label: "Failed" },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(key)}
              className={cn("h-8 text-xs", filter === key && "bg-muted")}
            >
              {label}
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                {getFilterCount(key)}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Goals List */}
        <div className="space-y-3">
          {filteredGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}

          {filteredGoals.length === 0 && (
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Filter className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {filter === "all" ? "No goals created yet" : `No ${filter} goals found`}
                </p>
                {filter === "all" && (
                  <p className="text-xs text-muted-foreground">Create your first goal to start your journey!</p>
                )}
              </div>
              {filter === "all" && (
                <Link href="/create-goal">
                  <Button size="sm">Create Your First Goal</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
