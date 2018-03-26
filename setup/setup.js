/* eslint-disable */
"use strict";

class Setup {
	constructor() {
		this.fs = require("fs");
		this.path = require("path");
		this.root = process.cwd();
		this.wpfolder = this.path.resolve(this.root, "node_modules/webpack/");
		this.hasYarn = false;
		this.msg = {
			setupStart: "Setup start",
			setupSuccess: "Setup complete",
			setupNoSymlink: "Setup failed to establish symlink for webpack",
			setupFail: "Setup failed",
			setupSkip: "Skip setup"
		};
	}

	run() {
		let p = new Promise((resolve, reject) => {
			if (!this.checkSymlinkExists()) {
				console.log(this.msg.setupStart);
				this.checkYarnInstalledAsync().then(() => {
					return this.runSetupAsync();
				}).catch((e) => {
					console.error(e);
					reject();
				}).then((stdout) => {
					if (!this.checkSymlinkExists()) {
						console.error(this.msg.setupNoSymlink);
						reject();
					} else {
						console.log(stdout);
						console.log(this.msg.setupSuccess);
						resolve();
					}
				}).catch((e) => {
					console.error(e);
					console.log(this.msg.setupFail);
					reject(e);
				});
			} else {
				console.log(this.msg.setupSkip);
				resolve();
			}
		});

		p.then(() => {
			process.exit(0);
		}).catch((e) => {
			process.exit(1);
		});
		return p;
	}

	runSetupAsync() {
		return new Promise((resolve, reject) => {
			try {		
				const pm = this.hasYarn ? "yarn" : "npm";
				const exec = require("child_process").exec;
				exec(`${pm} install && ${pm} link && ${pm} link webpack`,
					(error, stdout, stderr) => {
						if (error) {
							reject(error);
						} else {
							resolve(stdout);
						}
					});
			} catch (e) {
				reject(e);
			}
		});
	}

	checkYarnInstalledAsync() {
		return new Promise((resolve, reject) => {
			try {
				var isSemver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?$/;

				const exec = require("child_process").exec;
				exec("yarn -v", (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else {
						this.hasYarn = isSemver.test(stdout.trim());
						resolve(this.hasYarn);
					}
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	checkSymlinkExists() {
		return this.fs.existsSync(this.wpfolder) && this.fs.lstatSync(this.wpfolder).isSymbolicLink();
	}
}

module.exports = Setup
