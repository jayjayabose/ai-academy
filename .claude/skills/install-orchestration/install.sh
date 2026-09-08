#!/usr/bin/env bash
# Install the ai-academy orchestration commands + knowledge base into a project's .claude/ dir.
set -euo pipefail

# --- resolve this script's real location, following symlinks (portable, no readlink -f) ---
src="${BASH_SOURCE[0]}"
while [ -L "$src" ]; do
  dir="$(cd -P "$(dirname "$src")" && pwd)"
  src="$(readlink "$src")"
  [[ "$src" != /* ]] && src="$dir/$src"
done
SKILL_DIR="$(cd -P "$(dirname "$src")" && pwd)"
# .claude/skills/install-orchestration -> .claude
SOURCE_CLAUDE="${AI_ACADEMY_CLAUDE:-$(cd "$SKILL_DIR/../.." && pwd)}"

TARGET_PROJECT="$PWD"
FORCE=0
DRY_RUN=0
PROFILE=""
WITH_BACKUP=0
EXAMPLES="auto"

usage() {
  cat <<'USAGE'
Usage: install.sh [TARGET_PROJECT] [--profile NAME] [--examples NAME|none]
                  [--force] [--dry-run] [--with-backup]

Copies the orchestration slash commands and their knowledge base into
TARGET_PROJECT/.claude/ (defaults to the current directory).

  --profile NAME  supply a stack-shaped meta/project-profile.md template, and the
                  matching examples pack if the profile ships one. Available: rails
  --examples NAME install the worked-example pack for NAME instead of the one the
                  target's stack implies. `none` installs no pack: correct when the
                  target's stack has no pack yet, which is the common case.
  --force         overwrite files that already exist in the target
  --dry-run       print what would happen, change nothing
  --with-backup   if TARGET_PROJECT/.claude is gitignored, set up a git-versioned
                  backup of the install and hooks that keep it current. Without
                  this flag the situation is only REPORTED, never acted on --
                  writing hooks changes runtime behaviour for every future session
                  in that repo, so it stays opt-in.

Override the source with AI_ACADEMY_CLAUDE=/path/to/ai-academy/.claude
USAGE
}

expect=""
for arg in "$@"; do
  if [ -n "$expect" ]; then
    case "$expect" in profile) PROFILE="$arg" ;; examples) EXAMPLES="$arg" ;; esac
    expect=""; continue
  fi
  case "$arg" in
    --force)       FORCE=1 ;;
    --dry-run)     DRY_RUN=1 ;;
    --with-backup) WITH_BACKUP=1 ;;
    --profile)     expect=profile ;;
    --profile=*)   PROFILE="${arg#--profile=}" ;;
    --examples)    expect=examples ;;
    --examples=*)  EXAMPLES="${arg#--examples=}" ;;
    -h|--help)     usage; exit 0 ;;
    -*)            echo "unknown option: $arg" >&2; usage >&2; exit 2 ;;
    *)             TARGET_PROJECT="$arg" ;;
  esac
done
if [ -n "$expect" ]; then
  echo "error: --$expect needs a value" >&2; exit 2
fi

PROFILE_DIR=""
if [ -n "$PROFILE" ]; then
  PROFILE_DIR="$SKILL_DIR/profiles/$PROFILE"
  if [ ! -d "$PROFILE_DIR" ]; then
    echo "error: no such profile: $PROFILE" >&2
    echo "available: $(ls "$SKILL_DIR/profiles" 2>/dev/null | tr '\n' ' ')" >&2
    exit 2
  fi
fi

# manifest.tsv lists ONLY the residue: the files the installer cannot get right.
# Everything else is copied verbatim, which after the core/examples split is nearly
# all of it. There is no per-file classification pass any more because there is
# nothing left to classify.
MANIFEST="$SKILL_DIR/manifest.tsv"

# --- validate source ---
if [ ! -f "$MANIFEST" ]; then
  echo "error: manifest.tsv missing beside install.sh ($MANIFEST)" >&2
  exit 1
fi

for required in commands/orchestration.md commands/handoff.md commands/validate.md orchestration; do
  if [ ! -e "$SOURCE_CLAUDE/$required" ]; then
    echo "error: source is missing $required" >&2
    echo "       looked in: $SOURCE_CLAUDE" >&2
    echo "       set AI_ACADEMY_CLAUDE to the ai-academy .claude directory" >&2
    exit 1
  fi
done
# The whole design below assumes a portable core: a tree with no stack token in it,
# so there is nothing to rewrite on the way in. Refuse to guess if it is absent.
if [ ! -d "$SOURCE_CLAUDE/orchestration/core" ]; then
  echo "error: $SOURCE_CLAUDE/orchestration has no core/ directory." >&2
  echo "       This installer copies a portable core verbatim; it has no machinery for" >&2
  echo "       rewriting a stack-specific knowledge base in place. Point it at a source" >&2
  echo "       with orchestration/core/ and orchestration/examples/." >&2
  exit 1
fi

# --- validate target ---
if [ ! -d "$TARGET_PROJECT" ]; then
  echo "error: target project does not exist: $TARGET_PROJECT" >&2
  exit 1
fi
TARGET_PROJECT="$(cd "$TARGET_PROJECT" && pwd)"
TARGET_CLAUDE="$TARGET_PROJECT/.claude"

if [ "$TARGET_CLAUDE" = "$SOURCE_CLAUDE" ]; then
  echo "error: target is the source itself ($SOURCE_CLAUDE) — nothing to do" >&2
  exit 1
fi

# --- which examples pack, if any -----------------------------------------
# A pack is one stack's worked instances. Installing the WRONG one is the failure
# the core/examples split exists to prevent: 20 files of Node commands in a Rails
# repo read as instructions, not as illustrations. So the pack is chosen from the
# target's own stack, and "no pack" is a perfectly good answer -- core/ is complete
# without one, which is the property examples/README.md exists to guarantee.
detect_stack() {
  [ -f "$TARGET_PROJECT/Gemfile" ]        && { echo rails; return; }
  [ -f "$TARGET_PROJECT/package.json" ]   && { echo node; return; }
  [ -f "$TARGET_PROJECT/pyproject.toml" ] && { echo python; return; }
  [ -f "$TARGET_PROJECT/requirements.txt" ] && { echo python; return; }
  [ -f "$TARGET_PROJECT/go.mod" ]         && { echo go; return; }
  [ -f "$TARGET_PROJECT/Cargo.toml" ]     && { echo rust; return; }
  echo unknown
}
pack_source() {  # pack_source <name> -> dir holding the pack, or empty
  [ -n "$1" ] || return 0
  if [ -n "$PROFILE_DIR" ] && [ -d "$PROFILE_DIR/examples" ] && [ "$1" = "$PROFILE" ]; then
    printf '%s' "$PROFILE_DIR/examples"; return
  fi
  [ -d "$SOURCE_CLAUDE/orchestration/examples/$1" ] && printf '%s' "$SOURCE_CLAUDE/orchestration/examples/$1"
  # An explicit `return 0`: without it the function's status is the last test's, and
  # `PACK_SRC="$(pack_source ...)"` then aborts the whole script under `set -e` before
  # the "no such pack" message can be printed. Exit 1, silently, on a typo'd --examples.
  return 0
}
TARGET_STACK="$(detect_stack)"
PACK=""
PACK_SRC=""
case "$EXAMPLES" in
  none) PACK="" ;;
  auto) PACK="${PROFILE:-$TARGET_STACK}" ;;
  *)    PACK="$EXAMPLES" ;;
esac
if [ -n "$PACK" ]; then
  PACK_SRC="$(pack_source "$PACK")"
  if [ -z "$PACK_SRC" ]; then
    if [ "$EXAMPLES" = "auto" ]; then
      PACK=""   # no pack for this stack yet; that is a normal, documented state
    else
      echo "error: no examples pack named '$PACK'" >&2
      echo "  in the source: $(ls "$SOURCE_CLAUDE/orchestration/examples" 2>/dev/null | grep -v '\.md$' | tr '\n' ' ')" >&2
      echo "  in profiles (need --profile NAME too): $(cd "$SKILL_DIR/profiles" 2>/dev/null && ls -d */examples 2>/dev/null | cut -d/ -f1 | tr '\n' ' ')" >&2
      exit 2
    fi
  fi
fi

echo "source: $SOURCE_CLAUDE"
echo "target: $TARGET_CLAUDE"
echo "stack:  $TARGET_STACK (detected)"
if [ -n "$PACK" ]; then echo "pack:   examples/$PACK"
else echo "pack:   none — core/ is complete without one"; fi
[ "$DRY_RUN" -eq 1 ] && echo "mode:   DRY RUN (no changes)"
[ "$FORCE" -eq 1 ] && echo "mode:   FORCE (existing files overwritten)"
[ -n "$PROFILE" ] && echo "profile: $PROFILE ($PROFILE_DIR)"
echo

# A single EXIT trap for the whole script. bash keeps only the LAST handler per
# signal, so a second `trap ... EXIT` further down would silently discard this one --
# exactly how the staging dir leaked on every run until it was caught.
CLEANUP_PATHS=""
cleanup_all() { for _p in $CLEANUP_PATHS; do [ -n "$_p" ] && rm -rf "$_p"; done; }
trap cleanup_all EXIT
register_cleanup() { CLEANUP_PATHS="$CLEANUP_PATHS $1"; }

# --- build into a staging dir, reconcile afterwards -----------------------
# Writing straight into the target means the only way to protect phase-2 work is a
# per-file "does it exist" check. Building the complete expected install somewhere
# else first turns that into a comparison we can reason about: for each file we know
# what a pristine install WOULD produce, what is on disk, and what we last wrote.
# Nothing in the target is touched until every phase has succeeded.
FINAL_CLAUDE="$TARGET_CLAUDE"
MANIFEST_FILE="$FINAL_CLAUDE/orchestration/.install-manifest"
if [ "$DRY_RUN" -eq 0 ]; then
  STAGE="$(mktemp -d -t orchinstall-XXXXXX)"
  register_cleanup "$STAGE"
  # The build phases below all write through $TARGET_CLAUDE; point it at the stage.
  # Their "already exists" branches go inert against an empty dir, which is what we
  # want: the stage always receives the complete, unconditional install.
  TARGET_CLAUDE="$STAGE"
fi

hash_of() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | awk '{print $1}'
  else sha256sum "$1" | awk '{print $1}'; fi
}
# What we recorded writing last time, if anything.
recorded_hash() {
  [ -f "$MANIFEST_FILE" ] || return 1
  awk -v p="$1" '$2 == p { print $1; f=1 } END { exit !f }' "$MANIFEST_FILE"
}

copied=0
skipped=0
authored=0
work_list=""

# copy_from <absolute-source-file> <relative-dest-path>
copy_from() {
  local from="$1" rel="$2"
  local to="$TARGET_CLAUDE/$rel"
  if [ -e "$to" ] && [ "$FORCE" -eq 0 ]; then
    if cmp -s "$from" "$to"; then echo "  same    $rel"
    else echo "  SKIP    $rel (exists — use --force to overwrite)"; skipped=$((skipped + 1)); fi
    return
  fi
  echo "  copy    $rel"
  copied=$((copied + 1))
  [ "$DRY_RUN" -eq 1 ] && return
  mkdir -p "$(dirname "$to")"
  cp "$from" "$to"
}

echo "commands:"
while IFS= read -r f; do
  base="$(basename "$f")"
  # README.md is too generic a filename to sit in .claude/commands/: a user keeping this
  # install local needs to name it in a global gitignore, where it would also hide real
  # project READMEs. Land the command docs under orchestration/ instead, which is already
  # covered by the common `.claude/*` rule.
  if [ "$base" = "README.md" ]; then
    copy_from "$f" "orchestration/COMMANDS.md"
  else
    copy_from "$f" "commands/$base"
  fi
done < <(find "$SOURCE_CLAUDE/commands" -maxdepth 1 -name '*.md' | sort)

echo
echo "knowledge base (core/ — copied verbatim, nothing in it names a stack):"
# session-handoffs/ is excluded for the same reason as workspace/ (see the comment at
# the workspace step): those are the SOURCE project's own session notes -- its blockers,
# its decisions, its file paths. Copying them plants another project's history in this
# one, and their claims get read as facts about the target.
#
# meta/project-mission.md is excluded because it IS the source project's mission
# statement. It is on the author list instead. The pattern is anchored on the tail
# (*/meta/project-mission.md) rather than the full path: this file has already moved
# once (core/meta/ -> meta/), and a literal path silently matched nothing afterwards
# while the install still looked correct, because the authored step overwrites it.
while IFS= read -r f; do
  rel="orchestration/${f#"$SOURCE_CLAUDE/orchestration/"}"
  case "$rel" in
    */session-handoffs/*)                    continue ;;
    */meta/project-mission.md)               continue ;;
    orchestration/examples/*/*)              continue ;;   # packs handled below
  esac
  copy_from "$f" "$rel"
done < <(find "$SOURCE_CLAUDE/orchestration" -type f | sort)

echo
echo "examples pack:"
if [ -n "$PACK" ]; then
  while IFS= read -r f; do
    copy_from "$f" "orchestration/examples/$PACK/${f#"$PACK_SRC/"}"
  done < <(find "$PACK_SRC" -type f | sort)
elif [ "$EXAMPLES" = "none" ]; then
  echo "  none    suppressed with --examples none."
else
  echo "  none    no pack for '$TARGET_STACK' yet — core/ stands alone by design."
  echo "          examples/README.md explains how to write one for this stack."
fi

echo
echo "authored files (templates only — filling them is the job):"
# These two are per-project by definition. They are the reason phase 2 exists, and the
# reason core/ must stay pristine: a file that differs in every project cannot live in
# a tree whose whole value is being identical in every project.
install_author() {
  local rel="$1" from=""
  [ -n "$PROFILE_DIR" ] && [ -f "$PROFILE_DIR/$(basename "$rel")" ] && from="$PROFILE_DIR/$(basename "$rel")"
  [ -z "$from" ] && [ -f "$SKILL_DIR/templates/$(basename "$rel")" ] && from="$SKILL_DIR/templates/$(basename "$rel")"
  if [ -z "$from" ]; then
    echo "  WARN    no template for $rel — author it from scratch" >&2
    return
  fi
  echo "  author  $rel (${from#"$SKILL_DIR/"})"
  authored=$((authored + 1))
  [ "$DRY_RUN" -eq 1 ] && return
  mkdir -p "$(dirname "$TARGET_CLAUDE/$rel")"
  cp "$from" "$TARGET_CLAUDE/$rel"
}
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  install_author "$rel"
done < <(awk -F'\t' '!/^#/ && NF>1 && $1=="author" {print $2}' "$MANIFEST")

# ------------------------------------------------------- reconcile + manifest
# Three states per file, and only the middle one is a judgement call:
#   absent          -> install it
#   matches what we last wrote (or matches the stage exactly) -> yours is untouched,
#                      safe to update
#   differs from what we last wrote -> YOU localised it. Keep yours, drop the new
#                      version alongside as .new so the merge is your decision.
# This is how dpkg and rpm treat config files, for the same reason: the installer
# cannot tell an improvement from a regression in a file it did not write.
n_new=0; n_same=0; n_updated=0; n_local=0; n_forced=0
if [ "$DRY_RUN" -eq 0 ]; then
  echo
  echo "reconcile:"
  NEWMAN="$(mktemp -t orchman-XXXXXX)"
  register_cleanup "$NEWMAN"
  while IFS= read -r src; do
    rel="${src#"$STAGE/"}"
    final="$FINAL_CLAUDE/$rel"
    mkdir -p "$(dirname "$final")"
    if [ ! -e "$final" ]; then
      cp "$src" "$final"; n_new=$((n_new + 1))
      printf '%s  %s\n' "$(hash_of "$final")" "$rel" >> "$NEWMAN"
    elif cmp -s "$src" "$final"; then
      # Identical to what a pristine install produces -- provably untouched, so it is
      # safe to record even if we have never recorded it before. This is what lets an
      # install that predates the manifest seed itself instead of assuming the worst.
      n_same=$((n_same + 1))
      printf '%s  %s\n' "$(hash_of "$final")" "$rel" >> "$NEWMAN"
    elif [ "$FORCE" -eq 1 ]; then
      cp "$src" "$final"; n_forced=$((n_forced + 1))
      echo "  FORCED  $rel (your version discarded)"
      printf '%s  %s\n' "$(hash_of "$final")" "$rel" >> "$NEWMAN"
    elif rec="$(recorded_hash "$rel" 2>/dev/null)" && [ "$rec" = "$(hash_of "$final")" ]; then
      cp "$src" "$final"; n_updated=$((n_updated + 1))
      echo "  update  $rel (unmodified since we wrote it)"
      printf '%s  %s\n' "$(hash_of "$final")" "$rel" >> "$NEWMAN"
    else
      cp "$src" "$final.new"; n_local=$((n_local + 1))
      echo "  LOCAL   $rel — yours kept, new version at $rel.new"
      # keep the previous record: the file we protected is still the one we last wrote
      if rec="$(recorded_hash "$rel" 2>/dev/null)"; then
        printf '%s  %s\n' "$rec" "$rel" >> "$NEWMAN"
      fi
    fi
  done < <(find "$STAGE" -type f | sort)

  mkdir -p "$(dirname "$MANIFEST_FILE")"
  { echo "# sha256 of each file as this installer last wrote it. Do not hand-edit:"
    echo "# a wrong hash here makes the installer overwrite work it should protect."
    sort -k2 "$NEWMAN"
  } > "$MANIFEST_FILE"

  printf '  %s new, %s already current, %s updated, %s kept local, %s forced\n' \
    "$n_new" "$n_same" "$n_updated" "$n_local" "$n_forced"
  if [ "$n_local" -gt 0 ]; then
    echo
    echo "  $n_local file(s) you had localised were left alone. Their new versions sit"
    echo "  beside them as *.new — diff and merge deliberately, then delete the .new:"
    echo "    find '$FINAL_CLAUDE' -name '*.new'"
  fi
fi

# the build phases are done; everything below talks about the real target again
TARGET_CLAUDE="$FINAL_CLAUDE"

echo
# workspace/ is DELIBERATELY not copied. The source repo's workspace holds finished
# feature artifacts (execution plans, agent prompts and logs, screenshots) for features
# built in THAT project -- ai-academy's is ~1.3M of them. They are per-project history,
# not reusable methodology, and copying them would plant another project's decisions in
# this one. The copy loops above walk only commands/*.md and orchestration/**, so
# workspace/ can never be picked up: do not add it.
echo "workspace:"
if [ -e "$TARGET_CLAUDE/workspace" ]; then
  echo "  same    workspace/ (already exists)"
else
  echo "  create  workspace/ (empty — this project's features land here)"
  if [ "$DRY_RUN" -eq 0 ]; then
    mkdir -p "$TARGET_CLAUDE/workspace"
    : > "$TARGET_CLAUDE/workspace/.gitkeep"
  fi
fi

n_author=$(awk -F'\t' '!/^#/ && NF>1 && $1=="author"' "$MANIFEST" | wc -l | tr -d ' ')
n_retarget=$(awk -F'\t' '!/^#/ && NF>1 && $1=="retarget"' "$MANIFEST" | wc -l | tr -d ' ')

echo
echo "$copied copied, $skipped skipped, $authored template(s) staged for authoring."

echo
echo "=============================================================="
echo "PHASE 1 (copy) done. PHASE 2 (adapt) is NOT done."
echo "=============================================================="
echo "core/ is portable and arrived correct. What did NOT arrive correct:"
echo
echo "  $n_author file(s) that only you can write (project profile + mission)"
echo "  $n_retarget file(s) that still name the source project's commands or paths"

if [ "$DRY_RUN" -eq 0 ]; then
  TODO="$TARGET_CLAUDE/orchestration/ADAPTATION-TODO.md"
  {
    echo "# Adaptation TODO"
    echo
    echo "\`/install-orchestration\` copied the knowledge base into this project. The"
    echo "portable half — \`orchestration/core/\` — needs nothing: no file in it names a"
    echo "technology stack. This list is the rest. Work it top-down; delete this file"
    echo "when it is empty."
    echo
    echo "Run \`detect-stack.sh .\` from the skill directory for the project facts, and"
    echo "\`verify-install.sh .\` when you think you are done."
    echo
    echo "## Write these — nobody else can"
    echo
    awk -F'\t' '!/^#/ && NF>1 && $1=="author" { printf "- [ ] \`%s\`\n      %s\n", $2, $3 }' "$MANIFEST"
    echo
    echo "## Retarget these — they name the source project"
    echo
    awk -F'\t' '!/^#/ && NF>1 && $1=="retarget" { printf "- [ ] \`%s\`\n      %s\n", $2, $3 }' "$MANIFEST"
    echo
    echo "## Copied verbatim — no action needed"
    echo
    echo "- \`orchestration/core/\` — the method, $(find "$TARGET_CLAUDE/orchestration/core" -type f 2>/dev/null | wc -l | tr -d ' ') files, free of stack tokens by construction."
    if [ -n "$PACK" ]; then
      echo "- \`orchestration/examples/$PACK/\` — worked instances for this stack."
    else
      echo "- No examples pack was installed: there is none for \`$TARGET_STACK\` yet."
      echo "  \`orchestration/examples/README.md\` says how to write one. Until then the"
      echo "  \`examples/<stack>/...\` pointers in core/ have nothing to point at, which is"
      echo "  a visible gap rather than a wrong answer."
    fi
    echo
    echo "## Residue check"
    echo
    echo "Run this from the project root when you think phase 2 is finished:"
    echo
    echo '```bash'
    echo "grep -rEin 'npm run|nestjs|angular|sequelize|course/|curriculum|\{\{' \\"
    echo "  .claude/orchestration/ .claude/commands/ | grep -v orchestration/examples/"
    echo '```'
    echo
    echo "Every hit should be a deliberate reference to this project's own stack."
    echo "A surviving \`{{placeholder}}\` is worse than a wrong command: it looks filled in."
  } > "$TODO"
  echo
  echo "Worklist written to: ${TODO#"$TARGET_PROJECT/"}"
fi

# Unfilled markers are the worst failure mode: they read as already-filled facts.
# Report per FILE (not per marker text) so the output is actionable, and separate the
# files that are SUPPOSED to hold markers until phase 2 fills them.
#
# `{{ x }}` with padding inside the braces is NOT one of ours: every placeholder this
# tool writes is unpadded (`{{PROJECT_NAME}}`). Padded braces and `${{ ... }}` are
# Angular interpolation and GitHub Actions expressions inside worked examples --
# correct source that must not be "fixed". Measured across the whole knowledge base:
# 2 padded occurrences, both foreign syntax; 0 unpadded false positives.
markers_in() {
  { grep -oE '\$?\{\{[^}]*\}\}|\$DB_NAME' "$1" 2>/dev/null || true; } \
    | { grep -vE '^\$\{\{|^\{\{ | \}\}$' || true; }
}
if [ "$DRY_RUN" -eq 0 ]; then
  echo
  echo "unfilled markers ({{...}} / \$DB_NAME) by file:"
  # `-agent.md` anywhere, not just templates/agent-prompts/: an agent-prompt template is
  # filled per USE, not per install, and packs ship them alongside their examples.
  expected_re='meta/project-profile.md|meta/project-mission.md|templates/agent-prompts/|-agent\.md$|ADAPTATION-TODO.md'
  any=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    n=$(markers_in "$f" | wc -l | tr -d ' ')
    # NB: `[ cond ] && continue` would abort the script under `set -e` when cond is false.
    if [ "$n" = "0" ]; then continue; fi
    rel="${f#"$TARGET_CLAUDE/"}"
    if printf '%s' "$rel" | grep -qE "$expected_re"; then
      printf "  %-4s %s  (expected — a template until you fill it)\n" "$n" "$rel"
    else
      printf "  %-4s %s  <-- MUST FIX\n" "$n" "$rel"
      any=1
    fi
  done < <(find "$TARGET_CLAUDE/orchestration" "$TARGET_CLAUDE/commands" -name '*.md' 2>/dev/null | sort)
  if [ "$any" -eq 1 ]; then
    echo
    echo "  Files marked MUST FIX are not templates — a marker there reads as a real"
    echo "  value. Give it this project's value, or point at meta/project-profile.md."
  fi
fi

# ---------------------------------------------------------------- durability
# The hand-authored layer of this install (meta/project-profile.md, project-mission.md,
# the retargeted commands) is explicitly NOT regenerable. Whether it survives depends
# entirely on something we can detect in one line: is the target path tracked?
#
# In a repo that COMMITS .claude/, git already provides durability and a second
# mechanism is redundant noise. Only the gitignored case needs anything -- and that
# case is common, sometimes deliberately (a personal install nobody wants shared).
if [ "$DRY_RUN" -eq 0 ] && [ "$copied" -gt 0 ]; then
  echo
  echo "git trace:"
  # A common reason to install this is personal use inside a team that has not adopted
  # it. That only works if the install is invisible to git -- an orchestration/ tree in
  # someone's PR is a social event, not just noise. Checking one directory is not
  # enough: `.claude/*` plus `!.claude/commands/` is a widespread pattern, and the
  # negation re-exposes exactly the three command files while .claude/orchestration
  # still reports as ignored. Check every path actually written.
  if ! git -C "$TARGET_PROJECT" rev-parse --git-dir >/dev/null 2>&1; then
    echo "  not a git repo — nothing can leak."
  else
    # Every path the installer wrote, not just the ones in the manifest. The manifest
    # does not list itself, and a *.new file is by definition not in it; both used to be
    # skipped. In a repo carrying `.claude/*` plus `!.claude/commands/` that omission is
    # the difference between reporting "clean" and a stray .new turning up in a PR.
    # (Built into a file rather than a process substitution: a `#` comment inside
    # `<({ ... })` breaks bash's paren matching at RUN time, which `bash -n` does not
    # catch.)
    WROTE="$(mktemp -t orchwrote-XXXXXX)"
    register_cleanup "$WROTE"
    [ -f "$MANIFEST_FILE" ] && awk '!/^#/ && NF>1 {print $2}' "$MANIFEST_FILE" >> "$WROTE"
    [ -f "$MANIFEST_FILE" ] && echo "orchestration/.install-manifest" >> "$WROTE"
    find "$FINAL_CLAUDE" -name '*.new' 2>/dev/null | sed "s|^$FINAL_CLAUDE/||" >> "$WROTE"
    # settings.local.json only exists if --with-backup wrote hooks into it
    [ -f "$FINAL_CLAUDE/settings.local.json" ] && echo "settings.local.json" >> "$WROTE"

    exposed=""; n_checked=0
    while IFS= read -r rel; do
      [ -n "$rel" ] || continue
      n_checked=$((n_checked + 1))
      git -C "$TARGET_PROJECT" check-ignore -q -- ".claude/$rel" 2>/dev/null && continue
      exposed="$exposed .claude/$rel"
    done < "$WROTE"
    if [ -z "$exposed" ]; then
      echo "  clean — none of the $n_checked installed path(s) are visible to git."
    else
      n_exp=$(printf '%s\n' $exposed | grep -c . || true)
      echo "  $n_exp of $n_checked installed path(s) ARE visible to git and would show in a PR:"
      printf '%s\n' $exposed | sed 's/^/    /'
      echo
      echo "  To keep this install personal, add FILE patterns to your global ignore"
      echo "  (git config --global core.excludesFile), not directory patterns:"
      printf '%s\n' $exposed | sed 's/^/    /'
      echo "  A directory pattern loses to a repo's \`!.claude/commands/\` negation; a file"
      echo "  pattern does not, because the negation only ever matches the directory."
    fi
  fi

  echo
  echo "durability:"
  if ! git -C "$TARGET_PROJECT" rev-parse --git-dir >/dev/null 2>&1; then
    echo "  $TARGET_PROJECT is not a git repo — nothing to check."
  elif ! git -C "$TARGET_PROJECT" check-ignore -q .claude/orchestration 2>/dev/null; then
    echo "  .claude/orchestration is tracked by git. Durability is handled; nothing to do."
  else
    ign="$({ git -C "$TARGET_PROJECT" check-ignore -v .claude/orchestration 2>/dev/null || true; } | cut -f1)"
    echo "  .claude/orchestration is GITIGNORED (${ign:-ignored})."
    echo "  The knowledge base is not tracked, so \`git clean -xfd\` destroys it"
    echo "  silently — including project-profile.md, which is not regenerable."
    if [ "$WITH_BACKUP" -eq 1 ]; then
      SYNC_SRC="$SKILL_DIR/sync-install-backup.sh"
      SYNC_DST="$HOME/.claude/orchestration-installs/sync-install-backup.sh"
      NAME="$(basename "$TARGET_PROJECT")"
      if [ ! -f "$SYNC_SRC" ]; then
        echo "  ERROR: $SYNC_SRC missing; cannot set up the backup."
      else
        mkdir -p "$HOME/.claude/orchestration-installs"
        cp "$SYNC_SRC" "$SYNC_DST" && chmod +x "$SYNC_DST"
        echo "  installed sync script: $SYNC_DST"
        bash "$SYNC_DST" "$TARGET_PROJECT" "$NAME"
        # The sync script always exits 0 by design (a backup must never fail a
        # session), so confirm by looking at the result rather than the status.
        BK_DIR="$HOME/.claude/orchestration-installs/$NAME"
        bk_n=$({ find "$BK_DIR/orchestration" -type f 2>/dev/null || true; } | wc -l | tr -d ' ')
        if [ "${bk_n:-0}" -gt 0 ]; then
          echo "  initial backup taken: $bk_n files, git-versioned, at $BK_DIR"
        else
          echo "  WARNING: backup directory is empty — the sync did not run. See its output above."
        fi
        # Hooks go in settings.local.json: gitignored by convention, and the .local.
        # name keeps it personal if .claude/ is ever un-ignored.
        SETTINGS="$TARGET_CLAUDE/settings.local.json"
        if command -v python3 >/dev/null 2>&1; then
          SYNC_DST="$SYNC_DST" TARGET_PROJECT="$TARGET_PROJECT" NAME="$NAME" SETTINGS="$SETTINGS" python3 - <<'PY'
import json, os, pathlib
sp = pathlib.Path(os.environ["SETTINGS"])
cfg = json.loads(sp.read_text()) if sp.exists() and sp.read_text().strip() else {}
cmd = f"bash {os.environ['SYNC_DST']} {os.environ['TARGET_PROJECT']} {os.environ['NAME']}"
filt = ('jq -r ".tool_input.file_path // .tool_response.filePath // empty" '
        '| grep -qE "\\.claude/(orchestration|commands)/" && ' + cmd + ' || true')
hooks = cfg.setdefault("hooks", {})
def add(event, entry):
    arr = hooks.setdefault(event, [])
    for e in arr:
        for h in e.get("hooks", []):
            if "sync-install-backup.sh" in h.get("command", ""):
                return False
    arr.append(entry); return True
n = 0
n += add("SessionStart", {"hooks": [{"type": "command", "command": cmd, "timeout": 30, "async": True,
                                    "statusMessage": "Backing up orchestration install..."}]})
n += add("SessionEnd",   {"hooks": [{"type": "command", "command": cmd, "timeout": 30}]})
n += add("PostToolUse",  {"matcher": "Write|Edit",
                          "hooks": [{"type": "command", "command": filt, "timeout": 30, "async": True}]})
sp.write_text(json.dumps(cfg, indent=2) + "\n")
print(f"  wrote {n} hook(s) to {sp}" if n else f"  hooks already present in {sp}")
PY
          echo "  triggers: PostToolUse (KB edits) + SessionStart/SessionEnd (Bash-driven"
          echo "            edits and crashed sessions bypass PostToolUse entirely)."
          echo "  NOT backed up: .claude/workspace/ — per-repo scratch, different lifetime."
        else
          echo "  python3 not found; add the hooks by hand — see sync-install-backup.sh header."
        fi
      fi
    else
      echo "  Re-run with --with-backup to set up a git-versioned backup plus hooks that"
      echo "  keep it current. Left alone otherwise: writing hooks changes runtime"
      echo "  behaviour for every session in that repo, so it is opt-in."
    fi
  fi
fi

if [ "$DRY_RUN" -eq 0 ] && [ "$copied" -gt 0 ]; then
  echo
  echo "Commands now available in $TARGET_PROJECT: /orchestration, /handoff, /validate"
  echo "Restart Claude Code there to pick them up — but finish phase 2 first."
fi
