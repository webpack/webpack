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
		// `"..."` keeps the default minimizer, which is what hands
		// `optimization.minimize.css` to `htmlMinify` — an inline `<style>` or
		// `style=""` must not disagree with a `.css` asset about a length's unit.
		minimizer: ["..."]
	},
	experiments: {
		css: true,
		html: true
	}
};
