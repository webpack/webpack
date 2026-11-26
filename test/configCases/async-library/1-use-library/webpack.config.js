"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {(env: Env, options: TestOptions) => Configuration} */
module.exports = (env, { testPath }) => ({
	target: "node14",
	output: {
		module: true,
		chunkLoading: "import"
	},
	resolve: {
		alias: {
			library: path.resolve(testPath, "../0-create-library/lib.js")
		}
	}
});
