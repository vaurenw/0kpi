import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Get all categories
export const getCategories = query({
  handler: async (ctx) => {
    try {
      return await ctx.db.query("categories").collect()
    } catch (error) {
      console.error("Error fetching categories:", error)
      throw new Error("Failed to fetch categories")
    }
  },
})

// Create category
export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate input
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Category name is required")
    }

    try {
      // Check if category already exists
      const existingCategory = await ctx.db
        .query("categories")
        .withIndex("by_name", (q) => q.eq("name", args.name.trim()))
        .unique()

      if (existingCategory) {
        throw new Error("Category with this name already exists")
      }

      const categoryId = await ctx.db.insert("categories", {
        name: args.name.trim(),
        description: args.description?.trim(),
        color: args.color?.trim(),
        icon: args.icon?.trim(),
        isDefault: args.isDefault ?? false,
      })

      console.log(`Category created: ${categoryId}`)
      return categoryId
    } catch (error) {
      console.error("Error creating category:", error)
      throw error
    }
  },
})

// Initialize default categories
export const initializeDefaultCategories = mutation({
  handler: async (ctx) => {
    try {
      const existingCategories = await ctx.db.query("categories").collect()
      if (existingCategories.length > 0) {
        console.log("Default categories already exist, skipping initialization")
        return { message: "Categories already initialized", count: existingCategories.length }
      }

      const defaultCategories = [
        {
          name: "Fitness & Health",
          description: "Exercise, diet, and wellness goals",
          color: "#10b981",
          icon: "💪",
          isDefault: true,
        },
        {
          name: "Learning & Education",
          description: "Study, courses, and skill development",
          color: "#3b82f6",
          icon: "📚",
          isDefault: true,
        },
        {
          name: "Career & Business",
          description: "Professional and entrepreneurial goals",
          color: "#8b5cf6",
          icon: "💼",
          isDefault: true,
        },
        {
          name: "Personal Development",
          description: "Self-improvement and habits",
          color: "#f59e0b",
          icon: "🌱",
          isDefault: true,
        },
        {
          name: "Creative Projects",
          description: "Art, writing, and creative endeavors",
          color: "#ef4444",
          icon: "🎨",
          isDefault: true,
        },
        {
          name: "Financial",
          description: "Saving, investing, and money goals",
          color: "#059669",
          icon: "💰",
          isDefault: true,
        },
      ]

      const categoryIds = await Promise.all(defaultCategories.map((category) => ctx.db.insert("categories", category)))

      console.log(`Initialized ${categoryIds.length} default categories`)
      return { message: "Default categories initialized", count: categoryIds.length, ids: categoryIds }
    } catch (error) {
      console.error("Error initializing default categories:", error)
      throw new Error("Failed to initialize default categories")
    }
  },
})

// Update category
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { categoryId, ...updates } = args

    if (!updates.name) throw new Error("Category name is required");

    try {
      const category = await ctx.db.get(categoryId)
      if (!category) {
        throw new Error("Category not found")
      }

      // If updating name, check for duplicates
      if (updates.name && updates.name.trim() !== category.name) {
        const existingCategory = await ctx.db
          .query("categories")
          .withIndex("by_name", (q) => q.eq("name", updates.name!.trim()))
          .unique()

        if (existingCategory) {
          throw new Error("Category with this name already exists")
        }
      }

      // Clean up string fields
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
      )

      await ctx.db.patch(categoryId, cleanUpdates)
      console.log(`Category updated: ${categoryId}`)
      return categoryId
    } catch (error) {
      console.error("Error updating category:", error)
      throw error
    }
  },
})

// Delete category (only if not default and no goals using it)
export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    try {
      const category = await ctx.db.get(args.categoryId)
      if (!category) {
        throw new Error("Category not found")
      }

      if (category.isDefault) {
        throw new Error("Cannot delete default categories")
      }

      // Check if any goals are using this category
      const goalsUsingCategory = await ctx.db
        .query("goals")
        .withIndex("by_category", (q) => q.eq("category", category.name))
        .collect()

      if (goalsUsingCategory.length > 0) {
        throw new Error(`Cannot delete category: ${goalsUsingCategory.length} goals are using this category`)
      }

      await ctx.db.delete(args.categoryId)
      console.log(`Category deleted: ${args.categoryId}`)
      return args.categoryId
    } catch (error) {
      console.error("Error deleting category:", error)
      throw error
    }
  },
})

// Get category statistics
export const getCategoryStatistics = query({
  handler: async (ctx) => {
    try {
      const categories = await ctx.db.query("categories").collect()
      const goals = await ctx.db.query("goals").collect()

      const categoryStats = await Promise.all(
        categories.map(async (category) => {
          const categoryGoals = goals.filter((goal) => goal.category === category.name)
          const activeGoals = categoryGoals.filter((goal) => goal.status === "active")
          const completedGoals = categoryGoals.filter((goal) => goal.completed)

          return {
            ...category,
            totalGoals: categoryGoals.length,
            activeGoals: activeGoals.length,
            completedGoals: completedGoals.length,
            totalPledged: categoryGoals.reduce((sum, goal) => sum + goal.pledgeAmount, 0),
          }
        }),
      )

      return categoryStats.sort((a, b) => b.totalGoals - a.totalGoals)
    } catch (error) {
      console.error("Error fetching category statistics:", error)
      throw new Error("Failed to fetch category statistics")
    }
  },
})
