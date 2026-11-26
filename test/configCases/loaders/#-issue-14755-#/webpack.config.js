"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.my$/,
				loader: "regexp-#-loader"
			}
		]
	}
};
