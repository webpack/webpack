"use strict";

const { ContainerPlugin } = require("../../../../").container;
const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new ContainerPlugin({
			name: "container",
			filename: "container-file.js",
			library: {
				type: "commonjs-module"
			},
			exposes: {
				"./test": "./test"
			}
		}),
		new ConsumeSharedPlugin({
			consumes: {
				"./value": {
					shareKey: "value"
				}
			}
		})
	]
};
