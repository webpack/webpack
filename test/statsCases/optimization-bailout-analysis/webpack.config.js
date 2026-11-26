"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	entry: "./index",
	mode: "production",
	optimization: {
		minimize: false,
		concatenateModules: false
	},
	stats: {
		all: false,
		modules: true,
		optimizationBailout: true
	}
};
