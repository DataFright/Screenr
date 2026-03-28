/**
 * @fileoverview Toast Notification Hook
 * 
 * React hook and utilities for managing toast notifications.
 * Inspired by react-hot-toast library, customized for use with shadcn/ui.
 * 
 * Features:
 * - Queue-based toast management with limit
 * - Programmatic toast control (add, update, dismiss)
 * - Action button support
 * 
 * Note: The main application uses Sonner for toast notifications.
 * This hook is kept for shadcn/ui component compatibility.
 * 
 * @module hooks/use-toast
 * @requires react - useState, useEffect, useCallback hooks
 */

"use client"

import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of toasts displayed at once */
const TOAST_LIMIT = 1

/** Delay before removing dismissed toasts from state (in ms) */
const TOAST_REMOVE_DELAY = 1000000

// ============================================================================
// TYPES
// ============================================================================

/** Toast item with all properties */
type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

/** Action types for toast reducer */
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

/** Counter for generating unique toast IDs */
let count = 0

/**
 * Generates a unique ID for each toast
 * @returns string - unique toast ID
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

/** Discriminated union of all possible actions */
type Action =
  | {
    type: ActionType["ADD_TOAST"]
    toast: ToasterToast
  }
  | {
    type: ActionType["UPDATE_TOAST"]
    toast: Partial<ToasterToast>
  }
  | {
    type: ActionType["DISMISS_TOAST"]
    toastId?: ToasterToast["id"]
  }
  | {
    type: ActionType["REMOVE_TOAST"]
    toastId?: ToasterToast["id"]
  }

/** State shape for toast management */
interface State {
  toasts: ToasterToast[]
}

/** Map of toast IDs to their removal timeouts */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Adds a toast to the removal queue
 * Toasts are removed after a delay to allow exit animations
 * 
 * @param toastId - ID of the toast to queue for removal
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

/**
 * Reducer function for toast state management
 * Handles add, update, dismiss, and remove actions
 * 
 * @param state - Current state
 * @param action - Action to perform
 * @returns New state
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        // Add new toast at the beginning, limit to TOAST_LIMIT
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        // Update matching toast with new properties
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // Side effect: add toasts to removal queue
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        // If no specific toastId, dismiss all toasts
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        // Mark matching toasts as closed (but don't remove yet)
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
              ...t,
              open: false,
            }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        // Remove all toasts
        return {
          ...state,
          toasts: [],
        }
      }
      // Remove specific toast
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/** Listeners for state changes */
const listeners: Array<(state: State) => void> = []

/** In-memory state (shared across all hook instances) */
let memoryState: State = { toasts: [] }

/**
 * Dispatches an action to update state and notify listeners
 * 
 * @param action - Action to dispatch
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

// ============================================================================
// TOAST API
// ============================================================================

/** Toast options (excludes id which is auto-generated) */
type Toast = Omit<ToasterToast, "id">

/**
 * Creates and displays a new toast notification
 * 
 * @param props - Toast properties
 * @returns Object with id, dismiss, and update methods
 * 
 * @example
 * const { id, dismiss, update } = toast({
 *   title: "Success!",
 *   description: "Your changes have been saved."
 * })
 */
function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
 * Hook to access toast state and methods
 * 
 * @returns Object with:
 * - toasts: Current toast array
 * - toast: Function to create new toasts
 * - dismiss: Function to dismiss toasts by ID or all
 * 
 * @example
 * function MyComponent() {
 *   const { toast, dismiss } = useToast()
 *   
 *   return (
 *     <button onClick={() => toast({ title: "Hello!" })}>
 *       Show Toast
 *     </button>
 *   )
 * }
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    // Subscribe to state changes
    listeners.push(setState)
    return () => {
      // Unsubscribe on unmount
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
