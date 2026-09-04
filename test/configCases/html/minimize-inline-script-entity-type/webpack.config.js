"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				// The html parser bundles an executable inline `<script>` into its own
				// entry, so only an unparsed page reaches the minifier holding one.
				test: /\.html$/i,
				type: "asset/resource",
				generator: { filename: "page.html" }
			}
		]
	},
	optimization: {
		// `"..."` keeps the default minimizer, which hands
		// `optimization.minimize.html` to `htmlMinify`.
		minimize: {
			html: {
				collapseWhitespace: true
			}
		},
		minimizer: ["..."]
	},
	experiments: {
		html: true
	}
};
