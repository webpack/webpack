"use strict";

const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../types").Configuration} */
module.exports = (env, { testPath }) => ({
	target: "node14",
	output: {
		chunkLoading: "import"
	},
	resolve: {
		alias: {
			library: path.resolve(testPath, "../0-create-library/lib.js")
		}
	},
	experiments: {
		outputModule: true
	}
});
