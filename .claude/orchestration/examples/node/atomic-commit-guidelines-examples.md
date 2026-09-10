# Atomic Commits — worked hooks and messages (Node / NestJS / Angular / Jest)

Companion to `core/methodology/atomic-commit-guidelines.md`. Section headings match. The commit
discipline lives there; the three hook commands and the real commit messages live here, because a
hook command is only ever true of one project.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/`
alone and wire your project's own three commands into the hook. There are only three.

---

## Pre-commit Hook Enforcement

The three commands this project's pre-commit hook ran, in order:

```bash
# Pre-commit checks that MUST pass
1. npm run lint     # ESLint - code style and quality
2. tsc              # TypeScript - type safety
3. npm test         # Unit tests - functionality
```

These are Gates 2, 1 and 3 respectively. See `validation-gates-examples.md` for the full set of five
and the commands that satisfy the other two.

## Integration with Quality Standards

"Type safety enforcement" in core was `TypeScript strict mode` here — `"strict": true` in `tsconfig.json`,
which is what made Gate 1 worth running at all. A non-strict `tsc` passes almost anything.

## Common Atomic Commit Patterns

### Pattern 1: Service + Tests

The message as actually written, naming the library:

```
feat: create LeadSummaryService with Zod validation

- Add LeadSummaryService class with generateSummary method
- Implement Zod schema for summary structure validation
- Add retry logic for invalid LLM outputs
- Include unit tests with mocked LLM responses

Tests: 15 passing
Coverage: 95% for LeadSummaryService
```

Core carries this with "a runtime schema" in place of "Zod", because the pattern — validate the LLM's
output shape at runtime and retry on failure — is not a Zod pattern. Zod is just what was to hand.

### Pattern 2: Schema Extension

The last bullet in this project read `- Update generated TypeScript types`: the shared API types were
code-generated, so extending the type was a two-step change (edit the source of truth, regenerate)
that still belonged in one commit.

## Anti-Patterns to Avoid

###  Good: Logical Sequence

Commit 1 in the good sequence was `feat: add Vercel AI SDK dependencies` — a dependency-only commit,
deliberately separated from the first commit that used the dependency, so that a reviewer bisecting a
regression can tell "we added the SDK" apart from "we called the SDK wrong".

## Frontend Component Feature

Commit 8 of the full-stack sequence, `feat: add API client service methods for [feature]`, was
`feat: add HttpClient service methods for [feature]` here — an injectable Angular service wrapping
`HttpClient`, committed separately from the component that consumed it.
