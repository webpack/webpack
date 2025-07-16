"use strict";

const DefinePlugin = require("../../../../").DefinePlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	plugins: [
		new DefinePlugin({
			"process.env.ENVIRONMENT": JSON.stringify("node")
		})
	]
};
