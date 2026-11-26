"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "memory" },
	devtool: false,
	optimization: { minimize: false, emitOnErrors: true }
};
