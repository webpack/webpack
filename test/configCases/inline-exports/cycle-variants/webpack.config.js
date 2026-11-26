"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: false,
		inlineExports: true,
		minimize: false
	}
};
