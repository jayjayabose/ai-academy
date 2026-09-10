# Project Mission: {{PROJECT_NAME}}

> Authored at install time. Replace every `{{...}}`. If you cannot answer a section from the
> repo, ask the engineer — a guessed mission produces agents that optimise for the wrong thing.

## What this is

{{What the system does, and for whom. Two or three sentences. If it's an engine or gem,
say what hosts it and which apps depend on it — that constrains every change made here.}}

## Why it exists

{{The business or technical problem. What breaks if this is wrong.}}

## Current focus

{{What's being worked on now, and what's explicitly not being worked on.}}

## Constraints that shape the work

- **Blast radius:** {{who consumes this; is a bad release recoverable, and how fast}}
- **Compatibility:** {{version support matrix, public API surface that can't break}}
- **Data:** {{volume; which tables are large enough that migrations need care}}
- **Deploy model:** {{rolling / blue-green — decides whether column removals must be split}}
- **Compliance / audit:** {{anything that makes certain data or logging non-optional}}

## Quality bar

- {{Coverage threshold, if enforced}}
- {{Whether `.rubocop_todo.yml` may grow}}
- {{Whether the dependency matrix must stay green}}
- {{Review requirements — CODEOWNERS, required approvals}}

## What "done" means here

{{Project-specific. Beyond the validation gates: does a change need a data backfill plan,
a version bump, a changelog entry, host-app coordination, a feature flag?}}

## Definitions

{{Domain vocabulary an agent will encounter in class names and columns, and which is easy to
get wrong. This section prevents more bugs than any other.}}
