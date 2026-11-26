"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: "eval-source-map-scopes",
	entry: "./index.js",
	optimization: {
		concatenateModules: false
	}
};
