import { describe, it, expect, beforeEach } from 'vitest'
import {
  migrateExtra,
  parseAndMigrateExtra,
  currentVersion,
  markCorrupt,
  isExtraCorrupt,
  clearCorrupt,
  corruptRaw
} from '../index'

describe('migrateExtra — note v1 → v2 (переименование pinned → favorite)', () => {
  it('мигрирует старое поле pinned в favorite и проставляет версию', () => {
    const { extra, changed } = migrateExtra('note', { pinned: true })
    expect(changed).toBe(true)
    expect(extra.favorite).toBe(true)
    expect('pinned' in extra).toBe(false)
    expect(extra.extraVersion).toBe(2)
  })

  it('сохраняет прочие поля при миграции', () => {
    const { extra } = migrateExtra('note', { pinned: false, foo: 'bar', n: 3 })
    expect(extra.favorite).toBe(false)
    expect(extra.foo).toBe('bar')
    expect(extra.n).toBe(3)
    expect(extra.extraVersion).toBe(2)
  })

  it('уже актуальная нота (v2) не меняется', () => {
    const input = { extraVersion: 2, favorite: true }
    const { extra, changed } = migrateExtra('note', input)
    expect(changed).toBe(false)
    expect(extra).toEqual(input)
  })

  it('note без extra (v1, пусто) → только бамп версии', () => {
    const { extra, changed } = migrateExtra('note', {})
    expect(changed).toBe(true)
    expect(extra.extraVersion).toBe(2)
  })
})

describe('migrateExtra — kind без версии (по умолчанию v1) не трогается', () => {
  it('ai/{}  → changed=false, extra без extraVersion', () => {
    expect(currentVersion('ai')).toBe(1)
    const { extra, changed } = migrateExtra('ai', { some: 1 })
    expect(changed).toBe(false)
    expect(extra).toEqual({ some: 1 })
    expect('extraVersion' in extra).toBe(false)
  })
})

describe('parseAndMigrateExtra — разбор сырого extra', () => {
  it('валидная старая нота (строка) → migrated + новый JSON', () => {
    const r = parseAndMigrateExtra('note', '{"pinned":false}')
    expect(r.status).toBe('migrated')
    if (r.status === 'migrated') {
      expect(r.extra.favorite).toBe(false)
      expect(r.extra.extraVersion).toBe(2)
      expect(JSON.parse(r.json).extraVersion).toBe(2)
    }
  })

  it('актуальный extra v1-kind → ok (без изменений)', () => {
    const r = parseAndMigrateExtra('ai', '{"model":"x"}')
    expect(r.status).toBe('ok')
  })

  it('пустой/пробельный extra → ok', () => {
    expect(parseAndMigrateExtra('ai', '').status).toBe('ok')
    expect(parseAndMigrateExtra('ai', '   ').status).toBe('ok')
  })

  it('невалидный JSON → corrupt (сырьё сохранено)', () => {
    const bad = 'not json {'
    const r = parseAndMigrateExtra('note', bad)
    expect(r.status).toBe('corrupt')
    if (r.status === 'corrupt') expect(r.raw).toBe(bad)
  })

  it('валидный JSON, но не объект → corrupt', () => {
    expect(parseAndMigrateExtra('note', '[1,2,3]').status).toBe('corrupt')
    expect(parseAndMigrateExtra('note', '"строка"').status).toBe('corrupt')
    expect(parseAndMigrateExtra('note', '42').status).toBe('corrupt')
    expect(parseAndMigrateExtra('note', 'null').status).toBe('corrupt')
  })
})

describe('реестр повреждённых нод', () => {
  beforeEach(() => clearCorrupt('shape:test'))
  it('mark/is/clear работают', () => {
    expect(isExtraCorrupt('shape:test')).toBe(false)
    markCorrupt('shape:test', '{bad')
    expect(isExtraCorrupt('shape:test')).toBe(true)
    expect(corruptRaw('shape:test')).toBe('{bad')
    clearCorrupt('shape:test')
    expect(isExtraCorrupt('shape:test')).toBe(false)
  })
})
