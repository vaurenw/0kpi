// Future database service
export interface Goal {
  id: string
  title: string
  description: string
  deadline: number
  pledgeAmount: number
  completed: boolean
  paymentProcessed: boolean
  paymentIntentId?: string
  userId: string
  displayName: string
  userImage?: string
  creationTime: number
}

export interface CreateGoalData {
  title: string
  description: string
  deadline: number
  pledgeAmount: number
  paymentIntentId?: string
  userId: string
  displayName: string
  userImage?: string
}

// Mock database functions - replace with actual database calls (Convex, Supabase, etc.)
export const databaseService = {
  async createGoal(data: CreateGoalData): Promise<Goal> {
    // Future: Replace with actual database API call
    const goal: Goal = {
      id: `goal_${Date.now()}`,
      ...data,
      completed: false,
      paymentProcessed: false,
      creationTime: Date.now(),
    }

    // Temporary localStorage implementation
    const savedGoals = localStorage.getItem("goals")
    const goals = savedGoals ? JSON.parse(savedGoals) : []
    goals.unshift(goal)
    localStorage.setItem("goals", JSON.stringify(goals))

    return goal
  },

  async getAllGoals(): Promise<Goal[]> {
    // Future: Replace with actual database API call
    const savedGoals = localStorage.getItem("goals")
    return savedGoals ? JSON.parse(savedGoals) : []
  },

  async getUserGoals(userId: string): Promise<Goal[]> {
    // Future: Replace with actual database API call
    const allGoals = await this.getAllGoals()
    return allGoals.filter((goal) => goal.userId === userId)
  },

  async getGoalById(goalId: string): Promise<Goal | null> {
    // Future: Replace with actual database API call
    const allGoals = await this.getAllGoals()
    return allGoals.find((goal) => goal.id === goalId) || null
  },

  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal | null> {
    // Future: Replace with actual database API call
    const savedGoals = localStorage.getItem("goals")
    if (!savedGoals) return null

    const goals = JSON.parse(savedGoals)
    const goalIndex = goals.findIndex((g: Goal) => g.id === goalId)

    if (goalIndex === -1) return null

    goals[goalIndex] = { ...goals[goalIndex], ...updates }
    localStorage.setItem("goals", JSON.stringify(goals))

    return goals[goalIndex]
  },

  async deleteGoal(goalId: string): Promise<boolean> {
    // Future: Replace with actual database API call
    const savedGoals = localStorage.getItem("goals")
    if (!savedGoals) return false

    const goals = JSON.parse(savedGoals)
    const filteredGoals = goals.filter((g: Goal) => g.id !== goalId)
    localStorage.setItem("goals", JSON.stringify(filteredGoals))

    return true
  },

  async getExpiredGoals(): Promise<Goal[]> {
    // Future: Replace with actual database API call
    const allGoals = await this.getAllGoals()
    const now = Date.now()
    return allGoals.filter((goal) => !goal.completed && goal.deadline < now && !goal.paymentProcessed)
  },
}
