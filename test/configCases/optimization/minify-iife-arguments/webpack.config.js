"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["es5", "eval", "let", "names"].map((name) => ({
	mode: "production",
	target: ["web", name === "es5" ? "es5" : "es2015"],
	entry: `./${name}.js`,
	experiments: { futureDefaults: true },
	output: { filename: `${name}.js`, module: false },
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				mangle: false,
				keep_fnames: true,
				keep_classnames: true
			}
		}
	}
}));
