"use strict";

const path = require("path");
const { EntryPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {},
	output: {
		filename: "bundle.js"
	},
	module: {
		rules: [
			{
				// a loader makes the entry re-runnable through the factory pipeline
				test: /index\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	},
	plugins: [
		(compiler) => {
			// entry registered with a context of its own; re-factorizing must reuse
			// that one, not the compiler's
			new EntryPlugin(path.resolve(compiler.context, "lib"), "./index.js", {
				name: "main"
			}).apply(compiler);
		}
	]
};
