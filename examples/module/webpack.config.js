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
	}
};

module.exports = config;
