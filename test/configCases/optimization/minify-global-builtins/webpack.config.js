"use strict";

/** @type {import("webpack").Configuration[]} */
module.exports = ["assignment", "define-property"].map((name, index) => ({
	mode: "production",
	target: "node",
	entry: `./${name}.js`,
	output: { module: false, filename: `bundle${index}.js` },
	experiments: { futureDefaults: true },
	optimization: {
		minimizer: ["..."],
		minimize: { javascript: { compress: {}, mangle: false } }
	}
}));
