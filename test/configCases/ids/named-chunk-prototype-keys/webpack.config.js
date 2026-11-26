"use strict";

const { DefinePlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

const targets = ["node", "async-node", "webworker"];

/** @type {Configuration[]} */
module.exports = targets.map((target) => ({
	target,
	mode: "development",
	output: {
		filename: `${target}-[name].js`,
		chunkFilename: `${target}-[name].chunk.js`
	},
	optimization: { chunkIds: "named" },
	plugins: [new DefinePlugin({ TARGET: JSON.stringify(target) })]
}));
