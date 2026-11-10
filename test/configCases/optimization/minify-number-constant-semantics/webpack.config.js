"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["reassigned", "patterns"].map((name, index) => ({
	mode: "production",
	target: ["web", "es2018"],
	entry: `./${name}.js`,
	experiments: { futureDefaults: true },
	output: { filename: `bundle${index}.js`, module: false },
	optimization: {
		minimizer: ["..."],
		minimize: { javascript: { compress: { passes: 2 } } }
	}
}));
