#!/usr/bin/env node

let webpackCliInstalled = false;
try {
	require.resolve("webpack-cli");
	webpackCliInstalled = true;
} catch (e) {
	webpackCliInstalled = false;
}

function execute(command, options) {
	const { spawn } = require("child_process");
	const executed_command = spawn(command, options);
	executed_command.stdout.on("data", data =>
		console.log(data.toString("utf8"))
	);
	return new Promise(function(resolve, reject) {
		executed_command.on("close", code => resolve((process.exitCode = code)));
		executed_command.on("error", err => reject(err));
	});
}

function yarnExists() {
	const fs = require("fs");
	const path = require("path");
	const isYarn = fs.existsSync(path.resolve(process.cwd(), "yarn.lock"));
	if (isYarn) {
		return true;
	}
	return false;
}

if (webpackCliInstalled) {
	require("webpack-cli"); // eslint-disable-line node/no-missing-require, node/no-extraneous-require, node/no-unpublished-require
} else {
	console.error("The CLI moved into a separate package: webpack-cli.");
	const readline = require("readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question(
		"Do you want to install webpack-cli (Note:- This will install webpack-cli from npm repository)? Y/N \n",
		function(choice) {
			const options = ["add", "-D", "webpack-cli"];
			switch (choice.toLowerCase()) {
				case "y":
				case "yes":
				case "1":
					if (yarnExists()) {
						execute("yarn", options)
							.then(code => {
								rl.close();
								return require("webpack-cli"); // eslint-disable-line node/no-extraneous-require,node/no-missing-require, node/no-unpublished-require
							})
							.catch(e => {
								console.log(
									`Sorry an error occurred.\nPlease run "yarn add -D webpack-cli" to add webpack-cli and then run webpack-cli`
								);
								rl.close();
								return (process.exitCode = 1);
							});
					} else {
						options[0] = "install";
						execute("npm", options)
							.then(code => {
								rl.close();
								return require("webpack-cli"); // eslint-disable-line node/no-extraneous-require,node/no-missing-require, node/no-unpublished-require
							})
							.catch(e => {
								console.log(
									`Sorry an error occurred.\nPlease run "npm install -D webpack-cli" to add webpack-cli and then run webpack-cli`
								);
								rl.close();
								return (process.exitCode = 1);
							});
					}
					break;
				default:
					console.error(
						"Please install 'webpack-cli' in addition to webpack itself to use the CLI."
					);
					process.exitCode = 1;
					rl.close();
					break;
			}
		}
	);
	process.exitCode = 1;
}
