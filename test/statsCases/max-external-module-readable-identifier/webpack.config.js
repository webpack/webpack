"use strict";

/** @import { Configuration } from "../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	externals: {
		test: "commonjs very-very-very-very-long-external-module-readable-identifier-it-should-be-truncated"
	}
};
