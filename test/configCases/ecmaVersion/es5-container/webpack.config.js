"use strict";

const { ModuleFederationPlugin } = require("../../../../").container;

/** @import { Configuration } from "../../../../" */

// The container and sharing runtime modules — the largest block of generated
// code webpack ships, and the one with the most branches to keep es5.
/** @type {Configuration} */
module.exports = {
	target: ["web", "es5"],
	output: {
		chunkFilename: "[name].js",
		uniqueName: "es5-container"
	},
	optimization: {
		chunkIds: "named"
	},
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			filename: "remote.js",
			exposes: {
				"./exposed": "./exposed"
			},
			shared: {
				"./shared": {
					eager: true,
					singleton: true,
					requiredVersion: false
				}
			}
		})
	]
};
