"use client"

import { useState, useEffect } from "react"
import { databaseService, type Goal } from "../database"

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadGoals = async () => {
    setIsLoading(true)
    try {
      const allGoals = await databaseService.getAllGoals()
      setGoals(allGoals)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadGoals()
  }, [])

  const createGoal = async (goalData: any) => {
    const newGoal = await databaseService.createGoal(goalData)
    setGoals((prev) => [newGoal, ...prev])
    return newGoal
  }

  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    const updatedGoal = await databaseService.updateGoal(goalId, updates)
    if (updatedGoal) {
      setGoals((prev) => prev.map((goal) => (goal.id === goalId ? updatedGoal : goal)))
    }
    return updatedGoal
  }

  const deleteGoal = async (goalId: string) => {
    const success = await databaseService.deleteGoal(goalId)
    if (success) {
      setGoals((prev) => prev.filter((goal) => goal.id !== goalId))
    }
    return success
  }

  return {
    goals,
    isLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    refreshGoals: loadGoals,
  }
}

export function useUserGoals(userId: string) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUserGoals = async () => {
      setIsLoading(true)
      try {
        const userGoals = await databaseService.getUserGoals(userId)
        setGoals(userGoals)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadUserGoals()
    }
  }, [userId])

  return { goals, isLoading }
}

export function useGoal(goalId: string) {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadGoal = async () => {
      setIsLoading(true)
      try {
        const foundGoal = await databaseService.getGoalById(goalId)
        setGoal(foundGoal)
      } finally {
        setIsLoading(false)
      }
    }

    if (goalId) {
      loadGoal()
    }
  }, [goalId])

  return { goal, isLoading }
}
