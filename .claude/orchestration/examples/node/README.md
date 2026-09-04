# Node Examples Pack

**Stack:** Node · NestJS · Angular · Sequelize · PostgreSQL · Jest · npm

**Companions:** `../../core/`

**Take this pack if** your target project is Node/NestJS/Angular. Otherwise take `core/` alone and write your own
instances, or contribute an `examples/<stack>/` directory.

---

## What is here

Section headings match the core file each pack companions, so the two read side by side.

| Core file | Pack |
| --- | --- |
| `core/methodology/agent-specs-library.md` | `agent-specs-library-examples.md` |
| `core/methodology/atomic-commit-guidelines.md` | `atomic-commit-guidelines-examples.md` |
| `core/methodology/bugfix-prompt-template.md` | `bugfix-prompt-template-examples.md` |
| `core/methodology/coordination-protocols.md` | `coordination-protocols-examples.md` |
| `core/methodology/database-migration-strategy.md` | `database-migration-strategy-examples.md` |
| `core/methodology/environment-validation.md` | `environment-validation-examples.md` |
| `core/methodology/investigation-workflow.md` | `investigation-workflow-examples.md` |
| `core/methodology/logging-protocol-integration.md` | `logging-protocol-integration-examples.md` |
| `core/methodology/pattern-library.md` | `pattern-library-examples.md` |
| `core/methodology/pre-execution-validation-protocol.md` | `pre-execution-validation-protocol-examples.md` |
| `core/methodology/prompt-templates.md` | `prompt-templates-examples.md` |
| `core/methodology/success-criteria.md` | `success-criteria-examples.md` |
| `core/methodology/testing-as-infrastructure.md` | `testing-as-infrastructure-examples.md` |
| `core/methodology/validation-gates.md` | `validation-gates-examples.md` |
| `core/playbook/gotcha-library.md` | `gotcha-library-examples.md` |
| `core/templates/agent-prompts/infrastructure-patterns.md` | `infrastructure-patterns-examples.md` |
| `core/templates/agent-prompts/testing-infrastructure-agent.md` | `testing-infrastructure-agent-examples.md` |

**`nestjs-patterns.md`** has no core counterpart. Every section is a snippet in one framework, so there was no
portable half to split from and it moved here whole.

`core/playbook/testing-standards.md` has no pack, and this is the interesting absence. It carried 16 stack tokens
per 100 lines before this work started, which put it among the five densest files in the tree. It has none now,
because it turned out to be 78% a copy of `core/methodology/testing-as-infrastructure.md` and was reduced to a
checklist before the split reached it. Its instances are in `testing-as-infrastructure-examples.md`, where they
only exist once.

## Start here

`validation-gates-examples.md` is the shortest and the most useful: four commands and their expected output. If
you are adapting the method to a different stack, those four commands are the minimum you have to replace.
