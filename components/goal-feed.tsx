"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { GoalCard } from "./goal-card"
import { Header } from "./header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { SignedIn, SignedOut } from "@clerk/nextjs"

export function GoalFeed() {
  const [limit] = useState(20)
  
  // Fetch public goals from Convex
  const publicGoals = useQuery(api.goals.getPublicGoals, { limit })

  const goals = publicGoals?.goals || []
  const isLoading = publicGoals === undefined

  // Remove the broken multi-query logic and fetch all upvote counts in one query
  const goalIds = goals.map((g) => g._id)
  const upvoteCounts = useQuery(
    api.goals.getGoalUpvoteCounts,
    goalIds.length > 0 ? { goalIds } : "skip"
  )

  // Sort goals by upvote count (descending)
  let sortedGoals = goals
  if (upvoteCounts && typeof upvoteCounts === 'object') {
    sortedGoals = [...goals].sort((a, b) => {
      const aCount = upvoteCounts[a._id] ?? 0
      const bCount = upvoteCounts[b._id] ?? 0
      return bCount - aCount
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Goal Feed</h1>
            <p className="text-sm text-muted-foreground">See what everyone is working on</p>
          </div>
          <SignedIn>
            <Link href="/create-goal">
              <Button size="sm" className="h-8">
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/sign-up">
              <Button size="sm" className="h-8">
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </Link>
          </SignedOut>
        </div>

        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                <div className="w-6 h-6 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                  <div className="h-2 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {sortedGoals.map((goal, idx) => (
              <div key={goal._id}>
                <GoalCard goal={{
                  id: goal._id,
                  title: goal.title,
                  description: goal.description,
                  deadline: goal.deadline,
                  pledgeAmount: goal.pledgeAmount,
                  completed: goal.completed,
                  paymentProcessed: goal.paymentProcessed,
                  userId: goal.userId,
                  userName: goal.user?.name || "Unknown User",
                  userImage: goal.user?.imageUrl,
                  creationTime: goal._creationTime,
                }} />
                {idx !== goals.length - 1 && <div className="h-px bg-muted/60 w-full my-0.5" />}
              </div>
            ))}

            {goals.length === 0 && (
              <div className="text-center py-12">
                <div className="mb-4">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">No goals yet</p>
                  <p className="text-xs text-muted-foreground">Be the first to create a goal!</p>
                </div>
                <SignedIn>
                  <Link href="/create-goal">
                    <Button size="sm">Create Your First Goal</Button>
                  </Link>
                </SignedIn>
                <SignedOut>
                  <Link href="/sign-up">
                    <Button size="sm">Create Your First Goal</Button>
                  </Link>
                </SignedOut>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
