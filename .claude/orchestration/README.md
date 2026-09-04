# Orchestration Partner Knowledge Base

**Primary Audience:** Orchestration Partner (loaded via `/orchestration`)

**For Humans:** Start
with [/course/guidebook/companion/day-2-ai-intelligence.md](/course/guidebook/companion/day-2-ai-intelligence.md) to
learn the context and methodology behind these assets.

## Scale This to the Task

Not everything needs this level of rigor. The full methodology here — validation gates, session logs, execution
plans, coordination checklists — exists for a specific situation: you're handing an agent a complicated or
sizeable piece of work and want it to run for a while (many files, real coordination risk, work you'd hate to
redo) with a paper trail you can trust when you come back to it.

For a small change — a quick fix, a one-file tweak, something you'd finish in a few minutes yourself — just ask
Claude Code to do it directly. Don't create a workspace folder, don't generate an execution plan, don't require a
session log for a two-line fix. Reach for `/orchestration` when the size and risk of the work actually justify the
overhead, not by default for every change.

## What This Directory Contains

This directory houses the knowledge base that powers the orchestration partner pattern:

- **`core/`** - The method, free of any particular technology stack
    - **`core/playbook/`** - Quick reference patterns and coordination protocols
    - **`core/methodology/`** - Complete technical specifications and methodologies
    - **`core/templates/`** - Agent prompt templates for systematic execution
    - **`core/meta/`** - Working patterns and role recovery, the parts that are the same everywhere
- **`examples/`** - Worked instances of the method in a specific stack, one directory per stack
- **`meta/`** - This project's own facts, and the session handoffs written while working on it

`meta/` is a **sibling** of `core/`, not a directory inside it, and the distinction is the whole point of
the split. `core/` is copied verbatim into every project and its value is being byte-identical in all of
them; a file that differs in every project cannot live there. So the two authored files -- the project's
mission and its profile -- and the runtime output of `/handoff` land in `meta/`, which leaves
`diff -r core/ <source>/core/` empty. That emptiness is the only proof that `core/` really is portable.

**The seam between them is checkable, not aspirational.** No file under `core/` contains a technology-stack
token; every instance that was removed from a core file is present in the matching pack. Both are verifiable with
a grep, and the commits that created the split record the results.

**What the grep does not cover** is set out in
examples/README.md § What is enforced mechanically, and what is not.
In short: it proves `core/` names no stack. It does not prove `core/` is free of *this* project — links into
this repository, naming conventions written in plain words, and per-project content are all invisible to it, and
all three have got through.

## How It Works

When you run `/orchestration`, the partner loads all assets from this directory to:

- Apply proven patterns systematically
- Enforce validation gates
- Coordinate multi-agent workflows
- Recover project context ("rise from the ashes")

## Manual Usage

While these files are optimized for machine consumption by the orchestration partner, they can also be used manually:

**See:** [/.claude/orchestration/manual-usage.md](/.claude/orchestration/manual-usage.md) for guidance
on standalone usage.

## Important Notes

- **Do not rename folders** without updating the orchestration partner configuration
- **Single source of truth:** This directory is the authoritative source for all patterns
- **Stable entry points:** Human-readable documentation is linked from the course materials
- **Course integration:** These assets are introduced and explained in Day 2 of the course

## Directory Structure

```
orchestration/
├── core/               The portable method
│   ├── playbook/       Quick reference checklists
│   ├── methodology/    Complete technical specs
│   ├── templates/      Agent prompt templates
│   └── meta/           Project conventions and context
└── examples/           Worked instances, one directory per stack
    └── node/           NestJS + Angular + Sequelize + Jest
```

**Which do you need?**

- Reading the method, or installing it into a project of any stack → `core/`
- Learning by example, or working in Node/NestJS/Angular → both
- Adapting to another stack → `core/`, plus `examples/README.md` for how to contribute a pack

---

**Next Steps:**

1. Complete Day 2 of the course to understand these assets in context
2. Run `/orchestration` to see them in action
3. Reference `/.claude/orchestration/manual-usage.md` for standalone usage patterns
