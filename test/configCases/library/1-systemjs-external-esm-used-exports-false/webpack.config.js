"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		entry: "./system-external-esm.js",
		output: {
			library: {
				type: "system"
			}
		},
		externals: {
			"library-esm": path.resolve(testPath, "../0-create-library/system-esm.js")
		},
		optimization: {
			usedExports: false
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("systemjs with external from ES module format")
			})
		]
	}
];
