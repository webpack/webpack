"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
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
		lazyCompilation: {
			entries: false
		}
	}
};
