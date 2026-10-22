"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		webassemblyModuleFilename: "[id].[hash].wasm"
	},
	experiments: {
		asyncWebAssembly: true
	}
};
