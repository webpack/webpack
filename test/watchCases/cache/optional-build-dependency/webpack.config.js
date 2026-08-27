"use strict";

const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => ({
	mode: "development",
	cache: {
		type: "filesystem",
		buildDependencies: {
			config: [
				__filename,
				{
					dependency: path.join(srcPath, "optional-config.js"),
					optional: true
				}
			]
		}
	}
});
