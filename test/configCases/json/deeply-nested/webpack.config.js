"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: /deep\.json$/,
				loader: require.resolve("./deep-loader")
			}
		]
	}
};
