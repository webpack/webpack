"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "es2020"],
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	},
	optimization: {
		minimize: false
	},
	externals: {
		"module-free": { external: "module module-free", sideEffects: false },
		"module-keep": "module module-keep",
		"module-import-free": {
			external: "module-import module-import-free",
			sideEffects: false
		},
		"module-import-keep": "module-import module-import-keep"
	}
};
