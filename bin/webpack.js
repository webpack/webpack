#!/usr/bin/env node

"use strict";

/**
 * @param {string[]} args command line arguments
 * @returns {Promise<void>} promise
 */
const runNpm = (args) => {
	const cp = require("child_process");

	return new Promise((resolve, reject) => {
		const proc = cp.spawn("npm", args, { stdio: "inherit", shell: false });
		proc.on("error", reject);
		proc.on("exit", (code) => (code === 0 ? resolve() : reject()));
	});
};

/**
 * @param {string[]} args command line arguments
 * @returns {Promise<void>} promise
 */
const runYarn = (args) => {
	const cp = require("child_process");

	return new Promise((resolve, reject) => {
		const proc = cp.spawn("yarn", args, { stdio: "inherit", shell: false });
		proc.on("error", reject);
		proc.on("exit", (code) => (code === 0 ? resolve() : reject()));
	});
};

/**
 * @param {string[]} args command line arguments
 * @returns {Promise<void>} promise
 */
const runPnpm = (args) => {
	const cp = require("child_process");

	return new Promise((resolve, reject) => {
		const proc = cp.spawn("pnpm", args, { stdio: "inherit", shell: false });
		proc.on("error", reject);
		proc.on("exit", (code) => (code === 0 ? resolve() : reject()));
	});
};

/**
 * @param {string} packageName name of the package
 * @returns {boolean} is the package installed?
 */
const isInstalled = (packageName) => {
	if (process.versions.pnp) {
		return true;
	}

	try {
		require.resolve(`${packageName}/package.json`);
		return true;
	} catch (_error) {
		return false;
	}
};

/**
 * @param {CliOption} cli options
 * @returns {void}
 */
const runCli = (cli) => {
	const path = require("path");

	// Use the known package name literal to obtain a trusted base path via require.resolve
	const pkgPath = require.resolve("webpack-cli/package.json");

	/** @type {Record<string, EXPECTED_ANY> & { type: string, bin: Record<string, string> }} */
	const pkg = require(pkgPath);

	const pkgDir = path.dirname(pkgPath);
	// Use the known bin name literal to obtain the binary relative path
	const binRelPath = pkg.bin["webpack-cli"];
	const resolvedBin = path.resolve(pkgDir, binRelPath);

	// Prevent path traversal: ensure the resolved binary stays within the package directory
	if (!resolvedBin.startsWith(pkgDir + path.sep)) {
		console.error(`Invalid binary path for ${cli.package}`);
		process.exitCode = 1;
		return;
	}

	if (pkg.type === "module" || /\.mjs/i.test(binRelPath)) {
		import(resolvedBin).catch((err) => {
			console.error(err);
			process.exitCode = 1;
		});
	} else {
		require(resolvedBin);
	}
};

/**
 * @typedef {object} CliOption
 * @property {string} name display name
 * @property {string} package npm package name
 * @property {string} binName name of the executable file
 * @property {boolean} installed currently installed?
 * @property {string} url homepage
 */

/** @type {CliOption} */
const cli = {
	name: "webpack-cli",
	package: "webpack-cli",
	binName: "webpack-cli",
	installed: isInstalled("webpack-cli"),
	url: "https://github.com/webpack/webpack-cli"
};

if (!cli.installed) {
	const path = require("path");
	const fs = require("graceful-fs");
	const readLine = require("readline");

	const notify = `CLI for webpack must be installed.\n  ${cli.name} (${cli.url})\n`;

	console.error(notify);

	/** @type {string | undefined} */
	let packageManager;

	if (fs.existsSync(path.resolve(process.cwd(), "yarn.lock"))) {
		packageManager = "yarn";
	} else if (fs.existsSync(path.resolve(process.cwd(), "pnpm-lock.yaml"))) {
		packageManager = "pnpm";
	} else {
		packageManager = "npm";
	}

	const installOptions = [packageManager === "yarn" ? "add" : "install", "-D"];

	console.error(
		`We will use "${packageManager}" to install the CLI via "${packageManager} ${installOptions.join(
			" "
		)} ${cli.package}".`
	);

	const question = "Do you want to install 'webpack-cli' (yes/no): ";

	const questionInterface = readLine.createInterface({
		input: process.stdin,
		output: process.stderr
	});

	// In certain scenarios (e.g. when STDIN is not in terminal mode), the callback function will not be
	// executed. Setting the exit code here to ensure the script exits correctly in those cases. The callback
	// function is responsible for clearing the exit code if the user wishes to install webpack-cli.
	process.exitCode = 1;
	questionInterface.question(question, (answer) => {
		questionInterface.close();

		const normalizedAnswer = answer.toLowerCase().startsWith("y");

		if (!normalizedAnswer) {
			console.error(
				"You need to install 'webpack-cli' to use webpack via CLI.\n" +
					"You can also install the CLI manually."
			);

			return;
		}
		process.exitCode = 0;

		console.log(
			`Installing '${
				cli.package
			}' (running '${packageManager} ${installOptions.join(" ")} ${
				cli.package
			}')...`
		);

		const runner =
			packageManager === "yarn"
				? runYarn
				: packageManager === "pnpm"
					? runPnpm
					: runNpm;
		runner([...installOptions, cli.package])
			.then(() => {
				runCli(cli);
			})
			.catch((err) => {
				console.error(err);
				process.exitCode = 1;
			});
	});
} else {
	runCli(cli);
}
