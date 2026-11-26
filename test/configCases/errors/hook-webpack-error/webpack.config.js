"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /my-errored-module\.js$/i,
				use: [
					{
						loader: require.resolve("./loader.js")
					}
				]
			}
		]
	}
};
