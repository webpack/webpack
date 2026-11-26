"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: "source-map-scopes",
	entry: "./index.js",
	optimization: {
		concatenateModules: false
	}
};
