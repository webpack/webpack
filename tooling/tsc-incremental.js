/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// `lint:types*`: `tsc --incremental`, with one build-info file per installed
// dependency set. Usage: node tooling/tsc-incremental.js <name> [tsc args...]

const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const cacheDir = path.join(root, "node_modules/.cache/tsc");

// WHY: an incremental build never retries a package import it once failed to
// resolve, nor re-resolves one after an install, so a build-info file is only
// reused while yarn's integrity record (rewritten by every install) matches.
const INSTALL_STATE_FILES = ["node_modules/.yarn-integrity", "yarn.lock"];

/**
 * @returns {string} short hash of the installed dependency set
 */
const hashInstallState = () => {
	const hash = crypto.createHash("sha256");
	for (const file of INSTALL_STATE_FILES) {
		const filePath = path.join(root, file);
		if (fs.existsSync(filePath)) hash.update(fs.readFileSync(filePath));
	}
	return hash.digest("hex").slice(0, 16);
};

const [name, ...tscArgs] = process.argv.slice(2);
if (!name) {
	throw new Error(
		"Usage: node tooling/tsc-incremental.js <name> [tsc args...]"
	);
}

const buildInfoFile = `${name}-${hashInstallState()}.tsbuildinfo`;
fs.mkdirSync(cacheDir, { recursive: true });
const staleFile = new RegExp(`^${name}-[0-9a-f]{16}\\.tsbuildinfo$`);
for (const file of fs.readdirSync(cacheDir)) {
	if (staleFile.test(file) && file !== buildInfoFile) {
		fs.unlinkSync(path.join(cacheDir, file));
	}
}

const { status, error } = spawnSync(
	process.execPath,
	[
		require.resolve("typescript/bin/tsc"),
		"--incremental",
		"--tsBuildInfoFile",
		path.join(cacheDir, buildInfoFile),
		...tscArgs
	],
	{ cwd: root, stdio: "inherit" }
);
if (error) throw error;
process.exitCode = status === null ? 1 : status;
