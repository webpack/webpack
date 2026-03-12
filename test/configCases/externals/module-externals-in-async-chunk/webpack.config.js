"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: {
		external: "fs",
		external2: "node:fs",
		external3: "fs"
	},
	externalsType: "module-import",
	experiments: {
		outputModule: true
	},
	output: { chunkFilename: "[name].mjs" }
};
