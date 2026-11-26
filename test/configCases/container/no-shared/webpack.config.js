"use strict";

const { ModuleFederationPlugin } = require("../../../../").container;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			filename: "container.js",
			library: { type: "commonjs-module" },
			exposes: ["./module"]
		})
	]
};
