/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Runs a setup command again when it fails, so a registry 503 or a dropped
// download does not red a whole job. Node builtins only: every caller runs it
// before `yarn install` has written `node_modules`.

const { spawn } = require("child_process");

const ATTEMPTS = Number(process.env.RETRY_ATTEMPTS || 3);
const DELAY = Number(process.env.RETRY_DELAY || 5000);

/**
 * Waits for the given time.
 * @param {number} ms how long to wait
 * @returns {Promise<void>} resolved once it has passed
 */
const sleep = (ms) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

/**
 * Runs the command once, with this process's streams.
 * @param {string} command the command to run
 * @param {string[]} args its arguments
 * @returns {Promise<number>} the exit code it ended with
 */
const runOnce = (command, args) =>
	new Promise((resolve, reject) => {
		// WHY: on Windows `yarn` is a `.cmd`, which CreateProcess cannot run
		// directly, so that platform needs a shell and the others do not.
		const child = spawn(command, args, {
			stdio: "inherit",
			shell: process.platform === "win32"
		});
		child.on("error", reject);
		child.on("close", (code) => resolve(code === null ? 1 : code));
	});

(async () => {
	const argv = process.argv.slice(2);
	if (argv.length === 0) {
		throw new Error("usage: node tooling/retry.js <command> [args...]");
	}
	const command = argv[0];
	const args = argv.slice(1);
	const label = argv.join(" ");
	for (let attempt = 1; ; attempt++) {
		const code = await runOnce(command, args);
		if (code === 0) return;
		if (attempt >= ATTEMPTS) {
			process.exitCode = code;
			return;
		}
		const delay = DELAY * 2 ** (attempt - 1);
		console.error(
			`retry: "${label}" exited with ${code} on attempt ${attempt} of ${ATTEMPTS}, retrying in ${delay}ms`
		);
		await sleep(delay);
	}
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
