// Environment variable validation
export function validateEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_CONVEX_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'INTERNAL_API_KEY',
    'NEXT_PUBLIC_APP_URL',
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  // Validate URL formats
  try {
    new URL(process.env.NEXT_PUBLIC_APP_URL!)
  } catch {
    throw new Error('NEXT_PUBLIC_APP_URL must be a valid URL')
  }

  try {
    new URL(process.env.NEXT_PUBLIC_CONVEX_URL!)
  } catch {
    throw new Error('NEXT_PUBLIC_CONVEX_URL must be a valid URL')
  }

  // Validate Stripe keys format
  if (!process.env.STRIPE_SECRET_KEY!.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY must start with sk_')
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!.startsWith('pk_')) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_')
  }

  return true
}

// Call validation on module load
if (typeof window === 'undefined') {
  validateEnvironment()
} 