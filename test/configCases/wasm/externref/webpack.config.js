/** @typedef {import("../../../../").Compiler} Compiler */

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		webassemblyModuleFilename: "[id].[hash].wasm"
	},
	experiments: {
		asyncWebAssembly: true
	}
};
