"use strict";

const webpack = require("../../../../");

const { DefinePlugin } = webpack;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			// every value shape a dotted key can carry, read by destructuring
			"process.env.TRUTHY": JSON.stringify("truthy"),
			"process.env.ZERO": 0,
			"process.env.FALSE": false,
			"process.env.NULL": null,
			"process.env.PATTERN": /^a$/,
			"process.env.SYNC": DefinePlugin.runtimeValue(() =>
				JSON.stringify("sync")
			),
			"process.env.ASYNC": DefinePlugin.runtimeValue(async () =>
				JSON.stringify("async")
			),
			// renders to no code, so it is left out rather than emitted into an
			// object literal that cannot hold it
			"process.env.EMPTY": ""
		})
	]
};
