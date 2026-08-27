"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /built\.js$/,
				use: require.resolve("./loader.js")
			}
		]
	},
	// pinned, so the `"auto"` default cannot resolve differently per target
	experiments: {
		asyncWebAssembly: true
	},
	// the bundle has to be emitted for the failing modules to be executed
	optimization: {
		emitOnErrors: true
	}
};
