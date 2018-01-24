#!/usr/bin/env node

const { exec } = require("child_process");
const { readdirSync } = require("fs");
const { createInterface } = require("readline");

let io = createInterface({
	input: process.stdin,
	output: process.stdout
});

let webpackCliInstalled = false;
let hasYarn = false;

let yarnLockFile = readdirSync(process.cwd()).find(val => val === "yarn.lock");

if(yarnLockFile) {
	hasYarn = true;
} else {
	hasYarn = false;
}

function runCommand(command) {
	exec(command, (err, data) => {
		if(data) {
			process.stdout.write(data);
			webpackCliInstalled = true;
		} else {
			process.stdout.write(err);
			webpackCliInstalled = false;
		}
	});
}

try {
	require.resolve("webpack-cli");
	webpackCliInstalled = true;
} catch(err) {
	process.stdout.write("The CLI moved into a separate package: webpack-cli.");

	io.question("Do you want to install 'webpack-cli' automatically? [ Y/N ] \n", answer => {
		if(/^\s*y/i.test(answer)) {
			process.stdout.write("Start downloading 'webpack-cli'...\n");

			if(hasYarn) {
				runCommand("yarn add webpack-cli -D");
			} else {
				runCommand("npm i webpack-cli -D");
			}

		}

		if(/^\s*n/i.test(answer)) {
			webpackCliInstalled = false;
		}

		io.close();
	});
}

if(!webpackCliInstalled) {
	process.exitCode = 1;
} else {
	io.close();
	require("webpack-cli");
}
