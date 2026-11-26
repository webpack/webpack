"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {(env: Env, options: TestOptions) => Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		name: "library",
		entry: "./library.js",
		target: "web",
		output: {
			library: {
				name: "library",
				type: "umd"
			}
		}
	},
	{
		name: "build",
		dependencies: ["library"],
		entry: "./index.js",
		target: "web",
		resolve: {
			alias: {
				library: path.resolve(testPath, "./bundle0.js")
			}
		}
	}
];
