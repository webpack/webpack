"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		all: false,
		modules: true,
		nestedModules: true,
		orphanModules: true,
		optimizationBailout: true
	}
};
