#!/usr/bin/env node

let webpackCliInstalled = false;
try {
	require.resolve("webpack-cli");
	webpackCliInstalled = true;
} catch(e) {
	webpackCliInstalled = false;
}

if(webpackCliInstalled) {
	require("webpack-cli"); // eslint-disable-line node/no-unpublished-require
} else {
	console.error("The CLI moved into a separate package: webpack-cli.");
	console.error("Please install 'webpack-cli' in addition to webpack itself to use the CLI.");
	console.error("-> When using npm: npm install webpack-cli");
	console.error("-> When using yarn: yarn add webpack-cli");
	process.exitCode = 1;
}
