"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// An inline `<style>` and a `style=""` run through the CSS minifier, so the
	// HTML minifier has to be handed the same selection a `.css` asset gets —
	// Chrome 50 reads none of the spellings the printer would otherwise write.
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
		// `"..."` keeps the default minimizer, which is what resolves the target
		// and hands its browsers to `htmlMinify`.
		minimizer: ["..."]
	},
	experiments: {
		css: true,
		html: true
	}
};
