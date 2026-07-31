"use strict";

// A custom minimizer that declares the type it handles with `include` instead of
// `test` — webpack must still recognize it and leave CSS alone.
class IncludeOnlyCssMinimizer {
	constructor() {
		this.options = {
			include: /\.css$/i,
			minimizer: { implementation: () => {} }
		};
	}

	apply() {}
}

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
		}
	},
	optimization: {
		minimize: true,
		minimizer: ["...", new IncludeOnlyCssMinimizer()]
	},
	experiments: {
		css: true,
		html: true
	}
};
