import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId')
    if (!userIdParam) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }
    const userId = userIdParam as Id<'users'>
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
    const { userId: userIdRaw } = await request.json()
    if (!userIdRaw) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }
    const userId = userIdRaw as Id<'users'>
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