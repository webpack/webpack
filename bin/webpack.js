#!/usr/bin/env node

const cp = require("child_process");
const inquirer = require("inquirer");

function runCommand(command, options) {
	return new Promise((resolve, reject) => {
		const executedCommand = cp.spawn(command, options, {
			stdio: "inherit"
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

let webpackCliInstalled = false;
try {
	require.resolve("webpack-cli");
	webpackCliInstalled = true;
} catch (err) {
	webpackCliInstalled = false;
}

if (!webpackCliInstalled) {
	const path = require("path");
	const fs = require("fs");
	const isYarn = fs.existsSync(path.resolve(process.cwd(), "yarn.lock"));

	let packageManager;
	let options = [];
	if (isYarn) {
		packageManager = "yarn";
		options = ["add", "-D", "webpack-cli"];
	} else {
		packageManager = "npm";
		options = ["install", "--save-dev", "webpack-cli"];
	}

	const commandToBeRun = `${packageManager} ${options.join(" ")}`;

	const question = {
		type: "confirm",
		name: "shouldInstall",
		message: `Would you like to install webpack-cli? (That will run ${commandToBeRun})`,
		default: true
	};

	console.error("The CLI moved into a separate package: webpack-cli");
	inquirer.prompt(question).then(answer => {
		if (answer) {
			console.error("Installing webpack-cli");
			runCommand(packageManager, options)
				.then(result => require("webpack-cli")) // eslint-disable-line
				.catch(error => console.error(error));
		} else {
			process.exitCode(1);
		}
	});
} else {
	require("webpack-cli"); // eslint-disable-line
}
