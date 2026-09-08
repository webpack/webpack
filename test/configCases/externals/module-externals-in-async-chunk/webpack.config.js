"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: {
		external: "fs",
		external2: "node:fs",
		external3: "fs"
	},
	externalsType: "module-import",
	output: {
		module: true,
		chunkFilename: "[name].mjs"
	},
	optimization: {
		moduleIds: "named",
		concatenateModules: false
	}
};
