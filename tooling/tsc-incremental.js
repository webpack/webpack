/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// `lint:types*`: `tsc --incremental`, with one build-info file per installed
// dependency set. Usage: node tooling/tsc-incremental.js <name> [tsc args...]

const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);

const root = path.resolve(__dirname, "..");
const cacheDir = path.join(root, "node_modules/.cache/tsc");

// WHY: an incremental build never retries a package import it once failed to
// resolve, nor re-resolves one after an install, so a build-info file is only
// reused while yarn's integrity record (rewritten by every install) matches.
const INSTALL_STATE_FILES = ["node_modules/.yarn-integrity", "yarn.lock"];

/**
 * @returns {Promise<string>} short hash of the installed dependency set
 */
const hashInstallState = async () => {
	const hash = crypto.createHash("sha256");
	for (const file of INSTALL_STATE_FILES) {
		try {
			hash.update(await readFile(path.join(root, file)));
		} catch (err) {
			if (/** @type {NodeJS.ErrnoException} */ (err).code !== "ENOENT") {
				throw err;
			}
		}
	}
	return hash.digest("hex").slice(0, 16);
};

/**
 * @param {string} name build-info name of the project
 * @param {string[]} tscArgs extra arguments for `tsc`
 * @returns {Promise<number>} exit code of `tsc`
 */
const run = async (name, tscArgs) => {
	const buildInfoFile = `${name}-${await hashInstallState()}.tsbuildinfo`;
	await mkdir(cacheDir, { recursive: true });
	const staleFile = new RegExp(`^${name}-[0-9a-f]{16}\\.tsbuildinfo$`);
	await Promise.all(
		(await readdir(cacheDir))
			.filter((file) => staleFile.test(file) && file !== buildInfoFile)
			.map((file) => unlink(path.join(cacheDir, file)))
	);
	return new Promise((resolve, reject) => {
		const child = spawn(
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
		child.on("error", reject);
		child.on("close", (code) => resolve(code === null ? 1 : code));
	});
};

const [name, ...tscArgs] = process.argv.slice(2);
if (!name) {
	throw new Error(
		"Usage: node tooling/tsc-incremental.js <name> [tsc args...]"
	);
}

run(name, tscArgs).then(
	(code) => {
		process.exitCode = code;
	},
	(err) => {
		console.error(err);
		process.exitCode = 1;
	}
);
