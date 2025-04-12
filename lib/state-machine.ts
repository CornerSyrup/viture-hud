// Simple state machine implementation

export interface StateMachine {
  id: string
  initial: string
  context: any
  states: {
    [key: string]: {
      on?: {
        [key: string]:
          | string
          | {
              target?: string
              actions?: any
              cond?: (context: any) => boolean
            }
      }
    }
  }
  transition: (state: string, event: string) => void
}

export function createMachine(config: Omit<StateMachine, "transition">): StateMachine {
  const machine = {
    ...config,
    transition: (state: string, event: string) => {
      const currentState = machine.states[state]
      if (!currentState || !currentState.on || !currentState.on[event]) {
        return state
      }

      const transition = currentState.on[event]

      if (typeof transition === "string") {
        return transition
      }

      // Handle complex transitions with conditions and actions
      if (transition.cond && !transition.cond(machine.context)) {
        return state
      }

      if (transition.actions) {
        if (typeof transition.actions === "function") {
          machine.context = transition.actions(machine.context)
        } else if (Array.isArray(transition.actions)) {
          transition.actions.forEach((action) => {
            if (typeof action === "function") {
              machine.context = action(machine.context)
            }
          })
        }
      }

      return transition.target || state
    },
  }

  return machine
}

export function assign(assignment: any) {
  return (context: any) => {
    const updates =
      typeof assignment === "function"
        ? assignment(context)
        : Object.keys(assignment).reduce((acc, key) => {
            acc[key] = typeof assignment[key] === "function" ? assignment[key](context) : assignment[key]
            return acc
          }, {})

    return { ...context, ...updates }
  }
}

// Fix the interpret function to properly chain methods

export function interpret(machine: StateMachine) {
  let currentState = machine.initial
  let listeners: ((state: { value: string; context: any }) => void)[] = []

  const service = {
    send: (event: string) => {
      const nextState = machine.transition(currentState, event)
      if (nextState !== currentState) {
        currentState = nextState
        listeners.forEach((listener) => listener({ value: currentState, context: machine.context }))
      }
      return service // Return service for method chaining
    },
    start: () => {
      listeners.forEach((listener) => listener({ value: currentState, context: machine.context }))
      return service // Return service for method chaining
    },
    stop: () => {
      listeners = []
      return service // Return service for method chaining
    },
    onTransition: (listener: (state: { value: string; context: any }) => void) => {
      listeners.push(listener)
      return service // Return service for method chaining
    },
  }

  return service
}
