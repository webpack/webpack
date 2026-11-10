"use strict";

/** @import { JavascriptParserOptions } from "../../../../declarations/WebpackOptions" */

/** @type {JavascriptParserOptions["importMeta"][]} */
const importMetaOptions = ["preserve-unknown", {}];

/** @type {import("../../../../types").Configuration[]} */
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
