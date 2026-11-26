"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.txt$/,
				type: "asset/inline",
				generator: {
					name: "[name].txt"
				}
			}
		]
	}
};
