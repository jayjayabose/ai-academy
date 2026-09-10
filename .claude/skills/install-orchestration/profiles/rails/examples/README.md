# Rails pack

Worked instances of `core/` for Ruby / Rails, installed by
`install.sh --profile rails` as `.claude/orchestration/examples/rails/`.

Each file names the core file it companions in its first paragraph. Where core states a
rule, this pack states what that rule looked like in a Rails project — commands, file
paths, the shared files that make parallel work dangerous.

## What is here

| File | Companions |
| --- | --- |
| `validation-gates-examples.md` | `core/methodology/validation-gates.md` |
| `database-migration-strategy-examples.md` | `core/methodology/database-migration-strategy.md` |
| `agent-specs-library-examples.md` | `core/methodology/agent-specs-library.md` |
| `testing-standards-examples.md` | `core/playbook/testing-standards.md` |
| `rspec-testing-agent.md` | `core/templates/agent-prompts/testing-infrastructure-agent.md` |
| `rails-patterns.md` | nothing — framework patterns have no portable statement |

## Known gap

This pack was written before the core/examples split, as a set of files that *replaced*
their core counterparts. The commands and the Rails reasoning are sound and were used on
a real repo; the prose still occasionally addresses the reader as though it were the
specification rather than one instance of it. Section headings do not yet mirror the core
files' headings, which `examples/README.md` asks for so the two can be read side by side.

Left as a documented gap rather than a rewrite: rewriting Rails prose that nobody has
re-verified would replace known-good text with plausible text, which is the failure mode
this whole tool is built to avoid.
