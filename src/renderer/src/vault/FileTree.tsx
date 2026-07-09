// Дерево папок и заметок. Клик по файлу — открыть, по папке — свернуть/развернуть.
// Правый клик — контекст-меню (создать/переименовать/удалить). Drag&drop — перемещение.
import React, { useState } from 'react'
import type { VaultEntry } from '../flow-api'

export function FileTree({
  entries,
  depth = 0,
  currentPath,
  expanded,
  onToggle,
  onOpen,
  onContext,
  renaming,
  onRenameCommit,
  onRenameCancel,
  onMove
}: {
  entries: VaultEntry[]
  depth?: number
  currentPath: string | null
  expanded: Set<string>
  onToggle: (path: string) => void
  onOpen: (entry: VaultEntry) => void
  onContext: (e: React.MouseEvent, entry: VaultEntry | null) => void
  renaming: string | null
  onRenameCommit: (entry: VaultEntry, name: string) => void
  onRenameCancel: () => void
  onMove: (srcPath: string, destDir: string) => void
}): JSX.Element {
  return (
    <>
      {entries.map((entry) => (
        <Row
          key={entry.path}
          entry={entry}
          depth={depth}
          currentPath={currentPath}
          expanded={expanded}
          onToggle={onToggle}
          onOpen={onOpen}
          onContext={onContext}
          renaming={renaming}
          onRenameCommit={onRenameCommit}
          onRenameCancel={onRenameCancel}
          onMove={onMove}
        />
      ))}
    </>
  )
}

function Row({
  entry,
  depth,
  currentPath,
  expanded,
  onToggle,
  onOpen,
  onContext,
  renaming,
  onRenameCommit,
  onRenameCancel,
  onMove
}: {
  entry: VaultEntry
  depth: number
  currentPath: string | null
  expanded: Set<string>
  onToggle: (path: string) => void
  onOpen: (entry: VaultEntry) => void
  onContext: (e: React.MouseEvent, entry: VaultEntry | null) => void
  renaming: string | null
  onRenameCommit: (entry: VaultEntry, name: string) => void
  onRenameCancel: () => void
  onMove: (srcPath: string, destDir: string) => void
}): JSX.Element {
  const isDir = entry.type === 'dir'
  const isOpen = expanded.has(entry.path)
  const isActive = currentPath === entry.path
  const [dragOver, setDragOver] = useState(false)
  const label = isDir ? entry.name : entry.name.replace(/\.md$/i, '')

  return (
    <div>
      <div
        className="vault-row"
        draggable={renaming !== entry.path}
        onDragStart={(e) => {
          e.stopPropagation()
          e.dataTransfer.setData('text/vault-path', entry.path)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          if (!isDir) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          setDragOver(false)
          if (!isDir) return
          e.preventDefault()
          e.stopPropagation()
          const src = e.dataTransfer.getData('text/vault-path')
          if (src && src !== entry.path) onMove(src, entry.path)
        }}
        onClick={() => (isDir ? onToggle(entry.path) : onOpen(entry))}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onContext(e, entry)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          paddingLeft: 8 + depth * 14,
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 13,
          color: isActive ? 'var(--text)' : 'var(--muted)',
          background: isActive ? 'var(--panel-2, rgba(255,255,255,0.06))' : dragOver ? 'rgba(34,211,238,0.15)' : 'transparent',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}
      >
        <span style={{ width: 12, flexShrink: 0, opacity: 0.7, fontSize: 10 }}>
          {isDir ? (isOpen ? '▾' : '▸') : ''}
        </span>
        <span style={{ flexShrink: 0, opacity: 0.85 }}>{isDir ? (isOpen ? '📂' : '📁') : '📄'}</span>
        {renaming === entry.path ? (
          <RenameInput initial={label} onCommit={(name) => onRenameCommit(entry, name)} onCancel={onRenameCancel} />
        ) : (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        )}
      </div>

      {isDir && isOpen && entry.children && entry.children.length > 0 && (
        <FileTree
          entries={entry.children}
          depth={depth + 1}
          currentPath={currentPath}
          expanded={expanded}
          onToggle={onToggle}
          onOpen={onOpen}
          onContext={onContext}
          renaming={renaming}
          onRenameCommit={onRenameCommit}
          onRenameCancel={onRenameCancel}
          onMove={onMove}
        />
      )}
    </div>
  )
}

function RenameInput({
  initial,
  onCommit,
  onCancel
}: {
  initial: string
  onCommit: (name: string) => void
  onCancel: () => void
}): JSX.Element {
  const [v, setV] = useState(initial)
  return (
    <input
      autoFocus
      value={v}
      onChange={(e) => setV(e.currentTarget.value)}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(v)
        else if (e.key === 'Escape') onCancel()
      }}
      style={{
        flex: 1,
        minWidth: 0,
        background: 'var(--field, #12141a)',
        border: '1px solid var(--accent)',
        borderRadius: 4,
        color: 'var(--text)',
        font: 'inherit',
        padding: '1px 5px',
        outline: 'none'
      }}
    />
  )
}
