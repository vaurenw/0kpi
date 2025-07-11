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
import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { api as convexApi } from "@/convex/_generated/api"
import { formatDistanceToNow, isToday, differenceInDays } from "date-fns"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { CalendarGraph } from "@/components/calendar-graph"
import { Footer } from "@/components/footer"
import { DeleteAccountModal } from "@/components/delete-account-modal"

export default function DashboardPage() {
  return (
    <SignedIn>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 lg:px-8 py-3 flex-1">
          <div className="mb-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage your goals and account</p>
          </div>
          <DashboardContent />
        </div>
        <Footer />
      </div>
    </SignedIn>
  )
}

function DashboardContent() {
  const { user } = useUser()
  const { convexUser } = useAuth()
  const searchParams = useSearchParams()
  const hasProcessedSuccess = useRef(false)
  const updateUsername = useMutation(convexApi.users.updateUsername)
  const [username, setUsername] = useState("")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localUsername, setLocalUsername] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Debounce username checking
  const debouncedUsername = useDebounce(localUsername, 500)

  // Handle success redirect from Stripe Checkout
  useEffect(() => {
    const success = searchParams.get('success')
    const sessionId = searchParams.get('session_id')
    
    if (success === 'true' && sessionId && !hasProcessedSuccess.current) {
      hasProcessedSuccess.current = true
      handlePaymentSuccess(sessionId)
    }
  }, [searchParams.get('success'), searchParams.get('session_id')])

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      // Get the pending goal data from sessionStorage
      const pendingGoalData = sessionStorage.getItem('pendingGoal')
      if (!pendingGoalData) {
        // This might happen if user refreshes the page or sessionStorage was cleared
        console.warn('No pending goal data found in sessionStorage')
        // Don't show an error toast as this is not necessarily an error condition
        // The goal might have already been processed or the user just landed on the dashboard
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

      toast.success('Goal created successfully! Your payment method has been set up and your goal is now live.')
      
      // Remove the success parameters from the URL
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
      
    } catch (error) {
      console.error('Error completing goal creation:', error)
      toast.error('Failed to complete goal creation. Please check your goals list or try creating a new goal.')
    }
  }

  // Debug function to clean up duplicate goals (only in development)
  const cleanupDuplicates = async () => {
    if (!convexUser?._id) return
    
    try {
      const response = await fetch('/api/debug/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: convexUser._id }),
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success(`Cleaned up ${result.deletedCount} duplicate goals`)
        // Refresh the page to show updated goals
        window.location.reload()
      } else {
        toast.error('Failed to clean up duplicates')
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error)
      toast.error('Failed to clean up duplicates')
    }
  }
  
  // Fetch user's goals from Convex
  const userGoals = useQuery(
    api.goals.getUserGoals,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  )

  // Fetch goal completion data for calendar graph
  const completionData = useQuery(
    api.goals.getGoalCompletionData,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  )

  useEffect(() => {
    if (convexUser?.username) {
      setUsername(convexUser.username)
      if (!editing) {
        setLocalUsername(convexUser.username)
      }
    }
  }, [convexUser?.username, editing])

  // Check username availability when debounced value changes
  useEffect(() => {
    if (debouncedUsername && 
        debouncedUsername.trim().length > 0 && 
        debouncedUsername !== convexUser?.username) {
      setIsCheckingUsername(true)
      setUsernameError("")
    } else {
      setIsCheckingUsername(false)
      setUsernameError("")
    }
  }, [debouncedUsername, convexUser?.username])

  // Get username availability result
  const usernameAvailability = useQuery(
    convexApi.users.checkUsernameAvailability,
    debouncedUsername && 
    debouncedUsername !== convexUser?.username && 
    debouncedUsername.trim().length > 0 &&
    debouncedUsername.trim().length >= 3
      ? { 
          username: debouncedUsername.trim(), 
          currentUserId: convexUser?._id 
        }
      : "skip"
  )

  // Update error state based on availability check
  useEffect(() => {
    if (usernameAvailability && debouncedUsername) {
      setIsCheckingUsername(false)
      if (!usernameAvailability.available) {
        setUsernameError(usernameAvailability.error || "Username is not available")
      } else {
        setUsernameError("")
      }
    }
  }, [usernameAvailability, debouncedUsername])

  const handleUsernameSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!convexUser?._id || !localUsername.trim() || usernameError) return
    
    setSaving(true)
    try {
      await updateUsername({ userId: convexUser._id, username: localUsername.trim() })
      setEditing(false)
      setUsername(localUsername.trim())
      setUsernameError("")
      toast.success("Username updated!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update username"
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const goals = userGoals || []
  const isLoading = userGoals === undefined
  const completeGoal = useMutation(api.goals.completeGoal)
  const [completingGoalId, setCompletingGoalId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Profile section at the top */}
      <div className="mb-3">
        <div className="flex flex-col gap-1 w-full max-w-xs">
          <label htmlFor="username" className="text-sm font-medium">Username</label>
          {editing ? (
            <form onSubmit={handleUsernameSave} className="flex gap-1">
              <input
                id="username"
                className={`bg-[#f3f5f7] border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 transition flex-1 ${
                  usernameError 
                    ? "border-red-300 focus:ring-red-200" 
                    : debouncedUsername && !usernameError && debouncedUsername !== convexUser?.username
                    ? "border-green-300 focus:ring-green-200"
                    : "border-[#bfc3c7] focus:ring-blue-200"
                }`}
                value={localUsername}
                onChange={e => setLocalUsername(e.target.value)}
                disabled={saving}
                maxLength={20}
                required
                placeholder="username..."
                style={{ boxShadow: '0 1px 2px 0 #bfc3c7' }}
                autoFocus
              />
              {isCheckingUsername && (
                <div className="flex items-center text-xs text-muted-foreground ml-2">
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                  Checking...
                </div>
              )}
              {debouncedUsername && debouncedUsername.trim().length < 3 && (
                <div className="text-xs text-muted-foreground mt-1">Username must be at least 3 characters</div>
              )}
              {usernameError && (
                <div className="text-xs text-red-600 mt-1">{usernameError}</div>
              )}
              {debouncedUsername && !usernameError && debouncedUsername !== convexUser?.username && (
                <div className="text-xs text-green-600 mt-1">Username available!</div>
              )}
              <Button
                type="submit"
                size="sm"
                className="bg-white border border-gray-300 text-black rounded px-3 py-1 shadow-none font-normal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                disabled={saving || !!usernameError || isCheckingUsername}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-white border border-gray-300 text-black rounded px-3 py-1 shadow-none font-normal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                onClick={() => {
                  setEditing(false)
                  setLocalUsername("")
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <span className="bg-[#f3f5f7] border border-[#bfc3c7] rounded px-2 py-1 text-sm flex-1">
                {convexUser?.username || "Generating username..."}
              </span>
              <Button
                size="sm"
                className="bg-white border border-gray-300 text-black rounded px-3 py-1 shadow-none font-normal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                onClick={() => {
                  setEditing(true)
                  setLocalUsername(convexUser?.username || "")
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Debug section - only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-3">
          <Button
            size="sm"
            variant="outline"
            onClick={cleanupDuplicates}
            className="text-xs"
          >
            Clean Up Duplicates
          </Button>
        </div>
      )}

      {/* Calendar Graph */}
      {/* CalendarGraph component removed as requested */}

      {/* Goals section */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">My Goals</h2>
          <Link href="/create-goal">
            <Button size="sm" className="bg-white border border-gray-300 text-black rounded px-3 py-1 shadow-none font-normal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 h-7 sm:h-8 px-3 text-sm">
              Create Goal
            </Button>
          </Link>
        </div>
        <GoalsContent goals={goals} isLoading={isLoading} />
      </div>

      {/* Account Settings section */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Account Settings</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-destructive mb-2">Delete Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal 
        open={showDeleteModal} 
        onOpenChange={setShowDeleteModal} 
      />
    </div>
  )
}

function GoalsContent({ goals, isLoading }: { goals: any[], isLoading: boolean }) {
  const { convexUser } = useAuth()
  const completeGoal = useMutation(api.goals.completeGoal)
  const [completingGoalId, setCompletingGoalId] = useState<string | null>(null)

  // Deduplicate goals by _id
  const uniqueGoals = Array.from(new Map(goals.map(g => [g._id, g])).values())

  if (isLoading) {
    return (
      <ol className="bg-[#f6f6ef] w-full rounded p-0 m-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="flex items-baseline px-2 py-1 text-[15px] border-0 border-b border-[#e5e5e5] last:border-b-0 animate-pulse">
            <span className="text-xs text-muted-foreground w-6 text-right mr-2 select-none">{i + 1}.</span>
            <span className="h-3 w-32 bg-muted rounded mr-2 inline-block" />
            <span className="h-3 w-16 bg-muted rounded mr-2 inline-block" />
            <span className="h-3 w-20 bg-muted rounded mr-2 inline-block" />
            <span className="h-3 w-20 bg-muted rounded inline-block" />
          </li>
        ))}
      </ol>
    )
  }

  if (uniqueGoals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">No goals yet</p>
          <p className="text-xs text-muted-foreground">Create your first goal to start your accountability journey</p>
        </div>
        <Link href="/create-goal">
          <Button size="sm" className="bg-white border border-gray-300 text-black rounded px-3 py-1 shadow-none font-normal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200">Create Your First Goal</Button>
        </Link>
      </div>
    )
  }

  return (
    <ol className="bg-[#f6f6ef] w-full rounded p-0 m-0">
      {uniqueGoals.map((goal, idx) => {
        const now = Date.now()
        const isExpired = goal.deadline <= now
        const isCompleted = goal.completed
        return (
          <li key={goal._id} className="flex items-baseline px-2 py-1 text-[15px] border-0 border-b border-[#e5e5e5] last:border-b-0">
            <span className="text-xs text-muted-foreground w-6 text-right mr-2 select-none">{idx + 1}.</span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-[15px] truncate overflow-hidden whitespace-nowrap align-middle block">{goal.title}</span>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-muted-foreground items-center">
                <span className="font-semibold">
                  {goal.completed 
                    ? `$${goal.pledgeAmount} saved`
                    : goal.deadline > Date.now()
                    ? `expires in ${formatDistanceToNow(new Date(goal.deadline), { addSuffix: false })}`
                    : `$${goal.pledgeAmount} lost • expired ${formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })}`
                  }
                </span>
                <span>by {goal.user?.username || goal.user?.name || "Unknown"}</span>
                <span>{isCompleted ? "Completed" : isExpired ? "Expired" : "Active"}</span>
                {!goal.completed && goal.deadline > Date.now() && (
                  <Button
                    size="sm"
                    className="bg-white border border-gray-300 text-black rounded px-3 py-1 shadow-none font-normal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 ml-2 h-6 text-xs"
                    disabled={completingGoalId === goal._id}
                    onClick={async () => {
                      if (!convexUser?._id) return
                      setCompletingGoalId(goal._id)
                      try {
                        await completeGoal({ goalId: goal._id, userId: convexUser._id })
                        toast.success("Goal marked as complete!")
                      } catch (err) {
                        toast.error("Failed to mark as complete")
                      } finally {
                        setCompletingGoalId(null)
                      }
                    }}
                  >
                    {completingGoalId === goal._id ? (
                      <span className="flex items-center"><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />Saving...</span>
                    ) : (
                      <span className="flex items-center">Mark as Complete</span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
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