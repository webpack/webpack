"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {(env: Env, options: TestOptions) => Configuration} */
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
