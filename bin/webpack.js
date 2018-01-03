#!/usr/bin/env node

const { exec } = require("child_process");
const readline = require("readline");

let io = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let webpackCliInstalled = false;

try {
	require.resolve("webpack-cli") &&
	require("webpack-cli");
} catch(err) {
	webpackCliInstalled = true;
	process.stdout.write("Sorry, 'webpack-cli' was not found inside this project.");

	io.question("Do you want to install 'webpack-cli' automatically? [ Y/N ] \n", answer => {
		if(/(y|yes)|(Y|Yes)/.test(answer)) {
			process.stdout.write("Start downloading 'webpack-cli' package...\n");

			exec("npm i webpack-cli -D ; npm link webpack", (err, data) => {
				if(data) {
					process.stdout.write(data);
				} else {
					webpackCliInstalled = false;
				}
			});
		}

		if(/(n|no)|(N|No)/.test(answer)) {
			webpackCliInstalled = false;
		}

		io.close();
	});
}

if(!webpackCliInstalled) {
	process.exit(1);
}
