"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.DefinePlugin({
			ASYNC_THROW: webpack.DefinePlugin.runtimeValue(async () => {
				// a thrown string (not an Error) exercises the normalization of
				// rejections into an Error before they reach the parser
				throw "raw error string";
			}, []),
			ASYNC_OK: webpack.DefinePlugin.runtimeValue(
				async ({ key }) => JSON.stringify(key),
				[]
			)
		})
	],
	// the bundle has to be emitted for the failing module to be executed
	optimization: {
		emitOnErrors: true
	}
};
