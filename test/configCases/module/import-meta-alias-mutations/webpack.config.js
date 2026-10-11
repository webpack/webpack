"use strict";

/** @import { JavascriptParserOptions } from "../../../../declarations/WebpackOptions" */

/** @type {JavascriptParserOptions["importMeta"][]} */
const importMetaOptions = ["preserve-unknown", {}];

/** @type {import("../../../../types").Configuration[]} */
module.exports = ["node", "web", "webworker", "universal"].flatMap((target) =>
	importMetaOptions.map((importMeta) => ({
		target,
		output: { module: true },
		module: {
			parser: { "javascript/auto": { importMeta } }
		}
	}))
);
