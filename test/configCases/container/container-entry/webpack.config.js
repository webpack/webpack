"use strict";

const { ContainerPlugin } = require("../../../../").container;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		pathinfo: true
	},
	plugins: [
		new ContainerPlugin({
			name: "container",
			filename: "container-file.js",
			library: {
				type: "commonjs-module"
			},
			exposes: {
				"./test": "./test",
				"./test2": ["./init-module", "./test2"],
				".": "./main"
			}
		})
	]
};
