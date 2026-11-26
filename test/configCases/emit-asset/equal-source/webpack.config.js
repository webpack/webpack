"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.txt$/,
				use: {
					loader: "file-loader",
					options: {
						name: "same-name.txt"
					}
				}
			}
		]
	}
};
