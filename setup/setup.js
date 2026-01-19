"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const nodeModulesFolder = path.resolve(root, "node_modules");
const webpackDependencyFolder = path.resolve(root, "node_modules/webpack");

/**
 * @returns {Promise<void>} result
 */
function setup() {
	return checkSymlinkExistsAsync()
		.then(async (hasSymlink) => {
			if (!hasSymlink) {
				await ensureYarnInstalledAsync();
				await runSetupSymlinkAsync();
				if (!(await checkSymlinkExistsAsync())) {
					throw new Error("windows symlink was not successfully created");
				}
			}
		})
		.then(() => {
			process.exitCode = 0;
		})
		.catch((err) => {
			console.error(err);
			process.exitCode = 1;
		});
}

/**
 * @returns {Promise<void>} result
 */
async function runSetupSymlinkAsync() {
	await exec("yarn", ["install"], "Install dependencies");
	await exec("yarn", ["link"], "Create webpack symlink");
	await exec("yarn", ["link", "webpack"], "Link webpack into itself");
}

/**
 * @returns {Promise<boolean>} result
 */
function checkSymlinkExistsAsync() {
	return new Promise((resolve) => {
		try {
			if (
				fs.existsSync(nodeModulesFolder) &&
				fs.existsSync(webpackDependencyFolder) &&
				fs.lstatSync(webpackDependencyFolder).isSymbolicLink()
			) {
				resolve(true);
			} else {
				resolve(false);
			}
		} catch {
			resolve(false);
		}
	});
}

/**
 * @returns {Promise<void>} result
 */
async function ensureYarnInstalledAsync() {
	const semverPattern =
		/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-z-][0-9a-z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-z-][0-9a-z-]*))*)?(?:\+[0-9a-z-]+(?:\.[0-9a-z-]+)*)?$/i;
	let hasYarn = false;
	try {
		const stdout = await execGetOutput("yarn", ["-v"], "Check yarn version");
		hasYarn = semverPattern.test(stdout);
	} catch (_err) {
		hasYarn = false;
	}
	if (!hasYarn) await installYarnAsync();
}

/**
 * @returns {Promise<void>} result
 */
function installYarnAsync() {
	return exec("npm", ["install", "-g", "yarn"], "Install yarn");
}

/**
 * @param {string} command command
 * @param {string[]} args args
 * @param {string} description description
 * @returns {Promise<void>} result
 */
function exec(command, args, description) {
	console.log(`Setup: ${description}`);
	return new Promise((resolve, reject) => {
		const cp = require("child_process").spawn(command, args, {
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
 * @param {string} command command
 * @param {string[]} args args
 * @param {string} description description
 * @returns {Promise<string>} result
 */
function execGetOutput(command, args, description) {
	console.log(`Setup: ${description}`);
	return new Promise((resolve, reject) => {
		const cp = require("child_process").spawn(command, args, {
			cwd: root,
			stdio: [process.stdin, "pipe", process.stderr],
			shell: true
		});

		cp.on("error", (error) => {
			reject(new Error(`${description} failed with ${error}`));
		});
		cp.on("exit", (exitCode) => {
			if (exitCode) {
				reject(new Error(`${description} failed with exit code ${exitCode}`));
			} else {
				resolve(Buffer.concat(buffers).toString("utf8").trim());
			}
		});
		/** @type {Buffer[]} */
		const buffers = [];
		cp.stdout.on("data", (data) => buffers.push(data));
	});
}

setup();
