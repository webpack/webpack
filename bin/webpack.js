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
	const readLine = require("readline");
	const isYarn = fs.existsSync(path.resolve(process.cwd(), "yarn.lock"));

	const packageManager = isYarn ? "yarn" : "npm";
	const options = ["install", "-D", "webpack-cli"];

	if (isYarn) {
		options[0] = "add";
	}

	const commandToBeRun = `${packageManager} ${options.join(" ")}`;

	const question = `Would you like to install webpack-cli? (That will run ${commandToBeRun}) `;

	console.error("The CLI moved into a separate package: webpack-cli");
	const questionInterface = readLine.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	questionInterface.question(question, answer => {
		questionInterface.close();
		switch (answer.toLowerCase()) {
			case "y":
			case "yes":
			case "1": {
				runCommand(packageManager, options)
					.then(result => {
						return require("webpack-cli"); //eslint-disable-line
					})
					.catch(error => {
						console.error(error);
						process.exitCode = 1;
					});
				break;
			}
			default: {
				console.error(
					"It needs to be installed alongside webpack to use the CLI"
				);
				process.exitCode = 1;
				break;
			}
		}
	});
} else {
	require("webpack-cli"); // eslint-disable-line
}
