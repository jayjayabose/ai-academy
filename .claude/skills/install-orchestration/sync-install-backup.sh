#!/usr/bin/env bash
# Mirror a gitignored orchestration install into a git-versioned backup.
#
# Usage: sync-install-backup.sh <repo-root> [install-name]
#        install-name defaults to the basename of <repo-root>.
#
# WHY THIS EXISTS
#   install.sh writes a hand-authored knowledge base into <repo>/.claude/. When that
#   path is gitignored -- common, and often deliberate for a personal install -- the
#   irreplaceable part (meta/project-profile.md, meta/project-mission.md, the retargeted
#   commands) has no durability story at all. `git clean -xfd` destroys it silently.
#
# WHAT IT COPIES
#   orchestration/, commands/{orchestration,validate,handoff}.md, and
#   settings.local.json. NOT workspace/ -- that is per-repo scratch (execution plans,
#   agent logs, retrospectives), not install state, and it has a different lifetime.
#
#   settings.local.json holds the three hooks that drive THIS script. It is gitignored
#   like everything else here, so `git clean -xfd` deletes it too -- and without it the
#   backup silently stops updating, which is the one failure a backup must not have.
#   Restoring the knowledge base while leaving the hooks dead looks like a full recovery
#   and is not one. Note the file contains absolute paths to this repo and this $HOME, so
#   it restores correctly to the same location and needs regenerating elsewhere
#   (`install.sh <repo> --with-backup`).
#
# WHY A BOUNDARY TRIGGER, NOT A FILE-EDIT HOOK
#   A PostToolUse hook on Write|Edit looks more precise and is strictly less reliable:
#   edits driven through Bash (sed, a python heredoc, install.sh itself) never fire it,
#   and neither do edits made outside Claude Code. rsync already computes "did anything
#   change", so running on a lifecycle boundary and committing only on a real difference
#   gives on-change semantics with no coverage holes.
#
# Prints {"systemMessage": ...} when it acts (the Claude Code hook contract), silent
# otherwise. ALWAYS exits 0 -- a backup must never fail the session it runs in.

set -uo pipefail

REPO="${1:?usage: sync-install-backup.sh <repo-root> [install-name]}"
[ -d "$REPO" ] || { echo "not a directory: $REPO" >&2; exit 0; }
REPO="$(cd "$REPO" && pwd)"
NAME="${2:-$(basename "$REPO")}"
SRC="$REPO/.claude"
BK="${ORCHESTRATION_BACKUP_ROOT:-$HOME/.claude/orchestration-installs}/$NAME"

msg() {
  if command -v python3 >/dev/null 2>&1; then
    printf '{"systemMessage": %s}\n' "$(printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
  else
    printf '%s\n' "$1"
  fi
}

[ -d "$SRC/orchestration" ] || { msg "orchestration backup: no install at $SRC/orchestration — skipped"; exit 0; }

# --- Health guard ----------------------------------------------------------------
# Never mirror a destroyed install over a good backup. Without this, `git clean -xfd`
# plus one session start replicates the emptiness and the backup is gone too. With it,
# the disaster becomes the alert.
# The guard exists to protect an EXISTING backup. On a first run there is nothing to
# lose, and meta/project-profile.md legitimately does not exist yet -- it is authored in
# phase 2 (or shipped by a profile). Gating a fresh install on it aborts every
# profile-less install, which is how this was found.
SRC_COUNT=$({ find "$SRC/orchestration" -type f 2>/dev/null || true; } | wc -l | tr -d ' ')
BK_COUNT=$({ find "$BK/orchestration" -type f 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "${BK_COUNT:-0}" -gt 0 ]; then
  if [ "${SRC_COUNT:-0}" -lt 30 ]; then
    msg "orchestration backup ABORTED — the install at $SRC/orchestration has only ${SRC_COUNT:-0} files (expected 30+), so it looks damaged. The $BK_COUNT-file backup at $BK was NOT touched. Restore with: cp -R '$BK/orchestration' '$BK/commands' '$SRC/' && cp '$BK/settings.local.json' '$SRC/' 2>/dev/null"
    exit 0
  fi
  if [ -f "$BK/orchestration/meta/project-profile.md" ] && [ ! -f "$SRC/orchestration/meta/project-profile.md" ]; then
    msg "orchestration backup ABORTED — the backup has meta/project-profile.md but the install no longer does. That file is not regenerable, so the mirror would destroy it. $BK was NOT touched. Restore with: cp -R '$BK/orchestration' '$BK/commands' '$SRC/' && cp '$BK/settings.local.json' '$SRC/' 2>/dev/null"
    exit 0
  fi
fi

mkdir -p "$BK" 2>/dev/null || { msg "orchestration backup: cannot create $BK"; exit 0; }

# --- First run: git-versioned, so every sync is recoverable ----------------------
# Not date-stamped directories: on a per-change trigger those multiply without bound
# and need a pruning policy. Git keeps history compressed in one place, and the working
# tree stays a plain directory so `cp -R` restore instructions keep working.
if [ ! -d "$BK/.git" ]; then
  git -C "$BK" init -q 2>/dev/null || { msg "orchestration backup: git init failed in $BK"; exit 0; }
  printf '%s\n' '.DS_Store' > "$BK/.gitignore"
  git -C "$BK" add -A >/dev/null 2>&1
  git -C "$BK" -c user.name='orchestration-sync' -c user.email='orchestration-sync@localhost' \
      commit -q -m "pre-sync state of the $NAME install" >/dev/null 2>&1
fi

# --- Mirror ----------------------------------------------------------------------
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$SRC/orchestration/" "$BK/orchestration/" 2>/dev/null
else
  rm -rf "$BK/orchestration" 2>/dev/null; cp -R "$SRC/orchestration" "$BK/orchestration" 2>/dev/null
fi
mkdir -p "$BK/commands"
for f in orchestration validate handoff; do
  [ -f "$SRC/commands/$f.md" ] && cp "$SRC/commands/$f.md" "$BK/commands/$f.md"
done
# Deliberately copy-if-present and never delete: if the source has no
# settings.local.json but the backup does, that is either an opt-out or the very
# disaster this exists for, and keeping the copy is right in both readings. A missing
# hooks file is not itself a damage signal -- `git clean -xfd` also empties
# orchestration/, which the health guard above already catches.
[ -f "$SRC/settings.local.json" ] && cp "$SRC/settings.local.json" "$BK/settings.local.json"


# --- Commit only on a real difference --------------------------------------------
CHANGED=$({ git -C "$BK" status --porcelain --untracked-files=all 2>/dev/null || true; } | wc -l | tr -d ' ')
[ "${CHANGED:-0}" -eq 0 ] && exit 0

FILES=$(git -C "$BK" status --porcelain --untracked-files=all | awk '{print $NF}' | sed "s|^orchestration/||" \
        | paste -sd',' - | sed 's/,/, /g' | cut -c1-140 | sed 's/, [^,]*$/, .../')
git -C "$BK" add -A >/dev/null 2>&1
git -C "$BK" -c user.name='orchestration-sync' -c user.email='orchestration-sync@localhost' \
    commit -q -m "sync $(date '+%Y-%m-%d %H:%M') — $CHANGED file(s): $FILES" >/dev/null 2>&1

msg "orchestration backup: $CHANGED file(s) synced to $BK ($FILES)"
exit 0
