export interface HistoryOptions {
  /** Maximum number of states retained. Older states are dropped first. */
  limit?: number;
}

/**
 * A minimal, framework-agnostic undo/redo stack.
 *
 * The current state always lives at `index` inside the stack, so `undo`/`redo`
 * simply walk the pointer. Pushing a new state truncates any redo branch. Kept
 * free of Vue so it is trivial to unit test in isolation.
 */
export interface History<T> {
  /** Records a new state, dropping any redo branch ahead of the pointer. */
  push(state: T): void;
  /** Moves back one state and returns it, or undefined when at the start. */
  undo(): T | undefined;
  /** Moves forward one state and returns it, or undefined when at the end. */
  redo(): T | undefined;
  /** Clears all history and seeds it with a single baseline state. */
  reset(state: T): void;
  canUndo(): boolean;
  canRedo(): boolean;
  size(): number;
}

export function createHistory<T>(options: HistoryOptions = {}): History<T> {
  const limit = Math.max(1, options.limit ?? 50);
  let stack: T[] = [];
  let index = -1;

  return {
    push(state) {
      stack = stack.slice(0, index + 1);
      stack.push(state);
      if (stack.length > limit) stack = stack.slice(stack.length - limit);
      index = stack.length - 1;
    },
    undo() {
      if (index <= 0) return undefined;
      index -= 1;
      return stack[index];
    },
    redo() {
      if (index >= stack.length - 1) return undefined;
      index += 1;
      return stack[index];
    },
    reset(state) {
      stack = [state];
      index = 0;
    },
    canUndo() {
      return index > 0;
    },
    canRedo() {
      return index < stack.length - 1;
    },
    size() {
      return stack.length;
    },
  };
}
