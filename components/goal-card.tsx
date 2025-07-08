"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, DollarSign, CheckCircle, Clock, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Id } from "@/convex/_generated/dataModel"

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

interface GoalCardProps {
  goal: Goal
  index?: number
}

export function GoalCard({ goal, index }: GoalCardProps) {
  const { user, convexUser } = useAuth()

  // Upvote logic
  const upvoteGoal = useMutation(api.goals.upvoteGoal)
  const unupvoteGoal = useMutation(api.goals.unupvoteGoal)
  const upvoteCount = useQuery(api.goals.getGoalUpvoteCount, { goalId: goal.id as Id<"goals"> })
  const userUpvotedGoals = useQuery(api.goals.getUserUpvotedGoalIds, convexUser?._id ? { userId: convexUser._id } : "skip")
  const [optimisticUpvoted, setOptimisticUpvoted] = useState<boolean>(false)
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null)

  useEffect(() => {
    if (userUpvotedGoals && convexUser?._id) {
      setOptimisticUpvoted(userUpvotedGoals.includes(goal.id as Id<"goals">))
    }
  }, [userUpvotedGoals, convexUser, goal.id])

  useEffect(() => {
    if (typeof upvoteCount === "number") setOptimisticCount(upvoteCount)
  }, [upvoteCount])

  const handleUpvote = async () => {
    if (!convexUser?._id) return
    if (optimisticUpvoted) {
      setOptimisticUpvoted(false)
      setOptimisticCount((c) => (c !== null ? c - 1 : null))
      await unupvoteGoal({ goalId: goal.id as Id<"goals">, userId: convexUser._id })
    } else {
      setOptimisticUpvoted(true)
      setOptimisticCount((c) => (c !== null ? c + 1 : null))
      await upvoteGoal({ goalId: goal.id as Id<"goals">, userId: convexUser._id })
    }
  }

  const isOwner = user?.id === goal.userId
  const isExpired = Date.now() > goal.deadline
  const timeLeft = formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })

  const handleCompleteGoal = () => {
    if (isOwner && !goal.completed && !isExpired) {
      const savedGoals = localStorage.getItem("goals")
      if (savedGoals) {
        const goals = JSON.parse(savedGoals)
        const updatedGoals = goals.map((g: Goal) => (g.id === goal.id ? { ...g, completed: true } : g))
        localStorage.setItem("goals", JSON.stringify(updatedGoals))
        window.location.reload()
      }
    }
  }

  const getStatusBadge = () => {
    if (goal.completed) return <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs">Completed</Badge>
    if (isExpired && goal.paymentProcessed) return <Badge variant="destructive" className="text-xs">Failed</Badge>
    if (isExpired) return <Badge variant="outline" className="text-red-600 border-red-200 text-xs">Expired</Badge>
    return <Badge variant="outline" className="text-xs">Active</Badge>
  }

  return (
    <div className="py-2 px-0 text-[15px]">
      {/* Top row: number, triangle, headline */}
      <div className="flex items-center gap-x-1.5">
        {typeof index === 'number' && (
          <span className="text-[11px] text-muted-foreground w-5 text-right flex-shrink-0">{index + 1}.</span>
        )}
        <button
          className="flex-shrink-0 w-5 text-[13px] leading-none select-none focus:outline-none"
          aria-label={optimisticUpvoted ? 'Remove upvote' : 'Upvote'}
          onClick={handleUpvote}
          disabled={!convexUser?._id}
          style={{
            color: optimisticUpvoted ? '#ff6600' : '#b0b0b0',
            background: 'none',
            border: 'none',
            cursor: convexUser?._id ? 'pointer' : 'not-allowed',
            padding: 0,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          ▲
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm break-words whitespace-normal">
            {goal.title}
          </div>
        </div>
      </div>
      {/* Bottom row: stats */}
      <div className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground mt-0.5" style={{ paddingLeft: '2.5em' }}>
        {/* Main stat */}
        {goal.completed && !isExpired ? (
          <span>Saved ${goal.pledgeAmount}</span>
        ) : !goal.completed && !isExpired ? (
          <span>Pledged ${goal.pledgeAmount} · due on {new Date(goal.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        ) : !goal.completed && isExpired ? (
          <span>Lost ${goal.pledgeAmount} on {new Date(goal.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        ) : null}
        <span>·</span>
        <span>{goal.displayName}</span>
        <span>·</span>
        <span>{optimisticCount ?? 0} upvote{(optimisticCount ?? 0) === 1 ? '' : 's'}</span>
      </div>
    </div>
  )
}
