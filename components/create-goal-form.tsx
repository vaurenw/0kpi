"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, DollarSign, CreditCard } from "lucide-react"
import { toast } from "sonner"

// Future: This will be replaced with actual API calls
interface CreateGoalRequest {
  title: string
  description: string
  deadline: string // ISO string
  pledgeAmount: number
}

interface PaymentSetupRequest {
  amount: number
  goalId?: string
  userId: string
}

// Use the actual payment service
const setupPaymentIntent = async (data: PaymentSetupRequest) => {
  const response = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: data.amount,
      goalId: data.goalId,
      userId: data.userId,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to create checkout session')
  }

  return response.json()
}

export function CreateGoalForm() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadlineDate, setDeadlineDate] = useState("")
  const [deadlineTime, setDeadlineTime] = useState("")
  const [pledgeAmount, setPledgeAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentSetup, setPaymentSetup] = useState(false)
  const [savedCards, setSavedCards] = useState([])
  const [showSavedCardsModal, setShowSavedCardsModal] = useState(false)
  const router = useRouter()
  const { user } = useUser()
  const { convexUser } = useAuth()

  // Set default date and time on component mount
  useEffect(() => {
    const now = new Date()
    const today = new Date()
    today.setHours(12, 0, 0, 0) // Set to noon today

    const dateStr = today.toISOString().split("T")[0] // YYYY-MM-DD
    const timeStr = "12:00" // Default to noon

    setDeadlineDate(dateStr)
    setDeadlineTime(timeStr)
  }, [])

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  }

  // Check if form is valid
  const isFormValid = () => {
    return (
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      deadlineDate.length > 0 &&
      deadlineTime.length > 0 &&
      pledgeAmount.length > 0 &&
      !isNaN(Number.parseFloat(pledgeAmount)) &&
      Number.parseFloat(pledgeAmount) > 0
    )
  }

  // Update the form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid()) {
      toast.error("Please fill in all fields correctly")
      return
    }

    if (!user) {
      toast.error("You must be logged in to create a goal")
      return
    }

    if (!convexUser) {
      toast.error("Please wait while we set up your account")
      return
    }

    setIsSubmitting(true)

    try {
      // Combine date and time
      const deadlineDateTime = new Date(`${deadlineDate}T${deadlineTime}`)
      const now = new Date()
      // Validate deadline is not in the past (allow same day)
      if (deadlineDateTime < new Date(now.setHours(0, 0, 0, 0))) {
        toast.error("Deadline cannot be in the past")
        setIsSubmitting(false)
        return
      }

      // Validate pledge amount
      const amount = Number.parseFloat(pledgeAmount)
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid pledge amount")
        setIsSubmitting(false)
        return
      }

      // Step 1: Create the pending goal in the backend
      const pendingGoalRes = await fetch('/api/goals/create-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          deadline: deadlineDateTime.getTime(),
          pledgeAmount: amount,
          userId: convexUser._id,
          isPublic: true,
        }),
      })
      if (!pendingGoalRes.ok) {
        throw new Error('Failed to create pending goal')
      }
      const { goalId } = await pendingGoalRes.json()

      // Step 2: Setup payment intent with Stripe and redirect to checkout
      setPaymentSetup(true)
      const paymentResult = await setupPaymentIntent({
        amount: amount,
        userId: convexUser._id,
        goalId,
      })

      // Always redirect to Stripe Checkout if a URL is present
      if (paymentResult.url) {
        window.location.href = paymentResult.url
      } else {
        throw new Error('No checkout URL received')
      }

    } catch (error) {
      console.error("Error creating goal:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create goal. Please try again.")
      setIsSubmitting(false)
      setPaymentSetup(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title" className="text-sm font-medium">
            Goal Title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Complete my morning workout routine"
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your goal in detail..."
            rows={4}
            className="mt-1 resize-none"
            required
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Deadline</Label>
          <div className="mt-1 space-y-2">
            <div className="relative">
              <Input
                id="deadlineDate"
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                min={getMinDate()}
                className="pl-10"
                required
              />
              <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <Input
              id="deadlineTime"
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Choose the date and time when you want to complete this goal. You can set it for today!
          </p>
        </div>

        <div>
          <Label htmlFor="pledgeAmount" className="text-sm font-medium">
            Pledge Amount
          </Label>
          <div className="relative mt-1">
            <Input
              id="pledgeAmount"
              type="number"
              step="0.01"
              min="1"
              max="10000"
              value={pledgeAmount}
              onChange={(e) => setPledgeAmount(e.target.value)}
              placeholder="25.00"
              className="pl-10"
              required
            />
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This amount will be charged if you don't complete your goal by the deadline
          </p>
        </div>
      </div>

      {/* Payment Setup Section */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Payment Setup</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {paymentSetup
              ? "Setting up payment method..."
              : "Your payment method will be set up when you create the goal. You'll only be charged if you don't complete your goal."}
          </p>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={!isFormValid() || isSubmitting}>
        {isSubmitting ? (paymentSetup ? "Setting up payment..." : "Creating goal...") : "Create Goal"}
      </Button>
    </form>
  )
}
