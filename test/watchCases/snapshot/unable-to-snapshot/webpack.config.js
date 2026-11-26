"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {(env: Env, options: TestOptions) => Configuration} */
module.exports = (env, { srcPath }) => ({
	cache: {
		type: "memory"
	},
	snapshot: {
		managedPaths: [path.resolve(srcPath, "node_modules")]
	},
	module: {
		unsafeCache: false
	}
});
