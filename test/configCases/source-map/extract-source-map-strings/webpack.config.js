"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	devtool: "source-map",
	experiments: { css: true },
	optimization: {
		minimize: false
	},
	module: {
		rules: [
			{ extractSourceMap: true },
			{ test: /\.css$/, type: "css", generator: { exportsOnly: false } }
		]
	}
};
