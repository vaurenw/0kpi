"use client"

import { SignedIn } from "@clerk/nextjs"
import { CreateGoalForm } from "@/components/create-goal-form"
import { Header } from "@/components/header"

export default function CreateGoalPage() {
  return (
    <SignedIn>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Create New Goal</h1>
            <p className="text-sm text-muted-foreground">Set up a goal with financial accountability</p>
          </div>
          <div className="border border-border/40 rounded-lg p-6">
            <CreateGoalForm />
          </div>
        </div>
      </div>
    </SignedIn>
  )
}
