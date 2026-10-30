/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");

const Template = require("../template/Template");

/**
 * Removes the code a runtime without chunk handlers never runs: it is guarded by them.
 * A part that no longer matches stays, still behind its guard, so the code stays correct.
 * @param {string} content HMR runtime template code
 * @returns {string} the code without its chunk handler parts
 */
const withoutEnsureChunkHandlers = (content) =>
	content
		.replace(/\n\tif \(\$ensureChunkHandlers\$\) delete [^\n]*/, "")
		.replace(
			/\n\tif \(\$ensureChunkHandlers\$\) \{\n[\s\S]*?\n\t\}(?=\n\};\s*$)/,
			""
		);

/**
 * Generates javascript hmr.
 * @param {string} type unique identifier used for HMR runtime properties
 * @param {boolean} withEnsureChunkHandlers true, when the runtime has chunk handlers
 * @returns {string} HMR runtime code
 */
const generateJavascriptHMR = (type, withEnsureChunkHandlers) => {
	const content = Template.getFunctionContent(
		require("../hmr/JavascriptHotModuleReplacement.runtime")
	);
	return (
		withEnsureChunkHandlers ? content : withoutEnsureChunkHandlers(content)
	)
		.replace(/\$key\$/g, type)
		.replace(/\$installedChunks\$/g, "installedChunks")
		.replace(/\$loadUpdateChunk\$/g, "loadUpdateChunk")
		.replace(/\$moduleCache\$/g, RuntimeGlobals.moduleCache)
		.replace(/\$moduleFactories\$/g, RuntimeGlobals.moduleFactories)
		.replace(/\$ensureChunkHandlers\$/g, RuntimeGlobals.ensureChunkHandlers)
		.replace(/\$hasOwnProperty\$/g, RuntimeGlobals.hasOwnProperty)
		.replace(/\$hmrModuleData\$/g, RuntimeGlobals.hmrModuleData)
		.replace(
			/\$hmrDownloadUpdateHandlers\$/g,
			RuntimeGlobals.hmrDownloadUpdateHandlers
		)
		.replace(
			/\$hmrInvalidateModuleHandlers\$/g,
			RuntimeGlobals.hmrInvalidateModuleHandlers
		);
};

module.exports.generateJavascriptHMR = generateJavascriptHMR;
