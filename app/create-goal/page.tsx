"use client"

import { SignedIn } from "@clerk/nextjs"
import { CreateGoalForm } from "@/components/create-goal-form"
import { Header } from "@/components/header"

export default function CreateGoalPage() {
  return (
    <SignedIn>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 lg:px-8 py-3">
          <div className="mb-4">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Create New Goal</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Set up a goal with financial accountability</p>
          </div>
          <div className="border border-border/40 rounded-lg p-3 sm:p-5">
            <CreateGoalForm />
          </div>
        </div>
      </div>
    </SignedIn>
  )
}
