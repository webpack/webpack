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
	// the bundle has to be emitted for the failing modules to be executed
	optimization: {
		emitOnErrors: true
	}
};
