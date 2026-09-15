"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.wat$/,
				use: require.resolve("./loader.js"),
				type: "webassembly/sync"
			}
		]
	},
	experiments: { syncWebAssembly: true },
	// the case reads the asset back, and the harness runs the bundle on node
	externalsType: "commonjs",
	externals: { fs: "fs", path: "path" },
	// the bundle has to be emitted for the failing module to be reported
	optimization: { emitOnErrors: true }
};
