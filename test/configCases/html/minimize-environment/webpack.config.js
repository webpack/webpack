"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// An inline `<style>` and a `style=""` run through the CSS minifier, so it
	// needs the same selection a `.css` asset gets.
	target: "browserslist: chrome 50",
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
		minimize: true,
		// `"..."` keeps the default minimizer, which resolves the target.
		minimizer: ["..."]
	},
	experiments: {
		css: true,
		html: true
	}
};
