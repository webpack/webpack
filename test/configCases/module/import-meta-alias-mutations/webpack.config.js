"use strict";

/** @import { JavascriptParserOptions } from "../../../../declarations/WebpackOptions.js" */
/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {JavascriptParserOptions["importMeta"][]} */
const importMetaOptions = ["preserve-unknown", {}];

/** @type {Configuration[]} */
const configurations = [];

for (const target of ["node", "web", "webworker", "universal"]) {
	for (const importMeta of importMetaOptions) {
		configurations.push({
			target,
			output: { module: true },
			module: {
				parser: { "javascript/auto": { importMeta } }
			}
		});
	}
}

module.exports = configurations;
