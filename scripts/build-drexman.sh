#!/bin/zsh
# Builds Drexman (our jevman fork, branch "drexman") into ../drexman as a static page that plays a recorded Drex game,
# and ships the fork's source next to it, as AGPL-3.0 asks for a modified version people use over a network.
# Run: scripts/build-drexman.sh /path/to/jevman [recording.json]
set -e
ARCADE="${0:A:h:h}"
JEV="${1:?path to the jevman fork}"
cd "$JEV"
[[ -n "$2" ]] && cp "$2" public/demo/drex-max.json
VITE_STATIC=1 npx vite build --outDir "$ARCADE/drexman" --emptyOutDir
rm -f "$ARCADE/drexman/og.png" "$ARCADE/drexman/og-leaderboard.png" "$ARCADE/drexman/demo/jev-demo.json"
git archive --format=tar.gz --prefix=drexman/ -o "$ARCADE/drexman/source.tar.gz" HEAD
echo "built $ARCADE/drexman from $(git rev-parse --short HEAD)"
