"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	output: {
		module: true,
		library: {
			type: "module"
		}
	},
	optimization: {
		concatenateModules: true
	}
};

module.exports = config;
