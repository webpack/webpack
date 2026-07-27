"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	target: "node",
	externals: {
		path: "commonjs path",
		// a plain read, observable through a getter installed at runtime
		"lazy-ext": "var global.__lazyExternal"
	},
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
};
