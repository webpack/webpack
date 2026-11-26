"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	performance: false,
	stats: {
		modulesSpace: 20
	}
};
