"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { pathinfo: false },
	module: {
		rules: [
			{
				test: /embedded\.css$/,
				type: "css/auto",
				parser: { exportType: "text" }
			}
		]
	},
	// The defaults wire `minimizer-webpack-plugin` with terser / cssMinify /
	// htmlMinify, so this is what a user gets from `mode: "production"` alone.
	optimization: { minimize: true, minimizer: ["..."] },
	experiments: { css: true }
};
