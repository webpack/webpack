"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {(env: Env, options: TestOptions) => Configuration} */
module.exports = (env, { testPath }) => ({
	target: "node",
	mode: "production",
	optimization: {
		minimize: true
	},
	resolve: {
		alias: {
			library: path.resolve(testPath, "../0-pure-annotation-library/lib.mjs")
		}
	}
});
