"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const nodeModulesFolder = path.resolve(root, "node_modules");
const webpackDependencyFolder = path.resolve(root, "node_modules/webpack");

/**
 * Whether a person is watching. Everything else — CI, and every coding agent,
 * including ones that do not exist yet — takes the non-interactive path.
 * @returns {boolean} result
 */
function isInteractive() {
	const forced = process.env.WEBPACK_SETUP;
	if (forced === "interactive") return true;
	if (forced === "automated") return false;
	return (
		Boolean(process.stdin.isTTY && process.stdout.isTTY) && !process.env.CI
	);
}

/**
 * @returns {Promise<void>} result
 */
async function setup() {
	try {
		await (isInteractive() ? setupForContributor() : setupForAutomation());
		process.exitCode = 0;
	} catch (err) {
		console.error(err);
		process.exitCode = 1;
	}
}

/**
 * Installs yarn when it is missing and links through yarn's registry, so the
 * checkout can be linked into another project. Skipped once the link exists.
 * @returns {Promise<void>} result
 */
async function setupForContributor() {
	if (await checkSymlinkExistsAsync()) return;
	await ensureYarnInstalledAsync();
	await exec("yarn", ["install"], "Install dependencies");
	await exec("yarn", ["link"], "Create webpack symlink");
	await exec("yarn", ["link", "webpack"], "Link webpack into itself");
	if (!(await checkSymlinkExistsAsync())) {
		throw new Error("windows symlink was not successfully created");
	}
}

/**
 * Verifies the lockfile rather than rewriting it, installs no global yarn, and
 * links without touching yarn's machine-global registry. Safe to re-run.
 * @returns {Promise<void>} result
 */
async function setupForAutomation() {
	await exec("yarn", ["install", "--frozen-lockfile"], "Install dependencies");
	if (await checkSymlinkExistsAsync()) return;
	console.log("Setup: Link webpack into itself");
	const isWindows = process.platform === "win32";
	fs.symlinkSync(
		isWindows ? root : "..",
		webpackDependencyFolder,
		isWindows ? "junction" : "dir"
	);
}

/**
 * @returns {Promise<boolean>} result
 */
function checkSymlinkExistsAsync() {
	return new Promise((resolve) => {
		try {
			resolve(
				fs.existsSync(nodeModulesFolder) &&
					fs.lstatSync(webpackDependencyFolder).isSymbolicLink()
			);
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
 * @param {string} command command
 * @param {string[]} args args
 * @param {string} description description
 * @returns {Promise<string>} result
 */
function execGetOutput(command, args, description) {
	console.log(`Setup: ${description}`);
	return new Promise((resolve, reject) => {
		const cp = spawn(command, args, {
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
		/** @type {import("stream").Readable} */
		(cp.stdout).on("data", (data) => buffers.push(data));
	});
}

setup();
