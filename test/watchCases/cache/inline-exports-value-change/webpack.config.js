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
		minimize: false,
		inlineExports: true
	},
	plugins: [
		new DefinePlugin({
			"process.env.FLAG": DefinePlugin.runtimeValue(
				() =>
					JSON.stringify(
						Number(currentWatchStep.step || 0) === 0 ? "on" : "off"
					),
				{ version: () => String(currentWatchStep.step || 0) }
			)
		})
	]
};
