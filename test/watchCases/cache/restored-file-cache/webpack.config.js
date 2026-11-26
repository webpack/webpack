"use strict";

/** @import { Configuration } from "../../../.." */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	cache: { type: "filesystem" },
	output: { pathinfo: false },
	optimization: { minimize: false, moduleIds: "named", chunkIds: "named" }
};
