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
		minimize: {
			css: {
				convertLengthUnits: true
			}
		},
		// `"..."` keeps the default minimizer, which hands
		// `optimization.minimize.css` to `htmlMinify` for the inline CSS too.
		minimizer: ["..."]
	},
	experiments: {
		css: true,
		html: true
	}
};
