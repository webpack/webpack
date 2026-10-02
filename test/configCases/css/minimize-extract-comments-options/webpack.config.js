"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: {
			css: {
				extractComments: ({ value, line, col }) =>
					line === 1 && col === 0 && value.startsWith("! Kit")
			}
		},
		// `"..."` keeps the default minimizer, which is what runs `cssMinify`.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
