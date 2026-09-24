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
		],
		parser: {
			javascript: {
				exprContextRegExp: /\.wat$/,
				exprContextCritical: false
			}
		}
	},
	experiments: {
		asyncWebAssembly: true,
		sourceImport: true
	}
};
