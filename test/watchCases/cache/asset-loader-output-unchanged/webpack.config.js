"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset/resource",
				use: { loader: require.resolve("./empty-svg-loader") }
			}
		]
	}
};
