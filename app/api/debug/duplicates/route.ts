import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }

    const duplicates = await convex.query(api.goals.getDuplicateGoals, { userId })
    
    return NextResponse.json({
      success: true,
      duplicates,
      count: duplicates.length
    })
  } catch (error) {
    console.error('Error fetching duplicate goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch duplicate goals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const deletedCount = await convex.mutation(api.goals.cleanupDuplicateGoals, { userId })
    
    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} duplicate goals`
    })
  } catch (error) {
    console.error('Error cleaning up duplicate goals:', error)
    return NextResponse.json(
      { error: 'Failed to clean up duplicate goals' },
      { status: 500 }
    )
  }
} 