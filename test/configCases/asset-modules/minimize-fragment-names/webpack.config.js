"use strict";

const path = require("path");
const { DefinePlugin } = require("../../../../");

/**
 * @param {number} index config index
 * @param {boolean} cssAndHtml whether native CSS and HTML are enabled
 * @returns {import("../../../../").Configuration} config
 */
const config = (index, cssAndHtml) => ({
	target: "web",
	mode: "production",
	output: {
		// The fragment is part of the asset name, stripped only when written to disk.
		filename: `bundle${index}.js#[contenthash:8]`,
		assetModuleFilename: `${index}/[name][ext][query][fragment]`,
		pathinfo: false
	},
	module: {
		rules: [
			{
				include: path.resolve(__dirname, "files"),
				type: "asset/resource"
			}
		]
	},
	optimization: {
		minimize: true,
		// `"..."` is webpack's own default minimizer, not the harness's plugin.
		minimizer: ["..."]
	},
	plugins: [new DefinePlugin({ CSS_AND_HTML: cssAndHtml })],
	experiments: {
		css: cssAndHtml,
		html: cssAndHtml
	}
});

// The first build runs `jsMinify` alone, the second shares the pool with
// `cssMinify` and `htmlMinify`: `lib/config/defaults.js` wires the two apart.
module.exports = [config(0, false), config(1, true)];
