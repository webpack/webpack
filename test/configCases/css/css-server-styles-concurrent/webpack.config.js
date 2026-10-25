"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["universal", "node"].map((target, index) => ({
	mode: "development",
	target,
	devtool: false,
	entry: { a: "./index.js", b: "./index.js" },
	module: {
		generator: { css: { exportsOnly: false } },
		rules: [
			{ test: /injected\.css$/, type: "css", parser: { exportType: "style" } }
		]
	},
	output: {
		module: true,
		filename: `bundle${index}-[name].mjs`,
		cssChunkFilename: "[name].css",
		uniqueName: `css-server-styles-concurrent-${target}`
	},
	experiments: { css: true }
}));
