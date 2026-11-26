"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				resourceQuery: /^\?loader/,
				use: "./loader?query"
			}
		]
	}
};
