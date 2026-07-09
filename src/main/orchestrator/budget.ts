// ============================================================================
// Budget Manager (раздел 2.3c / 6 ТЗ). Мастер-счётчик ОДИН на прогон и живёт в
// main: все модельные вызовы (root и саб-оркестраторы) идут через брокер, поэтому
// списание точно на каждом уровне рекурсии. Алерты 80/100% — один раз каждый.
// Превышение → hard-stop (брокер отдаёт воркеру budgetExceeded → эскалация).
// ============================================================================
import type { Budget } from './contracts'

export class BudgetManager {
  readonly limits: Budget
  private tokens = 0
  private calls = 0
  private alerted80 = false
  private alerted100 = false

  constructor(limits: Budget) {
    this.limits = limits
  }

  // Можно ли ещё тратить (перед вызовом). false → hard-stop.
  canSpend(): boolean {
    return this.tokens < this.limits.project_token_budget
  }

  // Списать по факту вызова. Возвращает пересечённые пороги для алертов.
  charge(tokens: number, calls = 1): { crossed80: boolean; crossed100: boolean } {
    this.tokens += Math.max(0, tokens)
    this.calls += calls
    const frac = this.fraction()
    const crossed80 = !this.alerted80 && frac >= 0.8
    const crossed100 = !this.alerted100 && frac >= 1
    if (crossed80) this.alerted80 = true
    if (crossed100) this.alerted100 = true
    return { crossed80, crossed100 }
  }

  spentTokens(): number {
    return this.tokens
  }
  spentCalls(): number {
    return this.calls
  }
  remaining(): number {
    return Math.max(0, this.limits.project_token_budget - this.tokens)
  }
  fraction(): number {
    return this.limits.project_token_budget > 0 ? this.tokens / this.limits.project_token_budget : 0
  }
  snapshot(): { tokens: number; calls: number; limit: number; fraction: number } {
    return { tokens: this.tokens, calls: this.calls, limit: this.limits.project_token_budget, fraction: this.fraction() }
  }
}

// Выделить саб-бюджет для рекурсивной ветки из родительского (раздел 2.3d ТЗ).
// Берём min(доля от остатка, max_tokens_per_task*k) и уменьшаем глубину.
export function deriveSubBudget(parent: Budget, remainingTokens: number): Budget {
  const alloc = Math.max(
    parent.max_tokens_per_task,
    Math.floor(remainingTokens * 0.5)
  )
  return {
    ...parent,
    project_token_budget: Math.min(alloc, parent.project_token_budget),
    max_recursion_depth: parent.max_recursion_depth // глубину контролирует брокер по depth
  }
}
