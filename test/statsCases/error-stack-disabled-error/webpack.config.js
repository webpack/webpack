"use strict";

const { WebpackError } = require("../../../");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	stats: {
		errorStack: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				const err = new WebpackError("Test error with stack");
				err.stack =
					"Error: Test error with stack\n    at Test.js:1:1\n    at compile.js:2:2";
				compilation.errors.push(err);
			});
		}
	]
};
