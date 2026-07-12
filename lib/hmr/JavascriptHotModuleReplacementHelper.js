/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

import { createRequire } from "node:module";

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";

const require = createRequire(import.meta.url);
/**
 * Generates javascript hmr.
 * @param {string} type unique identifier used for HMR runtime properties
 * @returns {string} HMR runtime code
 */
const generateJavascriptHMR = (type) =>
	Template.getFunctionContent(
		/** @type {typeof import("./JavascriptHotModuleReplacement.runtime.js")} */ (
			require("./JavascriptHotModuleReplacement.runtime.js")
		).default
	)
		.replaceAll("$key$", type)
		.replaceAll("$installedChunks$", "installedChunks")
		.replaceAll("$loadUpdateChunk$", "loadUpdateChunk")
		.replaceAll("$moduleCache$", RuntimeGlobals.moduleCache)
		.replaceAll("$moduleFactories$", RuntimeGlobals.moduleFactories)
		.replaceAll("$ensureChunkHandlers$", RuntimeGlobals.ensureChunkHandlers)
		.replaceAll("$hasOwnProperty$", RuntimeGlobals.hasOwnProperty)
		.replaceAll("$hmrModuleData$", RuntimeGlobals.hmrModuleData)
		.replaceAll(
			"$hmrDownloadUpdateHandlers$",
			RuntimeGlobals.hmrDownloadUpdateHandlers
		)
		.replaceAll(
			"$hmrInvalidateModuleHandlers$",
			RuntimeGlobals.hmrInvalidateModuleHandlers
		);

export { generateJavascriptHMR };
