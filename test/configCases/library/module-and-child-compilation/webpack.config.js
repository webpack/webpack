"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	output: {
		module: true,
		library: {
			type: "module"
		}
	},
	module: {
		strictExportPresence: true,
		rules: [
			{
				test: /\.custom$/i,
				loader: require.resolve("./loader")
			}
		]
	}
};
