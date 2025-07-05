"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { GoalCard } from "./goal-card"
import { Header } from "./header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { SignedIn, SignedOut } from "@clerk/nextjs"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatDistanceToNow, isToday, differenceInDays } from "date-fns"

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

  // Auth and upvote state
  const { convexUser } = useAuth()
  const upvoteGoal = useMutation(api.goals.upvoteGoal)
  const unupvoteGoal = useMutation(api.goals.unupvoteGoal)
  const userUpvotedGoals = useQuery(
    api.goals.getUserUpvotedGoalIds,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  )
  // Optimistic state for upvotes
  const [optimisticUpvoted, setOptimisticUpvoted] = useState<{ [goalId: string]: boolean }>({})

  useEffect(() => {
    if (userUpvotedGoals && convexUser?._id) {
      setOptimisticUpvoted(
        userUpvotedGoals.reduce((acc: any, id: string) => {
          acc[id] = true
          return acc
        }, {})
      )
    }
  }, [userUpvotedGoals, convexUser])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="w-full max-w-2xl mx-auto px-2 sm:px-4 lg:px-8 py-3 flex flex-col items-center">
        {/* No heading, compact feed style */}

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
          <ol className="bg-[#f6f6ef] w-full rounded p-0 m-0">
            {sortedGoals.map((goal, idx) => {
              const userUpvoted = !!optimisticUpvoted[goal._id]
              const upvoteDisabled = !convexUser?._id
              const handleUpvote = async () => {
                if (!convexUser?._id) return
                if (userUpvoted) {
                  setOptimisticUpvoted((prev) => ({ ...prev, [goal._id]: false }))
                  await unupvoteGoal({ goalId: goal._id, userId: convexUser._id })
                } else {
                  setOptimisticUpvoted((prev) => ({ ...prev, [goal._id]: true }))
                  await upvoteGoal({ goalId: goal._id, userId: convexUser._id })
                }
              }
              return (
                <li key={goal._id} className="px-1 py-1 text-[14px] sm:text-[15px] border-0 border-b border-[#e5e5e5] last:border-b-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-5 text-right mr-1 select-none">{idx + 1}.</span>
                    <span className="flex items-center">
                      <UpvoteButton goalId={goal._id} upvoted={userUpvoted} onClick={handleUpvote} disabled={upvoteDisabled} />
                    </span>
                    <span
                      className="font-medium truncate overflow-hidden whitespace-nowrap align-middle block flex-1 min-w-0 text-[14px] sm:text-[15px]"
                      title={goal.title}
                    >
                      {goal.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-1 gap-y-0.5 mt-0.5 text-xs text-muted-foreground pl-6">
                    <span className="font-semibold">
                      {goal.completed 
                        ? `$${goal.pledgeAmount} saved`
                        : goal.deadline > Date.now()
                        ? `expires in ${formatDistanceToNow(new Date(goal.deadline), { addSuffix: false })}`
                        : `$${goal.pledgeAmount} lost • expired ${formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })}`
                      }
                    </span>
                    <span>by {goal.user?.name || "Unknown"}</span>
                    <span>{upvoteCounts?.[goal._id] ?? 0} points</span>
                  </div>
                </li>
              )
            })}

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
          </ol>
        )}
      </main>
    </div>
  )
}

function UpvoteButton({ goalId, upvoted, onClick, disabled }: { goalId: string, upvoted: boolean, onClick: () => void, disabled: boolean }) {
  return (
    <button
      aria-label={upvoted ? 'Remove upvote' : 'Upvote'}
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-1 select-none focus:outline-none ${upvoted ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'} bg-transparent border-0`}
      style={{ lineHeight: 1, cursor: disabled ? 'not-allowed' : 'pointer', background: 'none' }}
    >
      ▲
    </button>
  )
}
