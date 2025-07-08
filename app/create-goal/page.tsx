"use client"

import { SignedIn } from "@clerk/nextjs"
import { CreateGoalForm } from "@/components/create-goal-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function CreateGoalPage() {
  return (
    <SignedIn>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 lg:px-8 py-3 flex-1">
          <div className="border border-border/40 rounded-lg p-3 sm:p-5">
            <CreateGoalForm />
          </div>
        </div>
        <Footer />
      </div>
    </SignedIn>
  )
}
