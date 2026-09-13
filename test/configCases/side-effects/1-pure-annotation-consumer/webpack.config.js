"use strict";

const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../types").Configuration} */
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
