/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Runs a setup command again when it fails, so a registry 503 or a dropped
// download does not red a whole job. Node builtins only: every caller runs it
// before `yarn install` has written `node_modules`.

const { spawn } = require("child_process");

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DELAY = 5000;
const MAX_TIMEOUT = 2147483647;

/**
 * Reads how many times to run the command.
 * @param {string | undefined} value what `RETRY_ATTEMPTS` was set to
 * @returns {number} a positive integer
 */
const readAttempts = (value) => {
	if (value === undefined || value === "") return DEFAULT_ATTEMPTS;
	const attempts = Number(value);
	// WHY: a typo here used to reach the loop as NaN, where every `attempt >=
	// ATTEMPTS` is false, so a failing command retried until the job timed out.
	// Refusing to start says which variable is wrong in one line instead.
	if (!Number.isInteger(attempts) || attempts < 1) {
		throw new Error(
			`RETRY_ATTEMPTS must be a positive integer, got "${value}"`
		);
	}
	return attempts;
};

/**
 * Reads how long to wait before the second attempt.
 * @param {string | undefined} value what `RETRY_DELAY` was set to
 * @returns {number} a non-negative number of milliseconds
 */
const readDelay = (value) => {
	if (value === undefined || value === "") return DEFAULT_DELAY;
	const delay = Number(value);
	if (!Number.isFinite(delay) || delay < 0) {
		throw new Error(
			`RETRY_DELAY must be a non-negative number, got "${value}"`
		);
	}
	return delay;
};

/**
 * How long to wait after the given attempt failed.
 * @param {number} delay what the first wait is
 * @param {number} attempt the attempt that just failed, counted from 1
 * @returns {number} milliseconds, within the range a timer accepts
 */
const backoffFor = (delay, attempt) =>
	// WHY: node clamps a timer above 2**31-1 ms to 1 ms, so an unclamped
	// doubling turns the longest backoff into an immediate retry — the one
	// case where waiting longer would have helped most.
	Math.min(delay * 2 ** (attempt - 1), MAX_TIMEOUT);

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

/**
 * Runs the command until it succeeds or the attempts run out, backing off
 * between them.
 * @param {string} command the command to run
 * @param {string[]} args its arguments
 * @param {{ attempts?: number, delay?: number, run?: (command: string, args: string[]) => Promise<number> }=} options how many times to try, how long to wait first, and what runs it
 * @returns {Promise<number>} the exit code of the last attempt
 */
const retry = async (command, args, options) => {
	const settings = options || {};
	const attempts =
		settings.attempts === undefined ? DEFAULT_ATTEMPTS : settings.attempts;
	const delay = settings.delay === undefined ? DEFAULT_DELAY : settings.delay;
	const run = settings.run || runOnce;
	const label = [command, ...args].join(" ");
	for (let attempt = 1; ; attempt++) {
		const code = await run(command, args);
		if (code === 0) return 0;
		if (attempt >= attempts) return code;
		const wait = backoffFor(delay, attempt);
		console.error(
			`retry: "${label}" exited with ${code} on attempt ${attempt} of ${attempts}, retrying in ${wait}ms`
		);
		await sleep(wait);
	}
};

/**
 * Runs what the arguments name, under the settings the environment carries.
 * @param {string[]} argv the command and its arguments
 * @param {NodeJS.ProcessEnv} env where `RETRY_ATTEMPTS` and `RETRY_DELAY` are read
 * @returns {Promise<number>} the exit code to end with
 */
const main = (argv, env) => {
	if (argv.length === 0) {
		throw new Error("usage: node tooling/retry.js <command> [args...]");
	}
	return retry(argv[0], argv.slice(1), {
		attempts: readAttempts(env.RETRY_ATTEMPTS),
		delay: readDelay(env.RETRY_DELAY)
	});
};

/**
 * Runs as the entry point, reporting a refused setting rather than throwing it
 * at a caller that has nowhere to put it.
 * @param {string[]} argv the command and its arguments
 * @param {NodeJS.ProcessEnv} env where the settings are read
 * @returns {Promise<number>} the exit code it set
 */
const runAsScript = (argv, env) =>
	Promise.resolve()
		.then(() => main(argv, env))
		.catch((error) => {
			console.error(error.message);
			return 1;
		})
		.then((code) => {
			process.exitCode = code;
			return code;
		});

module.exports = {
	backoffFor,
	main,
	readAttempts,
	readDelay,
	retry,
	runAsScript,
	runOnce
};

if (require.main === module) runAsScript(process.argv.slice(2), process.env);
