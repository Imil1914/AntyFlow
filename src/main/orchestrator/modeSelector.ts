// ============================================================================
// Mode Selector (раздел 2.3b ТЗ). Отталкивается от режима, предложенного Planner,
// и корректирует эвристиками (размер, глубина рекурсии).
// ============================================================================
import type { ExecutionMode, TaskNode, Budget } from './contracts'

export function selectMode(task: TaskNode, depth: number, budget: Budget): ExecutionMode {
  let mode = task.mode

  // Крупную задачу, не помеченную recursive, эскалируем в recursive — если есть
  // запас глубины (иначе рекурсия просто не заспавнится).
  if (mode !== 'recursive' && task.size === 'large' && depth < budget.max_recursion_depth) {
    mode = 'recursive'
  }

  // recursive на пределе глубины исполняем «плоско»: крупное — советом, иначе линейно.
  if (mode === 'recursive' && depth >= budget.max_recursion_depth) {
    mode = task.size === 'large' ? 'council' : 'pipeline'
  }

  return mode
}
