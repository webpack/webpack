"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				with: { type: "RANDOM" },
				use: require.resolve("./test-loader")
			}
		]
	}
};
