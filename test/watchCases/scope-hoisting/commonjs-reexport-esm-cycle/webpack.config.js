"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: { commonjs: true },
		mangleExports: "deterministic",
		minimize: false
	}
};
