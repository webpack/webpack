"use strict";

/** @type {import("../../../").Configuration} */
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
