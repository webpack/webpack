"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				mimetype: "image/svg+xml+external",
				type: "asset/resource",
				generator: {
					filename: "[hash].svg"
				}
			}
		]
	},
	target: "web"
};
