"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const selfLink = path.resolve(root, "node_modules/webpack");

/**
 * Runs a command in the repository root, inheriting stdio.
 * @param {string} command command
 * @param {string[]} args args
 * @param {string} description description
 * @returns {Promise<void>} result
 */
function exec(command, args, description) {
	console.log(`Setup: ${description}`);
	return new Promise((resolve, reject) => {
		const cp = spawn(command, args, {
			cwd: root,
			stdio: "inherit",
			shell: true
		});

		cp.on("error", (error) => {
			reject(new Error(`${description} failed with ${error}`));
		});
		cp.on("exit", (exitCode) => {
			if (exitCode) {
				reject(new Error(`${description} failed with exit code ${exitCode}`));
			} else {
				resolve();
			}
		});
	});
}

/**
 * Tells whether `node_modules/webpack` exists, a broken symlink included.
 * @returns {boolean} result
 */
function hasSelfLink() {
	try {
		fs.lstatSync(selfLink);
		return true;
	} catch (_err) {
		return false;
	}
}

/**
 * Links the checkout in as `node_modules/webpack`, which is what
 * `yarn link webpack` achieves without writing to yarn's global registry.
 * @returns {void}
 */
function linkSelf() {
	if (hasSelfLink()) return;
	console.log("Setup: Link webpack into itself");
	const isWindows = process.platform === "win32";
	fs.symlinkSync(
		isWindows ? root : "..",
		selfLink,
		isWindows ? "junction" : "dir"
	);
}

/**
 * @returns {Promise<void>} result
 */
async function setupForAgent() {
	try {
		// Fails loudly on a lockfile the branch did not update, rather than
		// rewriting it: run `yarn install` yourself if that is what you meant.
		await exec(
			"yarn",
			["install", "--frozen-lockfile"],
			"Install dependencies"
		);
		linkSelf();
		process.exitCode = 0;
	} catch (err) {
		console.error(err);
		process.exitCode = 1;
	}
}

setupForAgent();
