"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: { module: true },
	target: ["web", "es2022"],
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	module: {
		parser: {
			javascript: {
				importMeta: false
			}
		}
	},
	experiments: {
		html: true,
		buildHttp: {
			allowedUris: [() => true],
			lockfileLocation: path.resolve(__dirname, "./lock-files/lock.json"),
			cacheLocation: path.resolve(__dirname, "./lock-files/test")
		}
	}
};
