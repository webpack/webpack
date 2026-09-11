"use strict";

const { DefinePlugin } = require("../../../../");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: {
		type: "filesystem"
	},
	optimization: {
		minimize: false
	},
	plugins: [
		new DefinePlugin({
			"process.env.PICK": DefinePlugin.runtimeValue(
				() => JSON.stringify(`p${currentWatchStep.step || 0}`),
				{ version: () => String(currentWatchStep.step || 0) }
			)
		})
	]
};
