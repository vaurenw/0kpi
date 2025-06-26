import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { sessionId, goalData } = await request.json()

    if (!sessionId || !goalData) {
      return NextResponse.json(
        { error: 'Missing sessionId or goalData' },
        { status: 400 }
      )
    }

    // Check if a goal with this sessionId already exists to prevent duplicates
    const existingGoal = await convex.query(api.goals.getGoalBySessionId, { sessionId })
    
    if (existingGoal) {
      console.log(`Goal already exists for session ${sessionId}, returning existing goal`)
      return NextResponse.json({
        success: true,
        goalId: existingGoal._id,
        alreadyExists: true,
      })
    }

    // Create the goal in Convex
    const goalId = await convex.mutation(api.goals.createGoal, {
      ...goalData,
      stripeSessionId: sessionId,
    })

    return NextResponse.json({
      success: true,
      goalId,
      alreadyExists: false,
    })
  } catch (error) {
    console.error('Error completing goal creation:', error)
    return NextResponse.json(
      { error: 'Failed to complete goal creation' },
      { status: 500 }
    )
  }
} 