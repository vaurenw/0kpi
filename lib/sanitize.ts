import DOMPurify from 'isomorphic-dompurify'

// Sanitize HTML content
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  })
}

// Sanitize text content (remove HTML tags)
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}

// Validate and sanitize goal title
export function sanitizeGoalTitle(title: string): string {
  const sanitized = sanitizeText(title.trim())
  if (sanitized.length === 0) {
    throw new Error('Goal title cannot be empty')
  }
  if (sanitized.length > 200) {
    throw new Error('Goal title must be 200 characters or less')
  }
  return sanitized
}

// Validate and sanitize goal description
export function sanitizeGoalDescription(description: string): string {
  const sanitized = sanitizeHtml(description.trim())
  if (sanitized.length > 2000) {
    throw new Error('Goal description must be 2000 characters or less')
  }
  return sanitized
}

// Validate amount
export function validateAmount(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Amount must be a valid number')
  }
  if (amount < 0.01) {
    throw new Error('Amount must be at least $0.01')
  }
  if (amount > 10000) {
    throw new Error('Amount cannot exceed $10,000')
  }
  return Math.round(amount * 100) / 100 // Round to 2 decimal places
}

// Validate user ID
export function validateUserId(userId: string): string {
  const sanitized = userId.trim()
  if (sanitized.length === 0) {
    throw new Error('User ID is required')
  }
  if (sanitized.length > 100) {
    throw new Error('User ID is too long')
  }
  return sanitized
}

// Validate goal ID
export function validateGoalId(goalId: string): string {
  const sanitized = goalId.trim()
  if (sanitized.length === 0) {
    throw new Error('Goal ID is required')
  }
  if (sanitized.length > 100) {
    throw new Error('Goal ID is too long')
  }
  return sanitized
} 