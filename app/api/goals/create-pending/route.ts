import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  const goalData = await request.json()
  const goalId = await convex.mutation(api.goals.createGoal, {
    ...goalData,
    status: 'pending',
  })
  return NextResponse.json({ goalId })
} 