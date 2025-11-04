"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		module: true,
		library: {
			type: "module"
		}
	},
	optimization: {
		usedExports: true,
		concatenateModules: true
	},
	target: "browserslist: last 2 chrome versions",
	experiments: {
		outputModule: true
	}
};

module.exports = config;
