# Examples: Worked Instances of the Method

**What:** The method in `../core/` applied to one technology stack, one directory per stack

**When:** You want to see what a rule looks like filled in, or you are adapting the method to a stack that has no
pack yet

**Think:** Answer key (the method is the question)

---

## The contract

`core/` states rules that hold for any stack. This directory states what those rules looked like in one project.
The split is enforced mechanically: no file under `core/` may contain a stack token
(`nestjs|angular|sequelize|npm run|npx |typescript|tsconfig|jest|vitest|eslint|prisma|package.json|
localhost:3000|postgres|docker`, case-insensitive), and every extracted instance must land in a pack.

Each pack is named `<core-file>-examples.md` and its section headings match the core file's, so the two read side
by side.

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
