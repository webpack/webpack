#!/usr/bin/env node
function runCommand(command, options) {
	const cp = require("child_process");
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
	const inquirer = require("inquirer");
	const isYarn = fs.existsSync(path.resolve(process.cwd(), "yarn.lock"));

	const packageManager = isYarn ? "yarn" : "npm";
	const options = ["install", "-D", "webpack-cli"];

	if (isYarn) {
		options[0] = "add";
	}

	const commandToBeRun = `${packageManager} ${options.join(" ")}`;

	const question = {
		type: "confirm",
		name: "shouldInstall",
		message: `Would you like to install webpack-cli? (That will run ${
			commandToBeRun
		})`,
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
