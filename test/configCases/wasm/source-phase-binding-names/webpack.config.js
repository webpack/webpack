"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "async-node",
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	experiments: {
		asyncWebAssembly: true,
		sourceImport: true
	}
};
