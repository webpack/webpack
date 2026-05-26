"use strict";

const ProvidePlugin = require("../../../../").ProvidePlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ProvidePlugin({
			process: "./process"
		})
	],
	optimization: {
		concatenateModules: true
	}
};
