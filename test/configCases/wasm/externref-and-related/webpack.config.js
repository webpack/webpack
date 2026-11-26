"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		webassemblyModuleFilename: "[id].[hash].wasm"
	},
	experiments: {
		asyncWebAssembly: true
	}
};
