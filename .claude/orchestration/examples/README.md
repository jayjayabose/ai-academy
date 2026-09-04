# Examples: Worked Instances of the Method

**What:** The method in `../core/` applied to one technology stack, one directory per stack

**When:** You want to see what a rule looks like filled in, or you are adapting the method to a stack that has no
pack yet

**Think:** Answer key (the method is the question)

---

## The contract

`core/` states rules that hold for any stack. This directory states what those rules looked like in one project.

Each pack is named `<core-file>-examples.md` and its section headings match the core file's, so the two read side
by side.

## What is enforced mechanically, and what is not

**Enforced.** No file under `core/` may contain a stack token
(`nestjs|angular|sequelize|npm run|npx |typescript|tsconfig|jest|vitest|eslint|prisma|package.json|
localhost:3000|postgres|docker`, case-insensitive), and every extracted instance must land in a pack. That is one
grep, it runs over the whole tree, and it is why the claim "`core/` names no stack" is checkable rather than
believed.

**Not enforced, and these are not hypothetical.** The token list is a list of *tokens*. It says nothing about:

- **References to this repository.** `/course/guidebook/…` is a real path here and nowhere else. Four such links
  survived the split inside `core/playbook/` with the token grep green, and an agent following one learns that
  the project it is installed in has a curriculum.
- **Conventions stated in plain words.** `camelCase` and `snake_case` are not tokens. Four lines under `core/`
  mandated a field-naming convention -- a stack convention -- and contradicted any profile that chose the other
  one. This is the most dangerous class, because unlike a wrong command it produces no error: two files disagree
  and the agent obeys whichever it read first.
- **Per-project content of any kind.** A mission statement, a session handoff, a decision log. Nothing in a grep
  distinguishes "this is how the method works" from "this is what we decided here".
- **Whether a pack actually companions the core file it is named for.** The filename convention above is a
  convention, not a check.

So the honest statement of the contract is: **the token grep proves `core/` names no stack; nothing proves
`core/` is free of this project.** The second property is maintained by reading, and the checks that do cover
parts of it live in `verify-install.sh` (§3b for root-absolute source paths, §5 for naming conventions) rather
than here. If you add a rule to `core/`, the grep is the floor, not the bar.

## Why the instances are kept at all

A pattern without an instance is an aphorism. "Lock your field naming convention before parallel work" teaches
nothing on its own; the camelCase/snake_case table with the exact block that went into every agent prompt teaches
the shape — and pairing it with the note that a Rails project inverts the entire table is what makes the
transferable part visible. That contrast is only available once pattern and instance are in separate files.

## Available packs

- **`node/`** — Node / NestJS / Angular / Sequelize / Jest / PostgreSQL. The stack the method was developed
  against, and the only complete pack.

## Adding a pack for another stack

1. Copy nothing. Read `core/` and write the instances your own project actually uses.
2. Name the directory for the stack, not the project: `examples/rails/`, `examples/python/`.
3. Name each file after the core file it companions, with the `-examples.md` suffix.
4. Match the core file's section headings so the pair can be read together.
5. Say at the top which core file the pack companions, and who should take it.

A partial pack is useful. There is no requirement to companion every core file.

## For an install

Take `core/` alone if your stack is not here. The method does not depend on any pack — that is the property this
directory exists to make checkable.
