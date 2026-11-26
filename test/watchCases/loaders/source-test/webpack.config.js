"use strict";

const path = require("path");

/** @import { Configuration } from "../../../.." */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	module: {
		rules: [
			{
				test: /input\.js$/,
				use: [
					{
						loader: path.resolve(__dirname, "loader.js"),
						sourceTest: /transform:marker/
					}
				]
			}
		]
	}
};
