#!/usr/bin/env python3
import re, pathlib
PKG = pathlib.Path("/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21")
PLAN = pathlib.Path("/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21-canvas-toolkit.md")
parts = [
  ("F", r"^(#{2,3})\s+Task\s+\d+\s+\(F(\d+)\):\s*(.*)$", "Фаза F — фундамент (последовательно, первой)"),
  ("R", r"^(#{2,3})\s+Task\s+\d+\s+\(R(\d+)\):\s*(.*)$", "Линия R — панель и фигуры (параллельно с B и S после F)"),
  ("B", r"^(#{2,3})\s+Task\s+B(\d+):\s*(.*)$", "Линия B — содержимое и файлы (параллельно с R и S после F)"),
  ("S", r"^(#{1,3})\s+Задача\s+S(\d+)\s+—\s*(.*)$", "Линия S — сервер (параллельно с R и B после F)"),
]
header = (PKG / "drafts" / "plan-header.md").read_text(encoding="utf-8")
out = [header.rstrip() + "\n"]; n = 0; mapping = []
for lane, pat, title in parts:
    text = (PKG / "drafts" / f"plan-{lane}.md").read_text(encoding="utf-8")
    lines = text.split("\n")
    if lines and lines[0].startswith("# "): lines = lines[1:]
    body = "\n".join(lines)
    # non-task notes: B7 and S4 become plain sections
    body = re.sub(r"^### Task B7 \(необязательная\):", "#### Примечание B7:", body, flags=re.M)
    body = re.sub(r"^## S4 — ", "#### Примечание S4 — ", body, flags=re.M)
    rx = re.compile(pat, re.M)
    first = rx.search(body)
    pre = body[: first.start()] if first else body
    (PKG / "drafts" / f"lane-{lane}-preamble.md").write_text(pre.strip() + "\n", encoding="utf-8")
    def ren(m):
        global n
        n += 1; mapping.append((f"{lane}{m.group(2)}", n))
        return f"### Task {n} ({lane}{m.group(2)}): {m.group(3)}"
    body = rx.sub(ren, body)
    out.append(f"\n---\n\n## {title}\n\n" + body.strip() + "\n")
PLAN.write_text("\n".join(out), encoding="utf-8")
(PKG / "drafts" / "task-map.txt").write_text("\n".join(f"{k} -> Task {v}" for k, v in mapping) + "\n", encoding="utf-8")
print("tasks:", ", ".join(f"{k}={v}" for k, v in mapping))
