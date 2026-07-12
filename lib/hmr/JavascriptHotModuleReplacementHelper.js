/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");

const Template = require("../Template");

/**
 * Generates javascript hmr.
 * @param {string} type unique identifier used for HMR runtime properties
 * @returns {string} HMR runtime code
 */
const generateJavascriptHMR = (type) =>
	Template.getFunctionContent(
		require("../hmr/JavascriptHotModuleReplacement.runtime")
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

module.exports.generateJavascriptHMR = generateJavascriptHMR;
