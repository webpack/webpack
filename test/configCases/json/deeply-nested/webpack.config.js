"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: /(deep|over-limit)\.json$/,
				loader: require.resolve("./deep-loader")
			}
		]
	}
};
