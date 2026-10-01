/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// `lint:types*`: `tsc --incremental`, with one build-info file per installed
// dependency set. Usage: node tooling/tsc-incremental.js <name> [tsc args...]
// `--all` runs every `lint:types*` script using this file in parallel.

const { spawn, spawnSync } = require("child_process");
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

/**
 * @param {string} name build-info name of the project
 * @param {string[]} tscArgs extra arguments for `tsc`
 * @returns {string[]} arguments for `node` running an incremental `tsc`
 */
const getTscArgs = (name, tscArgs) => {
	const buildInfoFile = `${name}-${hashInstallState()}.tsbuildinfo`;
	fs.mkdirSync(cacheDir, { recursive: true });
	const staleFile = new RegExp(`^${name}-[0-9a-f]{16}\\.tsbuildinfo$`);
	for (const file of fs.readdirSync(cacheDir)) {
		if (staleFile.test(file) && file !== buildInfoFile) {
			fs.unlinkSync(path.join(cacheDir, file));
		}
	}
	return [
		require.resolve("typescript/bin/tsc"),
		"--incremental",
		"--tsBuildInfoFile",
		path.join(cacheDir, buildInfoFile),
		...tscArgs
	];
};

/**
 * @returns {string[][]} `[name, ...tscArgs]` of every `lint:types*` script using this file
 */
const getProjects = () => {
	/** @type {Record<string, string>} */
	const scripts = require("../package.json").scripts;

	const command = `node tooling/${path.basename(__filename)} `;
	return Object.keys(scripts)
		.filter((script) => script.startsWith("lint:types"))
		.map((script) => scripts[script])
		.filter((value) => value.startsWith(command))
		.map((value) => value.slice(command.length).split(" "))
		.filter(([name]) => name !== "--all");
};

/**
 * @param {string[][]} projects `[name, ...tscArgs]` of each project
 * @returns {Promise<number>} the highest exit code of the `tsc` runs
 */
const runAll = (projects) =>
	Promise.all(
		projects.map(
			([name, ...tscArgs]) =>
				new Promise((resolve, reject) => {
					const child = spawn(process.execPath, getTscArgs(name, tscArgs), {
						cwd: root
					});
					/** @type {Buffer[]} */
					const output = [];
					child.stdout.on("data", (chunk) => output.push(chunk));
					child.stderr.on("data", (chunk) => output.push(chunk));
					child.on("error", reject);
					child.on("close", (code) => {
						// Each project's output is printed whole, so runs never interleave.
						process.stdout.write(`$ tsc ${name}\n${Buffer.concat(output)}`);
						resolve(code === null ? 1 : code);
					});
				})
		)
	).then((codes) => Math.max(0, ...codes));

const [name, ...tscArgs] = process.argv.slice(2);
if (!name) {
	throw new Error(
		"Usage: node tooling/tsc-incremental.js <name> [tsc args...] | --all"
	);
}

if (name === "--all") {
	runAll(getProjects()).then(
		(code) => {
			process.exitCode = code;
		},
		(err) => {
			console.error(err);
			process.exitCode = 1;
		}
	);
} else {
	const { status, error } = spawnSync(
		process.execPath,
		getTscArgs(name, tscArgs),
		{ cwd: root, stdio: "inherit" }
	);
	if (error) throw error;
	process.exitCode = status === null ? 1 : status;
}
