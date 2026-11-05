"use strict";

/** @type {import("../../../../").Configuration} */
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
