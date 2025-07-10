import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
  const goalData = await request.json()
    
    console.log('Creating pending goal:', { 
      title: goalData.title, 
      userId: goalData.userId, 
      deadline: new Date(goalData.deadline).toISOString() 
    })
    
    // Ensure we only pass the expected fields to createGoal
    const { goalId: _, ...cleanGoalData } = goalData
    
  const goalId = await convex.mutation(api.goals.createGoal, {
      ...cleanGoalData,
    status: 'pending',
  })
    
    console.log('Pending goal created:', goalId)
    
  return NextResponse.json({ goalId })
  } catch (error) {
    console.error('Error creating pending goal:', error)
    return NextResponse.json(
      { error: 'Failed to create pending goal' },
      { status: 500 }
    )
  }
} 