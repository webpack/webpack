"use strict";

const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
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
