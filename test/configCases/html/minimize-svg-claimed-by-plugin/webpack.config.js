"use strict";

class SvgMinimizerPlugin {
	constructor() {
		this.options = { test: /\.svg$/, minimizer: { implementation: () => {} } };
	}

	apply() {}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { assetModuleFilename: "[name][ext]" },
	module: { rules: [{ test: /\.svg$/, type: "asset/resource" }] },
	plugins: [new SvgMinimizerPlugin()],
	optimization: {
		minimize: { html: { collapseWhitespace: "all" } },
		minimizer: ["..."]
	},
	experiments: { html: true }
};
