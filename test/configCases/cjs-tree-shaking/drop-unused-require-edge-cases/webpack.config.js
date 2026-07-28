"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	entry: "./index.js",
	plugins: [
		new webpack.DefinePlugin({
			IS_FALSE: JSON.stringify(false)
		})
	],
	optimization: {
		minimize: false,
		moduleIds: "named",
		inlineExports: true,
		innerGraph: true,
		usedExports: true,
		sideEffects: true,
		concatenateModules: false
	}
};
