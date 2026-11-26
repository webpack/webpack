"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		libraryTarget: "umd2"
	},
	externals: {
		external: "external",
		external2: "fs"
	}
};
