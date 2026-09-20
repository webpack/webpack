"use strict";

const webpack = require("../../../../");

const { DefinePlugin } = webpack;

// one instance, thrown again for every module the value reaches
const sharedError = new Error("boom-shared");

/**
 * @returns {Promise<never>} a rejection, always
 */
async function namedGenerator() {
	throw new Error("boom-named");
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		named: "./named.js",
		shared: "./shared.js",
		shared2: "./shared2.js"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new DefinePlugin({
			// the generator rejects -> reported with the key, message chained
			ASYNC_BOOM: DefinePlugin.runtimeValue(async () => {
				throw new Error("boom-async");
			}),
			// the generator is named in the message when it has a name
			ASYNC_NAMED_BOOM: DefinePlugin.runtimeValue(namedGenerator),
			// two modules, one rejection: the key is prefixed onto it once
			ASYNC_SHARED_BOOM: DefinePlugin.runtimeValue(async () => {
				throw sharedError;
			})
		})
	]
};
