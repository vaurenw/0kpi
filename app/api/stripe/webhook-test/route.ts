import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  
  return NextResponse.json({
    message: 'Webhook test endpoint received POST',
    bodyLength: body.length,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
} 