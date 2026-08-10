"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		},
		parser: {
			html: {
				sources: false
			}
		}
	},
	optimization: {
		// With every non-JS type excluded the built-in minimizer applies the
		// same plain JS setup `minimize: true` uses without the experiments.
		minimize: {
			css: false,
			html: false
		},
		minimizer: ["..."]
	},
	experiments: {
		css: true,
		html: true
	}
};
