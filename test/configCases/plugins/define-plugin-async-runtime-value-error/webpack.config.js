"use strict";

const webpack = require("../../../../");

const { DefinePlugin } = webpack;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			// the generator rejects -> reported with the key, message chained
			ASYNC_BOOM: DefinePlugin.runtimeValue(async () => {
				throw new Error("boom-async");
			})
		})
	]
};
