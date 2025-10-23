"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	entry: "./index",
	experiments: {
		syncWebAssembly: true
	},
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/sync"
			}
		]
	}
};
