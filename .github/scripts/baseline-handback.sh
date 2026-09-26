#!/usr/bin/env bash
# The CI baseline hand-back (roadmap P3-3, P3-4): after a snapshot run, stage the baselines that run recorded, and only
# those, for upload as an artifact, or refuse to. It is one script for both stacks, because the two halves of a
# component land together and must hand back the same way. ci.yml's `apple` job runs it over the SwiftUI baselines and
# `web-vrt` runs it over the Playwright ones, after every run but the one a person asks to re-record. In compare mode
# both suites write a baseline only where none exists, and each records its whole set only when its folder holds no
# baseline at all, so neither can write over a committed one.
#
# The exception is the sanctioned re-record, one `workflow_dispatch` input per stack, each named for the artifact it
# hands back: `update-vrt-baselines` (web-vrt, `vrt-baselines`) and `update-snapshot-baselines-apple` (apple,
# `snapshot-baselines-apple`). It is the one way to change a committed baseline on purpose, on either stack: the run
# records over the committed set (apple the whole folder, whose renders are byte-stable; web-vrt only the baselines that
# fail comparison, and any that are missing, with --update-snapshots=changed), skips this script, uploads the folder
# whole and fails, and whoever dispatched it unpacks the artifact over the folder and commits what git reports as
# changed, so review sees changed baselines and never a deletion. Push and pull_request runs cannot reach it: the
# inputs exist only on a dispatch, and both default to off. So everything this script is given comes from a run that
# compares, or from one that records only because its folder is empty.
#
# The suite's exit code does not decide what may leave. Git does, together with the commit the change is measured
# against (BASE):
#
#   `??`, not in BASE     in no commit, so the suite took its no-baseline branch and rendered one that did not exist.
#                         That is a recording. It is staged, handed back, and the run stays red, so that someone looks
#                         at the image before it becomes the reference.
#   `??`, in BASE         the change deleted a baseline and the run recorded it again. A changed render would reach the
#                         artifact that way and look exactly like a new component's recording, so it is refused. A
#                         deleted baseline is the one case the matrix's own tests cannot see:
#                         `everyCommittedBaselineBelongsToTheMatrix` looks only for PNGs the matrix does not render.
#   anything else         ` M`, ` D` and the rest: a committed baseline was written over or removed. No run this script
#                         is given has a code path that does this (the re-record that does is never given to it), so
#                         it is refused.
#   `??`, not a baseline  anything but a PNG or `provenance.json`. The artifact unpacks straight over the folder, so it
#                         is refused.
#
# Two known limits. In each, a render that changed still reaches the artifact labelled as a recording. Each needs a
# deletion that review sees, and neither turns the run green, because a run that stages anything exits 1. The check on
# both is the person who reviews the hand-back:
#
#   a deletion older      The script sees what changed between BASE and the checkout, and nothing before BASE. On a
#   than BASE             push, BASE is the commit the push moved the branch from, so a baseline deleted by an earlier
#                         push (whose own run refused the re-recording under the second rule above, if that run got as far as the hand-back — it does not when the push leaves `contracts` red) is not in the next
#                         run's BASE, and that run stages the path as new. Pushes land on the default branch, so every
#                         later run measured against it does the same: the next push, a pull request, workflow_dispatch.
#   a rename              A change that renames an example, a component or a forced-state variant deletes the old
#                         baseline, and the run records the new path. That path is in no commit, so it is staged as
#                         new: the script looks each recorded path up in BASE and never pairs it with a deletion.
#
# So before committing a hand-back, run these from the repository root, in a full clone, for each file it holds (its
# path under BASELINES) and for each component folder it touches. Whatever they print is a deletion to compare the new
# image with (`git show <commit>^:<path>`), and the new image is not a new baseline until that comparison says so.
# `--no-renames` is not optional: git log detects renames by default, and a rename is status R, which
# `--diff-filter=D` leaves out.
#
#   git log --no-renames --diff-filter=D --format='%h %ad %s' --date=short -- "$BASELINES/<path>"
#       the commit that deleted this very path, if one did: the first limit.
#   git log --no-renames --diff-filter=D --name-only --format='%h %ad %s' --date=short -- "$BASELINES/<Component>/"
#       every baseline ever deleted from that folder, which is where a rename's old path shows up: the second.
#
# Every problem found is reported, not only the first. `recorded=true` reaches GITHUB_OUTPUT only when no check
# failed, and each failing path writes `recorded=false` and removes the staging folder. So the upload step never
# publishes files from a run this script has called untrustworthy.
#
# Environment:
#   BASELINES       the baseline folder, relative to the repository root
#   STAGING         a path outside the checkout to stage the recorded files in; it is emptied first
#   ARTIFACT        the name the upload step gives the staged files
#   DIFFS           the name of the artifact in which a failed comparison leaves its images
#   RERECORD        the workflow_dispatch input of this stack's sanctioned re-record, which the messages name as
#                   the way to change a committed baseline on purpose
#   BASE            the commit the change is measured against: the pull request's base, or the commit a push moved
#                   the branch from. It is empty, or all zeros, when the event has none (workflow_dispatch, a push
#                   that created the branch), and the default branch's tip is used instead
#   DEFAULT_BRANCH  the repository's default branch
#   GITHUB_WORKSPACE, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY  set by the runner
set -euo pipefail

: "${BASELINES:?}" "${STAGING:?}" "${ARTIFACT:?}" "${DIFFS:?}" "${RERECORD:?}" "${DEFAULT_BRANCH:?}"
: "${GITHUB_WORKSPACE:?}" "${GITHUB_OUTPUT:?}" "${GITHUB_STEP_SUMMARY:?}"
BASE=${BASE:-}

# `web-vrt` runs in a container as root, over a workspace that the runner's own user created, and actions/checkout
# adds `safe.directory` only to a temporary HOME. Without this line, git (2.43 in that image) refuses to read the
# repository: "detected dubious ownership", exit 128. HOME is /root in that job. On the macOS host, where the runner
# owns its checkout, the line is harmless.
git config --global --add safe.directory "$GITHUB_WORKSPACE"

refuse() { # refuse: the run hands back nothing
  rm -rf "$STAGING"
  echo "recorded=false" >> "$GITHUB_OUTPUT"
  exit 1
}

# The commit a `??` path is looked up in. It is only needed once something was recorded, so a green run never
# fetches. The checkout is shallow, so the commit is fetched when this clone does not have it.
resolve_base() {
  if [ -z "$BASE" ] || [ -z "${BASE//0/}" ]; then
    git fetch --no-tags --depth=1 origin "refs/heads/$DEFAULT_BRANCH" < /dev/null >&2 || return 1
    git rev-parse --verify 'FETCH_HEAD^{commit}'
    return
  fi
  if ! git cat-file -e "$BASE^{commit}" 2> /dev/null; then
    git fetch --no-tags --depth=1 origin "$BASE" < /dev/null >&2 || return 1
  fi
  git rev-parse --verify "$BASE^{commit}"
}

rm -rf "$STAGING" "$STAGING.status" "$STAGING.new"
# Into a file, not a pipe. `set -e` then fails this step if git cannot answer at all (no `.git`, because the image
# has no git and actions/checkout fell back to the API tarball), instead of the loop reading nothing and the run
# reporting that it recorded nothing.
git status --porcelain -z --untracked-files=all -- "$BASELINES" > "$STAGING.status"
: > "$STAGING.new"
untracked=0
untracked_png=0
rewritten=""
unexpected=""
# `-z` separates records with NUL, so a path with a space in it stays one record. `--untracked-files=all` lists the
# files of a new component's folder instead of collapsing them into the folder's name. Porcelain paths are relative to
# the repository root.
while IFS= read -r -d '' entry; do
  state=${entry:0:2}
  path=${entry:3}
  relative=${path#"$BASELINES/"}
  if [ "$state" != "??" ]; then
    rewritten="$rewritten  $state $relative"$'\n'
    continue
  fi
  case "$relative" in
    *.png | provenance.json)
      printf '%s\0' "$relative" >> "$STAGING.new"
      untracked=$((untracked + 1))
      case "$relative" in *.png) untracked_png=$((untracked_png + 1)) ;; esac
      ;;
    *) unexpected="$unexpected  $relative"$'\n' ;;
  esac
done < "$STAGING.status"

problems=0
recorded=0
recorded_png=0
rerecorded=""
base=""
if [ "$untracked" -gt 0 ]; then
  if base=$(resolve_base); then
    while IFS= read -r -d '' relative; do
      if git cat-file -e "$base:$BASELINES/$relative" 2> /dev/null; then
        rerecorded="$rerecorded  $relative"$'\n'
        continue
      fi
      mkdir -p "$STAGING/$(dirname "$relative")"
      cp "$BASELINES/$relative" "$STAGING/$relative"
      recorded=$((recorded + 1))
      case "$relative" in *.png) recorded_png=$((recorded_png + 1)) ;; esac
      echo "recorded $relative"
    done < "$STAGING.new"
  else
    echo "::error title=No commit to measure the recording against::This run wrote $untracked file(s) under $BASELINES that are in no commit of this checkout. Whether each one is new, or is a baseline this change deleted, is decided against ${BASE:-the tip of $DEFAULT_BRANCH}, and that commit could not be fetched. Nothing is handed back."
    problems=$((problems + 1))
  fi
fi

if [ -n "$rewritten" ]; then
  printf 'Committed baselines this run wrote over:\n%s' "$rewritten"
  echo "::error title=A committed baseline was rewritten::This run wrote over baselines that are already in the commit (listed above, with their git status). A component whose render changed has to fail its comparison, not replace its own reference, so nothing is handed back. See the '$DIFFS' artifact of this run for what it rendered. To change a committed baseline on purpose, dispatch ci with '$RERECORD', the sanctioned re-record, and commit what its '$ARTIFACT' artifact changes."
  problems=$((problems + 1))
fi
if [ -n "$rerecorded" ]; then
  printf 'Baselines that %s has, that this change deletes and that this run recorded again:\n%s' "$base" "$rerecorded"
  echo "::error title=A deleted baseline was recorded again::This change deletes baselines that the commit it is measured against ($base) has, and this run recorded them again (listed above). A render that changed would reach the hand-back that way and look exactly like a new one, so nothing is handed back. Restore them from that commit. To accept a render that changed on purpose, dispatch ci with '$RERECORD', the sanctioned re-record, and commit the new image over the baseline from its '$ARTIFACT' artifact, so that review sees a changed baseline rather than a deletion; a run that compares against the baseline shows what moved in its '$DIFFS' artifact first."
  problems=$((problems + 1))
fi
if [ -n "$unexpected" ]; then
  printf 'Under %s and not a baseline:\n%s' "$BASELINES" "$unexpected"
  echo "::error title=Something that is not a baseline::The hand-back carries baselines and nothing else, so the artifact unpacks straight over $BASELINES/. Remove these files, or teach .github/scripts/baseline-handback.sh about them."
  problems=$((problems + 1))
fi
# A baseline that git does not report (an ignore rule reaching into this folder) would be dropped here and recorded
# again by every later run. The three counts have to add up. The count is of images only: `provenance.json` is staged
# with them but is not a baseline, and `.gitkeep` is neither.
on_disk=$(find "$BASELINES" -type f -name '*.png' | wc -l | tr -d ' ')
committed=$(git ls-files -- "$BASELINES" | grep -c '\.png$' || true)
if [ "$on_disk" -ne "$((committed + untracked_png))" ]; then
  echo "::error title=Baselines git does not report::$BASELINES holds $on_disk PNGs: $committed committed and $untracked_png in no commit. A file git leaves out would be dropped by the hand-back instead of committed."
  problems=$((problems + 1))
fi
if [ "$problems" -gt 0 ]; then
  refuse
fi

if [ "$recorded" -eq 0 ]; then
  echo "recorded=false" >> "$GITHUB_OUTPUT"
  echo "Nothing recorded: every example had a committed baseline and was compared against it."
  exit 0
fi
bytes=$(find "$STAGING" -type f -exec cat {} + | wc -c | tr -d ' ')
{
  echo "### Baselines this run recorded"
  echo
  echo "$recorded file(s), $((bytes / 1024)) KiB, in the \`$ARTIFACT\` artifact of this run."
  echo
  echo "<details><summary>What it holds</summary>"
  echo
  (cd "$STAGING" && find . -type f | sed 's|^\./|- `|;s|$|`|' | sort)
  echo
  echo "</details>"
} >> "$GITHUB_STEP_SUMMARY"
echo "recorded=true" >> "$GITHUB_OUTPUT"
echo "::error title=Baselines recorded, not compared::$recorded_png baseline(s) did not exist, so this run rendered and recorded them instead of comparing. Download the '$ARTIFACT' artifact of this run ($recorded file(s)) and unpack it into $BASELINES/. It holds what this run wrote and nothing else, at the paths the files belong at. Then review the images, and check each path against git's deletions first (the two commands under \"Two known limits\" in .github/scripts/baseline-handback.sh): a path deleted earlier, or a new path beside a deleted one, is a changed render until the images show otherwise. Commit them and push; the next run compares against them."
exit 1
