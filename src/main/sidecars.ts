// Резолвер путей к «сайдкарам» — внешним программам (OpenCode, OpenScience,
// AnythingLLM), которые Flow запускает как дочерние процессы, но которые
// поставляются ВНУТРИ установщика (electron-builder → extraResources → resources/).
//
// Идея: на чужом ПК не нужны ни системный Node, ни git, ни глобальные npm-CLI —
// всё лежит рядом с Flow.exe в папке resources/.
//
//   packaged:  <install>/resources/{bin,node,openscience,anythingllm}
//   dev:       <project>/sidecars/{bin,node,openscience,anythingllm}
//
// В dev-режиме бинарники берём из локальной папки sidecars/ (её наполняет
// scripts/prepare-sidecars.mjs; в git она не коммитится — большие файлы).
import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

const isWin = process.platform === 'win32'
const exe = (name: string): string => (isWin ? name + '.exe' : name)

/** Корень сайдкаров: resources/ в упакованном виде, sidecars/ в проекте — в dev. */
export function sidecarRoot(): string {
  return app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'sidecars')
}

/** Абсолютный путь внутри папки сайдкаров. */
export function sidecarPath(...parts: string[]): string {
  return join(sidecarRoot(), ...parts)
}

/**
 * Приватный Node — для JS-сайдкаров (OpenScience, AnythingLLM), чтобы не зависеть
 * от системного Node и совпасть по ABI с нативными модулями. null — если не вложен.
 */
export function nodeBin(): string | null {
  const p = sidecarPath('node', exe('node'))
  return existsSync(p) ? p : null
}

/** Бинарник OpenCode (standalone, Node не нужен). null — тогда падаем на PATH. */
export function opencodeBin(): string | null {
  const p = sidecarPath('bin', exe('opencode'))
  return existsSync(p) ? p : null
}

/** Бинарник OpenScience (standalone Bun-бинарник). null — тогда падаем на PATH. */
export function opensciBin(): string | null {
  const p = sidecarPath('bin', exe('openscience'))
  return existsSync(p) ? p : null
}

/** Каталог prebuilt AnythingLLM (server+collector+фронт+node_modules). null — не вложен. */
export function anythingllmDir(): string | null {
  const p = sidecarPath('anythingllm')
  return existsSync(p) ? p : null
}
