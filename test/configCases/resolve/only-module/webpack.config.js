"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	resolve: {
		alias: [
			{
				alias: path.resolve(__dirname, "a/1.js"),
				name: "./b",
				onlyModule: true
			}
		]
	}
};
