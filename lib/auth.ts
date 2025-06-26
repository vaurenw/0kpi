// Future authentication service
export interface User {
  id: string
  name: string
  email: string
  image?: string
  createdAt: Date
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Mock auth functions - replace with actual auth service (Clerk, Auth0, etc.)
export const authService = {
  async signIn(email: string, password: string): Promise<User> {
    // Future: Replace with actual auth API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const user: User = {
          id: `user_${Date.now()}`,
          name: email.split("@")[0],
          email,
          image: `/placeholder.svg?height=40&width=40`,
          createdAt: new Date(),
        }
        localStorage.setItem("user", JSON.stringify(user))
        resolve(user)
      }, 1000)
    })
  },

  async signUp(name: string, email: string, password: string): Promise<User> {
    // Future: Replace with actual auth API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const user: User = {
          id: `user_${Date.now()}`,
          name,
          email,
          image: `/placeholder.svg?height=40&width=40`,
          createdAt: new Date(),
        }
        localStorage.setItem("user", JSON.stringify(user))
        resolve(user)
      }, 1000)
    })
  },

  async signOut(): Promise<void> {
    // Future: Replace with actual auth API call
    localStorage.removeItem("user")
    localStorage.removeItem("goals")
  },

  getCurrentUser(): User | null {
    // Future: Replace with actual auth state management
    const userData = localStorage.getItem("user")
    return userData ? JSON.parse(userData) : null
  },

  async refreshToken(): Promise<string | null> {
    // Future: Implement token refresh logic
    return null
  },
}
