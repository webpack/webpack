"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		// keeps every module a table entry, so presence is what is asserted
		concatenateModules: false,
		moduleIds: "named"
	}
};
