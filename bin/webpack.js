#!/usr/bin/env node
function runCommand(command, options) {
	const cp = require("child_process");
	return new Promise((resolve, reject) => {
		const executedCommand = cp.spawn(command, options, {
			stdio: "inherit",
			shell: true
		});

		executedCommand.on("error", error => {
			reject(error);
		});

		executedCommand.on("exit", code => {
			if (code === 0) {
				resolve(true);
			} else {
				reject();
			}
		});
	});
}

function isInstalled(packageName) {
	try {
		require.resolve(packageName);

		return true;
	} catch (err) {
		return false;
	}
}

const CLI = [
	{
		name: "webpack-cli",
		installed: isInstalled("webpack-cli"),
		URL: "https://github.com/webpack/webpack-cli",
		description: "The original webpack full-featured CLI from webpack@3."
	},
	{
		name: "webpack-command",
		installed: isInstalled("webpack-command"),
		URL: "https://github.com/webpack-contrib/webpack-command",
		description: "A lightweight, opinionated webpack CLI."
	}
];

if (CLI.every(item => !item.installed)) {
	const path = require("path");
	const fs = require("fs");
	const readLine = require("readline");

	let notify =
		"The CLI for webpack must be installed as a separate package, for which there are choices:\n";

	CLI.forEach(item => {
		notify += `    ${item.name} (${item.URL}): ${item.description}\n`;
	});

	console.error(notify);

	const isYarn = fs.existsSync(path.resolve(process.cwd(), "yarn.lock"));

	const packageManager = isYarn ? "yarn" : "npm";
	const installOptions = ["install", "-D"];

	if (isYarn) {
		installOptions[0] = "add";
	}

	let question = `Would you like to install (${CLI.map(item => item.name).join(
		"/"
	)}):\n`;

	const questionInterface = readLine.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	questionInterface.question(question, answer => {
		questionInterface.close();

		const normalizedAnswer = answer.toLowerCase();
		const selectedPackage = CLI.find(item => item.name === normalizedAnswer);

		if (!selectedPackage) {
			console.error(
				"It needs to be installed alongside webpack to use the CLI"
			);
			process.exitCode = 1;

			return;
		}

		installOptions.push(normalizedAnswer);

		console.log(
			`Installing '${normalizedAnswer}' (running '${packageManager} ${installOptions.join(
				" "
			)}')...`
		);

		runCommand(packageManager, installOptions)
			.then(result => {
				return require(normalizedAnswer); //eslint-disable-line
			})
			.catch(error => {
				console.error(error);
				process.exitCode = 1;
			});
	});
} else {
	const installedPackage = CLI.map(
		item => (item.installed ? item.name : "")
	).filter(v => v);

	if (installedPackage.length > 1) {
		console.warn(
			`You have installed ${installedPackage.join(
				" and "
			)} together. To work with the webpack you need only one CLI package, please remove one of them`
		);
	}

	require(installedPackage[0]); // eslint-disable-line
}
