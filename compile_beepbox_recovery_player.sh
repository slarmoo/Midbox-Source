#!/bin/bash
set -e

# Compile recovery_player/main.ts into build/recovery_player/main.js and dependencies
npx tsc -p tsconfig_recovery_player.json

# Combine build/recovery_player/main.js and dependencies into website/recovery_player/beepbox_recovery_player.js
npx rollup build/recovery_player/main.js \
	--file website/recovery_player/beepbox_recovery_player.js \
	--format iife \
	--output.name beepbox \
	--context exports \
	--sourcemap \
	--plugin rollup-plugin-sourcemaps \
	--plugin @rollup/plugin-node-resolve

# Minify website/recovery_player/beepbox_recovery_player.js into website/recovery_player/beepbox_recovery_player.min.js
npx terser \
	website/recovery_player/beepbox_recovery_player.js \
	--source-map "content='website/recovery_player/beepbox_recovery_player.js.map',url=beepbox_recovery_player.min.js.map" \
	-o website/recovery_player/beepbox_recovery_player.min.js \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;"
