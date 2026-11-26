"use strict";

const DefinePlugin = require("../../../../").DefinePlugin;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	plugins: [
		new DefinePlugin({
			"process.env.ENVIRONMENT": JSON.stringify("node")
		})
	]
};
