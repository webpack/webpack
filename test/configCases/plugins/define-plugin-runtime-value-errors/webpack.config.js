"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.DefinePlugin({
			// generator throws an Error -> reported with the key, message chained
			"typeof FLAG": webpack.DefinePlugin.runtimeValue(() => {
				throw new Error("boom-error");
			}),
			// generator throws a non-Error -> wrapped in a WebpackError
			"typeof MODE": webpack.DefinePlugin.runtimeValue(() => {
				// eslint-disable-next-line no-throw-literal
				throw "boom-string";
			})
		})
	]
};
