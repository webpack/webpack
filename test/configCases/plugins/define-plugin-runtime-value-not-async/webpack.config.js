"use strict";

const webpack = require("../../../../");

const { DefinePlugin } = webpack;

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		rejected: "./rejected.js",
		disabled: "./disabled.js"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new DefinePlugin({
			// returns a promise without being declared `async` and without the
			// option saying so, so there is nothing to resolve it before the parse
			NOT_DECLARED_ASYNC: DefinePlugin.runtimeValue(() =>
				Promise.resolve(JSON.stringify("too late"))
			),
			REJECTED_NOT_DECLARED_ASYNC: DefinePlugin.runtimeValue(() =>
				Promise.reject(new Error("The rejection must be handled"))
			),
			ASYNC_DISABLED: DefinePlugin.runtimeValue(async () => 42, {
				async: false
			})
		})
	]
};
