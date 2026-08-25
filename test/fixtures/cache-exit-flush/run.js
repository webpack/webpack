"use strict";

// Runs a compilation and lets the process end on its own, without `compiler.close()`.
const webpack = require("../../../");

const [cacheDirectory, outputDirectory] = process.argv.slice(2);

const compiler = webpack({
	mode: "development",
	context: __dirname,
	entry: "./index.js",
	output: { path: outputDirectory },
	cache: {
		type: "filesystem",
		cacheDirectory,
		// long enough that only the exit flush can store the pack
		idleTimeout: 600000,
		idleTimeoutForInitialStore: 600000,
		idleTimeoutAfterLargeChanges: 600000
	},
	infrastructureLogging: { level: "error" }
});

compiler.run((err, stats) => {
	if (err || stats.hasErrors()) {
		console.error(String(err || stats.toString({ all: false, errors: true })));
		process.exitCode = 1;
		return;
	}
	const { modules } = stats.toJson({ all: false, modules: true });
	console.log(
		JSON.stringify({
			modules: modules.length,
			built: modules.filter((module) => module.built).length
		})
	);
});
