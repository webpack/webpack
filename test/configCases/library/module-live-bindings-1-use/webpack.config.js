"use strict";

const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	target: "node14",
	resolve: {
		alias: {
			library: path.resolve(testPath, "../module-live-bindings-0-create/lib.js")
		}
	}
});
