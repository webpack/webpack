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
	// the bundle has to be emitted for the failing module to be reported
	optimization: { emitOnErrors: true }
};
