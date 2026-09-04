# Manual Usage: Using Orchestration Partner Assets Standalone

The orchestration partner automatically loads patterns, templates, and methodology from
`.claude/orchestration/`. However, you can also use these assets manually without the partner.

## When to Use Manual vs. Partner

**Use the orchestration partner when:**

- Starting a new feature or project
- You want systematic application of all patterns
- You need "rise from the ashes" recovery capability
- You're coordinating multiple agents

**Use manual approach when:**

- You need a quick reference to a specific pattern
- You want to copy a single template
- You're learning how the patterns work
- You prefer hands-on control

## Templates

**Location:** [.claude/orchestration/core/templates/](core/templates/)

**How to use:**

1. Browse available templates in the directory
2. Copy the template file content
3. Customize for your specific feature
4. Execute with your preferred agent

## Playbook Patterns

**Location:** [.claude/orchestration/core/playbook/](core/playbook/)

**How to use:**

1. Find the pattern relevant to your current work
2. Read the coordination protocol
3. Apply the pattern manually in your workflow

## Methodology Specifications

**Location:** [.claude/orchestration/core/methodology/](core/methodology/)

**How to use:**

1. Read the complete specification for a methodology
2. Understand the success criteria
3. Apply the principles in your implementation

## Examples

**Location:** [.claude/orchestration/examples/](examples/)

**How to use:**

1. Find the pack for your stack; if there is none, use `core/` alone
2. Read the pack beside the core file it companions — the section headings match
3. Copy commands and config from the pack, rules from core

**Do not** copy a pack's contents into a project on a different stack. A pack is one project's answer.

## Meta Context Files

**Location:** [.claude/orchestration/core/meta/](core/meta/)

**How to use:**

- These provide project context for the orchestration partner
- Useful for understanding project conventions
- Reference when making architectural decisions

## Best of Both Worlds

**Recommended approach:**

- Initialize the orchestration partner on Day 2
- Use it for major features and coordination
- Reference assets manually for quick lookups and learning
- Understanding the assets independently makes you a better orchestration partner user

---

**Note:** These assets are most powerful when loaded by the orchestration partner, but understanding them independently
deepens your grasp of the patterns and methodology.
