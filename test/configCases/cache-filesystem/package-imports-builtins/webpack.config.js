"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("BuildDependency", (compilation) => {
				compilation.buildDependencies.add(
					path.resolve(__dirname, "dependency.mjs")
				);
			});
		}
	]
};
