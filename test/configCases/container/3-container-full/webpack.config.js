"use strict";

const { ModuleFederationPlugin } = require("../../../../").container;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new ModuleFederationPlugin({
			remoteType: "commonjs-module",
			remotes: {
				containerB: "../1-container-full/container.js"
			},
			shared: ["react"]
		})
	]
};
