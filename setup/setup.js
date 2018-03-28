"use strict";

const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const root = process.cwd();
const wpfolder = path.resolve(root, "node_modules/webpack/");
const msg = {
	setupStart: "\nSetup: start\n\r",
	setupComplete: "Setup: complete\n\r",
	setupNoSymlink: "\nSetup: no symlink\n\r",
	setupSymlink: "\nSetup: symlink established\n\r",
	setupFail: "\nSetup: failed\n\r",
	setupSkip: "\nSetup: skip\n\r",
	setupInstallYarn: "\nSetup: Installing Yarn\n\r",
	setupInstallDependencies: "\nSetup: Installing dependencies\n\r"
};

function setup() {
	return new Promise((resolve, reject) => {
		checkSymlinkExistsAsync()
			.then(() => {
				resolve(msg.setupSkip);
			})
			.catch(() => {
				resolve(
					ensureYarnInstalledAsync().then(() => {
						return runSetupAsync().then(() => {
							return checkSymlinkExistsAsync();
						});
					})
				);
			});
	})
		.then(message => {
			console.log(message);
			message !== msg.setupSkip && console.log(msg.setupComplete);
			process.exitCode = 0;
		})
		.catch(e => {
			console.log(e);
			process.exitCode = 1;
		});
}

function runSetupAsync() {
	console.log(msg.setupInstallDependencies);
	return new Promise((resolve, reject) => {
		let cp = exec(
			`yarn install && yarn link && yarn link webpack`,
			(error, stdout, stderr) => {
				if (error) {
					reject(msg.setupFail);
				} else {
					resolve();
				}
			}
		);
		cp.stderr.pipe(process.stderr);
		cp.stdout.pipe(process.stdout);
	});
}

function checkSymlinkExistsAsync() {
	return new Promise((resolve, reject) => {
		if (fs.existsSync(wpfolder) && fs.lstatSync(wpfolder).isSymbolicLink()) {
			resolve(msg.setupSymlink);
		} else {
			reject(msg.setupNoSymlink);
		}
	});
}

function ensureYarnInstalledAsync() {
	console.log(msg.setupStart);
	return new Promise((resolve, reject) => {
		var semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?$/;

		var cp = exec("yarn -v", (error, stdout, stderr) => {
			if (stdout && semverPattern.test(stdout.trim())) {
				resolve();
			} else {
				resolve(installYarnAsync());
			}
		});
		cp.stderr.pipe(process.stderr);
		cp.stdout.pipe(process.stdout);
	});
}

function installYarnAsync() {
	console.log(msg.setupInstallYarn);
	return new Promise((resolve, reject) => {
		let cp = exec(
			`npm install -g yarn`,
			{
				cwd: root
			},
			(error, stdout, stderr) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			}
		);
		cp.stderr.pipe(process.stderr);
		cp.stdout.pipe(process.stdout);
	});
}

module.exports = setup;
