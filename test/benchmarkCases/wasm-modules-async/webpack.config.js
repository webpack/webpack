"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	entry: "./index",
	experiments: {
		asyncWebAssembly: true
	},
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	}
};
