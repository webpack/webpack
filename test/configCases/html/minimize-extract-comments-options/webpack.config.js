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
			html: {
				extractComments: ({ value, line, col }) =>
					line === 5 && col === 0 && value.includes("@license")
			}
		},
		// `"..."` keeps the default minimizer, which is what runs `htmlMinify`.
		minimizer: ["..."]
	},
	experiments: {
		html: true
	}
};
