#!/usr/bin/env python3
"""Merge drafts/plan-{F,T,C}.md into the single plan file with numeric task ids.
F1..Fn -> Task 1..n, T1.. -> next, C1.. -> next. Lane preambles (text before a lane's first task)
are also written to drafts/lane-<X>-preamble.md so implementers can read their lane's constraints."""
import re, sys, pathlib
PKG = pathlib.Path("/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11")
PLAN = pathlib.Path("/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11-hybrid-redesign.md")
header = (PKG / "drafts" / "plan-header.md").read_text(encoding="utf-8")
out = [header.rstrip() + "\n"]
mapping = []
n = 0
for lane in ("F", "T", "C"):
    text = (PKG / "drafts" / f"plan-{lane}.md").read_text(encoding="utf-8")
    lines = text.split("\n")
    # drop a leading H1 title of the part file
    if lines and lines[0].startswith("# "):
        lines = lines[1:]
    body = "\n".join(lines)
    head_re = re.compile(r"^(#{2,3})\s+Task\s+" + lane + r"(\d+)\b(.*)$", re.M)
    first = head_re.search(body)
    pre = body[: first.start()] if first else body
    (PKG / "drafts" / f"lane-{lane}-preamble.md").write_text(pre.strip() + "\n", encoding="utf-8")
    def ren(m):
        global n
        n += 1
        mapping.append((f"{lane}{m.group(2)}", n))
        return f"{m.group(1)} Task {n} ({lane}{m.group(2)}){m.group(3)}"
    body = head_re.sub(ren, body)
    title = {"F": "Фаза F — фундамент и оболочка (последовательно, первой)",
             "T": "Линия T — «Задачи» (параллельно с линией C, после фазы F)",
             "C": "Линия C — «Холст» (параллельно с линией T, после фазы F)"}[lane]
    out.append(f"\n---\n\n## {title}\n\n" + body.strip() + "\n")
PLAN.write_text("\n".join(out), encoding="utf-8")
(PKG / "drafts" / "task-map.txt").write_text("\n".join(f"{k} -> Task {v}" for k, v in mapping) + "\n", encoding="utf-8")
print("tasks:", ", ".join(f"{k}={v}" for k, v in mapping))
