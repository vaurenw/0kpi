import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the user from Convex
    const user = await convex.query(api.users.getUserByClerkId, { clerkId: userId })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete the user account and all associated data
    await convex.mutation(api.users.deleteUserAccount, {
      userId: user._id,
      clerkId: userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting account:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete account'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 