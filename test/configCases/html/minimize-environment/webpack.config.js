"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false,
		// An inline `<style>` and a `style=""` run through the CSS minifier, so the
		// HTML minifier has to be handed the same abilities a `.css` asset gets.
		environment: {
			cssColorHexAlpha: false,
			cssInsetShorthand: false,
			cssMediaQueryRange: false,
			cssPlaceShorthand: false
		}
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
		// `"..."` keeps the default minimizer, which is what reads
		// `output.environment` and hands it to `htmlMinify`.
		minimizer: ["..."]
	},
	experiments: {
		css: true,
		html: true
	}
};
