"use strict";

const fs = require("fs");
const path = require("path");
const root = process.cwd();
const node_modulesFolder = path.resolve(root, "node_modules");
const webpackDependencyFolder = path.resolve(root, "node_modules/webpack");

function setup() {
	return Promise.all([
		checkSymlinkExistsAsync().then(async hasSymlink => {
			if (!hasSymlink) {
				await ensureYarnInstalledAsync();
				await runSetupSymlinkAsync();
				if (!(await checkSymlinkExistsAsync())) {
					throw new Error("windows symlink was not successfully created");
				}
			}
		})
	])
		.then(() => {
			process.exitCode = 0;
		})
		.catch(e => {
			console.error(e);
			process.exitCode = 1;
		});
}

async function runSetupSymlinkAsync() {
	await exec("yarn", ["install"], "Install dependencies");
	await exec("yarn", ["link"], "Create webpack symlink");
	await exec("yarn", ["link", "webpack"], "Link webpack into itself");
}

function checkSymlinkExistsAsync() {
	return new Promise((resolve, reject) => {
		if (
			fs.existsSync(node_modulesFolder) &&
			fs.existsSync(webpackDependencyFolder) &&
			fs.lstatSync(webpackDependencyFolder).isSymbolicLink()
		) {
			resolve(true);
		} else {
			resolve(false);
		}
	});
}

async function ensureYarnInstalledAsync() {
	const semverPattern =
		/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?$/;
	let hasYarn = false;
	try {
		const stdout = await execGetOutput("yarn", ["-v"], "Check yarn version");
		hasYarn = semverPattern.test(stdout);
	} catch (e) {
		hasYarn = false;
	}
	if (!hasYarn) await installYarnAsync();
}

function installYarnAsync() {
	return exec("npm", ["install", "-g", "yarn"], "Install yarn");
}

function exec(command, args, description) {
	console.log(`Setup: ${description}`);
	return new Promise((resolve, reject) => {
		let cp = require("child_process").spawn(command, args, {
			cwd: root,
			stdio: "inherit",
			shell: true
		});
		cp.on("error", error => {
			reject(new Error(`${description} failed with ${error}`));
		});
		cp.on("exit", exitCode => {
			if (exitCode) {
				reject(`${description} failed with exit code ${exitCode}`);
			} else {
				resolve();
			}
		});
	});
}

function execGetOutput(command, args, description) {
	console.log(`Setup: ${description}`);
	return new Promise((resolve, reject) => {
		let cp = require("child_process").spawn(command, args, {
			cwd: root,
			stdio: [process.stdin, "pipe", process.stderr],
			shell: true
		});
		cp.on("error", error => {
			reject(new Error(`${description} failed with ${error}`));
		});
		cp.on("exit", exitCode => {
			if (exitCode) {
				reject(`${description} failed with exit code ${exitCode}`);
			} else {
				resolve(Buffer.concat(buffers).toString("utf-8").trim());
			}
		});
		const buffers = [];
		cp.stdout.on("data", data => buffers.push(data));
	});
}

setup();
