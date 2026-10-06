"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/sync"
			}
		]
	},
	experiments: {
		syncWebAssembly: true
	}
};
