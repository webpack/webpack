"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
