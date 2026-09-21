"use strict";

const path = require("path");

const TYPES = [
	["commonjs", "commonjs.js"],
	["commonjs2", "commonjs2.js"],
	["commonjs-module", "commonjs-module.js"],
	["commonjs-static", "commonjs-static.js"],
	["umd", "umd.js"],
	["umd2", "umd2.js"],
	["module", "module.mjs"],
	["modern-module", "modern-module.mjs"]
];

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) =>
	TYPES.map(([type, file]) => ({
		entry: "./index.js",
		target: "node14",
		output: { filename: `${type}.js` },
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					`../entry-merge-exports-0-create/${file}`
				)
			}
		},
		plugins: [
			/**
			 * @this {import("../../../../").Compiler} compiler
			 */
			function apply() {
				new (require("../../../../").DefinePlugin)({
					TYPE: JSON.stringify(type)
				}).apply(this);
			}
		]
	}));
