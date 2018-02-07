#!/usr/bin/env node

const { exec } = require("child_process");
const { readdirSync } = require("fs");
const { createInterface } = require("readline");

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
			console.log(data);
		} else {
			console.log(err);
		}
	});
}

try {
	require.resolve("webpack-cli");
	webpackCliInstalled = true;
} catch(err) {
	webpackCliInstalled = false;
}

if(webpackCliInstalled) {
	require("webpack-cli");
} else {
	let io = createInterface({
		input: process.stdin,
		output: process.stdout
	});
	console.error("The CLI moved into a separate package: webpack-cli.");
	io.question("Do you want to install 'webpack-cli' automatically? [ Y/N ] \n", answer => {
		if(/^\s*y/i.test(answer)) {
			console.error("Start downloading 'webpack-cli'...\n");

			if(hasYarn) {
				runCommand("yarn add webpack-cli -D");
			} else {
				runCommand("npm i webpack-cli -D");
			}
		}

		if(/^\s*n/i.test(answer)) {
			io.close();
		}

		io.close();
	});
}
