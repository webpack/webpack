"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		module: true,
		chunkFormat: "module",
		importFunctionName: "HOLD.importChunk"
	}
};
