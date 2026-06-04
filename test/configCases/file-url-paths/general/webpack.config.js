"use strict";

const { pathToFileURL } = require("url");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	// Schema validation support for file: URLs is handled separately; this case
	// verifies the general options are resolved at their point of use.
	validate: false,
	context: pathToFileURL(__dirname), // file URL instance
	output: {
		path: pathToFileURL(testPath) // file URL instance
	}
});
