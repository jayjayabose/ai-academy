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

usage() {
  cat <<'USAGE'
Usage: install.sh [TARGET_PROJECT] [--profile NAME] [--force] [--dry-run]

Copies the orchestration slash commands and their knowledge base into
TARGET_PROJECT/.claude/ (defaults to the current directory).

  --profile NAME  apply a stack profile from profiles/NAME/ after copying:
                  mechanical command swaps + pre-adapted file overlay.
                  Available: rails
  --force         overwrite files that already exist in the target
  --dry-run       print what would happen, change nothing

Override the source with AI_ACADEMY_CLAUDE=/path/to/ai-academy/.claude
USAGE
}

expect_profile=0
for arg in "$@"; do
  if [ "$expect_profile" -eq 1 ]; then PROFILE="$arg"; expect_profile=0; continue; fi
  case "$arg" in
    --force)      FORCE=1 ;;
    --dry-run)    DRY_RUN=1 ;;
    --profile)    expect_profile=1 ;;
    --profile=*)  PROFILE="${arg#--profile=}" ;;
    -h|--help)    usage; exit 0 ;;
    -*)           echo "unknown option: $arg" >&2; usage >&2; exit 2 ;;
    *)            TARGET_PROJECT="$arg" ;;
  esac
done
if [ "$expect_profile" -eq 1 ]; then
  echo "error: --profile needs a name" >&2; exit 2
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

MANIFEST="$SKILL_DIR/manifest.tsv"

# tier_of <path-relative-to-.claude> -> generate|adapt|adapt-light|portable|unknown
tier_of() {
  awk -F'\t' -v want="$1" '!/^#/ && NF>1 && $3==want {print $1; found=1; exit} END{if(!found) print "unknown"}' "$MANIFEST"
}

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

echo "source: $SOURCE_CLAUDE"
echo "target: $TARGET_CLAUDE"
[ "$DRY_RUN" -eq 1 ] && echo "mode:   DRY RUN (no changes)"
[ "$FORCE" -eq 1 ] && echo "mode:   FORCE (existing files overwritten)"
[ -n "$PROFILE" ] && echo "profile: $PROFILE ($PROFILE_DIR)"
echo

copied=0
skipped=0
to_generate=0
adapt_heavy=""
adapt_light=""
generate_list=""

# copy_one <relative-path-from-source>
copy_one() {
  local rel="$1"
  local from="$SOURCE_CLAUDE/$rel"
  local to="$TARGET_CLAUDE/$rel"
  local tier
  tier="$(tier_of "$rel")"

  # `generate` files are 100% source-project-specific: copying them would plant
  # wrong facts in the target. They get authored fresh in phase 2 instead.
  if [ "$tier" = "generate" ]; then
    echo "  GEN     $rel (not copied — authored for this project in phase 2)"
    to_generate=$((to_generate + 1))
    generate_list="$generate_list$rel"$'\n'
    return
  fi

  case "$tier" in
    adapt)       adapt_heavy="$adapt_heavy$rel"$'\n' ;;
    adapt-light) adapt_light="$adapt_light$rel"$'\n' ;;
    unknown)     echo "  WARN    $rel is not in manifest.tsv — classify it" >&2 ;;
  esac

  if [ -e "$to" ] && [ "$FORCE" -eq 0 ]; then
    if cmp -s "$from" "$to"; then
      echo "  same    $rel"
    else
      echo "  SKIP    $rel (exists — use --force to overwrite)"
      skipped=$((skipped + 1))
    fi
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
    if [ -e "$TARGET_CLAUDE/orchestration/COMMANDS.md" ] && [ "$FORCE" -eq 0 ]; then
      echo "  SKIP    orchestration/COMMANDS.md (exists)"
      skipped=$((skipped + 1))
    else
      echo "  copy    orchestration/COMMANDS.md (was commands/README.md)"
      copied=$((copied + 1))
      if [ "$DRY_RUN" -eq 0 ]; then
        mkdir -p "$TARGET_CLAUDE/orchestration"
        cp "$f" "$TARGET_CLAUDE/orchestration/COMMANDS.md"
      fi
    fi
    continue
  fi
  copy_one "commands/$base"
done < <(find "$SOURCE_CLAUDE/commands" -maxdepth 1 -name '*.md' | sort)

echo
echo "knowledge base:"
while IFS= read -r f; do
  copy_one "orchestration/${f#"$SOURCE_CLAUDE/orchestration/"}"
done < <(find "$SOURCE_CLAUDE/orchestration" -type f | sort)

subbed=0
overlaid=0
removed=0

if [ -n "$PROFILE" ]; then
  echo
  echo "profile: mechanical substitutions"
  SED_FILE="$PROFILE_DIR/substitutions.sed"
  if [ -f "$SED_FILE" ]; then
    while IFS= read -r rel; do
      [ -n "$rel" ] || continue
      f="$TARGET_CLAUDE/$rel"
      # dry run copied nothing, so preview against the source instead
      [ "$DRY_RUN" -eq 1 ] && f="$SOURCE_CLAUDE/$rel"
      [ -f "$f" ] || continue
      if [ "$DRY_RUN" -eq 1 ]; then
        # count would-be changes without writing
        if ! sed -f "$SED_FILE" "$f" 2>/dev/null | cmp -s - "$f"; then
          echo "  sub     $rel"
          subbed=$((subbed + 1))
        fi
      else
        tmp="$f.sedtmp"
        if sed -f "$SED_FILE" "$f" > "$tmp" 2>/dev/null; then
          if cmp -s "$tmp" "$f"; then rm -f "$tmp"; else
            mv "$tmp" "$f"; echo "  sub     $rel"; subbed=$((subbed + 1))
          fi
        else
          rm -f "$tmp"; echo "  WARN    sed failed on $rel" >&2
        fi
      fi
    done < <(awk -F'\t' '!/^#/ && NF>1 && ($1=="adapt" || $1=="adapt-light") {print $3}' "$MANIFEST")
  else
    echo "  (no substitutions.sed in profile)"
  fi

  echo
  echo "profile: pre-adapted file overlay"
  if [ -d "$PROFILE_DIR/files" ]; then
    while IFS= read -r src; do
      rel="${src#"$PROFILE_DIR/files/"}"
      echo "  overlay $rel"
      overlaid=$((overlaid + 1))
      [ "$DRY_RUN" -eq 1 ] && continue
      mkdir -p "$(dirname "$TARGET_CLAUDE/$rel")"
      cp "$src" "$TARGET_CLAUDE/$rel"
    done < <(find "$PROFILE_DIR/files" -type f | sort)
  fi

  if [ -f "$PROFILE_DIR/remove.txt" ]; then
    while IFS= read -r rel; do
      case "$rel" in ''|\#*) continue ;; esac
      probe="$TARGET_CLAUDE/$rel"
      [ "$DRY_RUN" -eq 1 ] && probe="$SOURCE_CLAUDE/$rel"
      if [ -f "$probe" ]; then
        echo "  remove  $rel (superseded by this profile)"
        removed=$((removed + 1))
        [ "$DRY_RUN" -eq 0 ] && rm -f "$TARGET_CLAUDE/$rel"
      fi
    done < "$PROFILE_DIR/remove.txt"
  fi
fi

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

echo
echo "$copied copied, $skipped skipped, $to_generate to author from scratch."
[ -n "$PROFILE" ] && echo "profile '$PROFILE': $subbed substituted, $overlaid overlaid, $removed removed."

n_heavy=$(printf '%s' "$adapt_heavy" | grep -c . || true)
n_light=$(printf '%s' "$adapt_light" | grep -c . || true)
if [ -n "$PROFILE" ] && [ -f "$PROFILE_DIR/manifest-overrides.tsv" ]; then
  n_heavy=$(awk -F'\t' '!/^#/ && NF>1 && $1=="adapt"' "$PROFILE_DIR/manifest-overrides.tsv" | wc -l | tr -d ' ')
  n_light=$(awk -F'\t' '!/^#/ && NF>1 && $1=="adapt-light"' "$PROFILE_DIR/manifest-overrides.tsv" | wc -l | tr -d ' ')
  to_generate=$(awk -F'\t' '!/^#/ && NF>1 && $1=="generate"' "$PROFILE_DIR/manifest-overrides.tsv" | wc -l | tr -d ' ')
fi

echo
echo "=============================================================="
echo "PHASE 1 (copy) done. PHASE 2 (adapt) is NOT done."
echo "=============================================================="
echo "The knowledge base was written against this source project's stack."
echo "Until phase 2 runs, agents in $TARGET_PROJECT will be told to run"
echo "commands that may not exist here."
echo
echo "  $to_generate file(s) to author from scratch"
echo "  $n_heavy file(s) needing example/command rewrites"
echo "  $n_light file(s) needing light command + path fixes"

if [ "$DRY_RUN" -eq 0 ]; then
  TODO="$TARGET_CLAUDE/orchestration/ADAPTATION-TODO.md"

  # Effective manifest = base rows, with profile rows replacing same-path rows.
  EFF="$(mktemp -t effmanifest-XXXXXX)"
  trap 'rm -f "$EFF"' EXIT
  OVR="$PROFILE_DIR/manifest-overrides.tsv"
  if [ -n "$PROFILE" ] && [ -f "$OVR" ]; then
    awk -F'\t' -v ovr="$OVR" '
      BEGIN { while ((getline line < ovr) > 0) {
                if (line ~ /^#/) continue
                n = split(line, a, "\t"); if (n < 2) continue
                seen[a[3]] = 1
              } }
      !/^#/ && NF>1 { if (!($3 in seen)) print }
    ' "$MANIFEST" > "$EFF"
    grep -v '^#' "$OVR" | awk -F'\t' 'NF>1' >> "$EFF"
  else
    grep -v '^#' "$MANIFEST" | awk -F'\t' 'NF>1' > "$EFF"
  fi
  {
    echo "# Adaptation TODO"
    echo
    echo "\`/install-orchestration\` copied the knowledge base into this project but has"
    echo "not yet rewritten the project-specific parts. Work the list top-down; each"
    echo "priority tier depends on the one above it. Delete this file when done."
    echo
    echo "Run \`detect-stack.sh .\` from the skill directory for the project facts."
    echo
    if [ -n "$PROFILE" ]; then
      echo "Profile **$PROFILE** was applied: $subbed file(s) had commands substituted,"
      echo "$overlaid file(s) were replaced with pre-adapted versions, $removed removed."
      echo "The list below is what the profile could NOT do for you."
      echo
    fi
    for pri in 1 2 3; do
      label=""
      case "$pri" in
        1) label="Priority 1 — do first; everything else references these" ;;
        2) label="Priority 2 — rewrite the worked examples and commands" ;;
        3) label="Priority 3 — light command, path and framing fixes" ;;
      esac
      echo "## $label"
      echo
      awk -F'\t' -v p="$pri" '!/^#/ && NF>1 && $2==p {
        printf "- [ ] **%s** — `%s`\n      %s\n", $1, $3, $4
      }' "$EFF"
      echo
    done
    if grep -q '^done	' "$EFF" 2>/dev/null; then
      echo "## Already handled by the \`$PROFILE\` profile — verify, don't rewrite"
      echo
      awk -F'\t' '!/^#/ && NF>1 && $1=="done" { printf "- [x] `%s`\n      %s\n", $3, $4 }' "$EFF"
      echo
    fi
    echo "## Copied verbatim — no action needed"
    echo
    awk -F'\t' '!/^#/ && NF>1 && $1=="portable" { printf "- `%s`\n", $3 }' "$EFF"
    echo
    echo "## Residue check"
    echo
    echo "Run this from the project root when you think phase 2 is finished:"
    echo
    echo '```bash'
    echo "grep -rEin 'nestjs|sequelize|angular|npm run|new_crm|jest|vitest|tsconfig|typescript|\{\{' \\"
    echo "  .claude/orchestration/ .claude/commands/ | grep -v 'Playwright MCP'"
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
if [ "$DRY_RUN" -eq 0 ]; then
  echo
  echo "unfilled markers ({{...}} / \$DB_NAME) by file:"
  expected_re='meta/project-profile.md|meta/project-mission.md|templates/agent-prompts/|ADAPTATION-TODO.md'
  any=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    # -E: BSD grep does not support the GNU \| alternation in BRE.
    # `|| true`: grep exits 1 on no match, which under `set -o pipefail` would fail
    # the whole command substitution and abort the script.
    n=$({ grep -oE '\{\{[^}]*\}\}|\$DB_NAME' "$f" 2>/dev/null || true; } | wc -l | tr -d ' ')
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

if [ "$DRY_RUN" -eq 0 ] && [ "$copied" -gt 0 ]; then
  echo
  echo "Commands now available in $TARGET_PROJECT: /orchestration, /handoff, /validate"
  echo "Restart Claude Code there to pick them up — but finish phase 2 first."
fi
