"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		entry: "./system-external-commonjs.js",
		output: {
			library: {
				type: "system"
			}
		},
		externals: {
			"library-commonjs": path.resolve(
				testPath,
				"../0-create-library/system-commonjs.js"
			)
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("systemjs with external from commonjs format")
			})
		]
	}
];
