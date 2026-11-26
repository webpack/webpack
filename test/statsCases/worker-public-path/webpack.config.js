"use strict";

/** @import { Configuration } from "../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	output: {
		filename: "[name]-[contenthash].js"
	}
};
