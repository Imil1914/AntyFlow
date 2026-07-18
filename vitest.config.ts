import { defineConfig } from 'vitest/config'

// Юнит-тесты чистых модулей (без Electron/tldraw). Пока — версионирование схемы нод (T1.2).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
})
