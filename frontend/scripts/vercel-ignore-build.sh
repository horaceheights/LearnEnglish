#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" for the SpanGlish web app.
#
# Set it in Project Settings -> Git -> Ignored Build Step as:
#     bash scripts/vercel-ignore-build.sh
# The command runs from the project's Root Directory (frontend/), which is why
# the path has no frontend/ prefix; the script then moves to the repository root
# so the watched paths below read the same either way.
#
# Vercel inverts the usual exit convention:
#     exit 0 -> SKIP the build
#     exit 1 -> RUN the build
# Every uncertain case here exits 1. A needless build costs a few minutes of
# deployment storage; a wrongly skipped one silently leaves the site stale.
#
# Why this exists: the repository holds four deliverables (web, mobile, Python
# backend, lesson authoring) and every push to any of them was producing a web
# deployment -- about 22 per day, each one stored for the full retention window.
# Only frontend/ and the part of mobile/src/ that frontend imports can change
# what this app serves.

set -uo pipefail

build() { echo "vercel-ignore-build: $1 -> BUILD"; exit 1; }
skip()  { echo "vercel-ignore-build: $1 -> skip";  exit 0; }

root="$(git rev-parse --show-toplevel 2>/dev/null)" || build "not a git checkout"
cd "$root" || build "cannot enter repository root"

# frontend/ is the app. mobile/src/ holds the modules it imports across the
# directory boundary -- lessonMistakeHints, sentenceConstruction and
# pageCurlGeometry, plus their local dependencies (types, sentenceTranslations).
# It is watched whole rather than file-by-file so that a new shared import does
# not silently stop triggering builds.
WATCHED=(frontend mobile/src)

# Compare against the last commit Vercel actually deployed for this branch, not
# against HEAD^. A push carrying several commits must be judged as a whole: if
# it ends with a backend-only commit, HEAD^ would hide frontend changes made
# earlier in the same push and the deployment would be skipped incorrectly.
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ] || ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  base="$(git rev-parse --verify --quiet 'HEAD^' || true)"
fi

[ -n "$base" ] || build "no usable base commit (first deployment or shallow clone)"

# A redeploy of the same commit produces an empty diff that would otherwise read
# as "nothing changed". Someone asking for that build wants it.
[ "$base" = "$(git rev-parse HEAD)" ] && build "redeploy of the same commit"

# --quiet exits 0 when nothing under the watched paths differs, which is exactly
# the skip condition. Any other exit code, including a git error, means build.
if git diff --quiet "$base" HEAD -- "${WATCHED[@]}" 2>/dev/null; then
  skip "no changes under ${WATCHED[*]} since ${base:0:7}"
fi

build "changes under ${WATCHED[*]} since ${base:0:7}"
