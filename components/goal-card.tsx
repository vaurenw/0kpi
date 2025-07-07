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
      <div className="flex items-center gap-x-2">
        {typeof index === 'number' && (
          <span className="text-xs text-muted-foreground">{index + 1}.</span>
        )}
        <button
          className={`text-base leading-none font-bold select-none focus:outline-none ${optimisticUpvoted ? 'text-blue-600' : 'text-muted-foreground'} hover:text-blue-500 transition`}
          aria-label={optimisticUpvoted ? 'Remove upvote' : 'Upvote'}
          onClick={handleUpvote}
          disabled={!convexUser?._id}
          style={{ background: 'none', border: 'none', cursor: convexUser?._id ? 'pointer' : 'not-allowed', padding: 0 }}
        >
          ▲
        </button>
        <div
          className="font-medium text-foreground text-base w-full whitespace-normal break-all"
          style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
        >
          {goal.title}
        </div>
      </div>
      {/* Bottom row: stats */}
      <div className="text-xs text-muted-foreground mb-0.5 ml-[32px]">
        [
        {goal.completed ? (
          <span>Saved ${goal.pledgeAmount}</span>
        ) : goal.paymentProcessed ? (
          <span>Lost ${goal.pledgeAmount}</span>
        ) : !isExpired ? (
          <span>Pledged ${goal.pledgeAmount} · Expires {new Date(goal.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        ) : (
          <span>Expires {new Date(goal.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        )}
        ]
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground ml-[32px]">
        <span className="font-semibold">{optimisticCount ?? 0} point{(optimisticCount ?? 0) === 1 ? '' : 's'}</span>
        <span>·</span>
        <span>{goal.displayName}</span>
        <span>·</span>
        <span>{formatDistanceToNow(new Date(goal.creationTime), { addSuffix: true })}</span>
      </div>
    </div>
  )
}
