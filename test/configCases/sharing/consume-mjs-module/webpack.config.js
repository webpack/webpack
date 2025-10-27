"use strict";

const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		new ModuleFederationPlugin({
			name: "consume-mjs-module",
			filename: "remoteEntry.js",
			shared: {
				"test-esm-pkg": {
					version: "1.0.0"
				}
			}
		})
	]
};
