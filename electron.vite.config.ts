import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// electron-vite делит приложение на 3 части:
//  main     — процесс Electron (управляет окном, доступ к ОС/файлам, MCP)
//  preload  — безопасный "мост" между окном и системой
//  renderer — само окно (React + холст), обычный веб внутри
export default defineConfig({
  // externalizeDepsPlugin оставляет node-зависимости внешними —
  // нужно для ESM-модуля MCP SDK (грузим через динамический import).
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    base: './',
    plugins: [react()]
  }
})
