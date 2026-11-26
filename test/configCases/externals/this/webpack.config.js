"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	optimization: {
		concatenateModules: true
	},
	externals: {
		external: "this EXTERNAL_TEST_GLOBAL"
	}
};
