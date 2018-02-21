#!/usr/bin/env node

const cp = require("child_process");
const inquirer = require("inquirer");

function runCommand(command) {
	cp.exec(command, (error, stdout, stderr) => {
		if(!error) {
			console.log("webpack-cli installed successfully");
			return true;
		}
		console.log("failed to install webpack-cli");
		console.error(stderr);
		return false;
	});
}

let webpackCliInstalled = false;
try {
	require.resolve("webpack-cli");
	webpackCliInstalled = true;
} catch(err) {
	webpackCliInstalled = false;
}

if(!webpackCliInstalled) {
	const path = require("path");
	const fs = require("fs");
	const isYarn = fs.existsSync(path.resolve(process.cwd(), "yarn.lock"));

	const question = {
		type: "confirm",
		name: "shouldInstall",
		message: "Would you like to install webpack-cli?",
		default: true
	};

	console.error("The CLI moved into a separate package: webpack-cli");
	inquirer.prompt(question).then((answer) => {
		if(answer) {
			console.error("Installing webpack-cli");

			let command;
			if(isYarn) {
				command = "yarn add -D webpack-cli";
			} else {
				command = "npm install --save-dev webpack-cli";
			}

			if(runCommand(command)) {
				require("webpack-cli"); // eslint-disable-line node/no-missing-require, node/no-extraneous-require, node/no-unpublished-require
			}
		}
	});
} else {
	require("webpack-cli"); // eslint-disable-line node/no-missing-require, node/no-extraneous-require, node/no-unpublished-require
}
