"use strict";

/** @import { Compiler, Compilation } from "../../../../" */

const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		output: {
			module: true
		},
		resolve: {
			alias: {
				module1: path.resolve(
					testPath,
					"../0-provide-module-and-assign/module.mjs"
				),
				module2: path.resolve(
					testPath,
					"../0-provide-module-and-assign/module-no-concat.mjs"
				),
				assign1: path.resolve(
					testPath,
					"../0-provide-module-and-assign/assign.mjs"
				),
				assign2: path.resolve(
					testPath,
					"../0-provide-module-and-assign/assign-no-concat.mjs"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("0-provide-module-and-assign")
			})
		]
	}
];
