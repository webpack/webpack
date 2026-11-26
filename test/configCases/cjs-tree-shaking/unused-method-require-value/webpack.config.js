"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: {
		minimize: false,
		moduleIds: "named",
		mangleExports: false,
		concatenateModules: false
	}
};
