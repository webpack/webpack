/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");

/** @import { BuildInfo } from "../Module" */
/**
 * @import {
 * 	JavascriptModuleBuildMeta
 * } from "../javascript/JavascriptModule"
 */
/** @import { JavascriptParserState } from "../javascript/JavascriptParser" */

/** @type {WeakMap<JavascriptParserState, boolean>} */
const parserStateExportsState = new WeakMap();

/**
 * Processes the provided parser state.
 * @param {JavascriptParserState} parserState parser state
 * @param {boolean} isStrictHarmony strict harmony mode should be enabled
 * @returns {void}
 */
module.exports.enable = (parserState, isStrictHarmony) => {
	const value = parserStateExportsState.get(parserState);
	if (value === false) return;
	parserStateExportsState.set(parserState, true);
	if (value !== true) {
		const buildMeta =
			/** @type {JavascriptModuleBuildMeta} */
			(parserState.module.buildMeta);
		buildMeta.exportsType = "namespace";
		const buildInfo = /** @type {BuildInfo} */ (parserState.module.buildInfo);
		buildInfo.strict = true;
		buildInfo.exportsArgument = RuntimeGlobals.exports;
		if (isStrictHarmony) {
			buildMeta.strictHarmonyModule = true;
			buildInfo.moduleArgument = "__webpack_module__";
		}
	}
};

/**
 * Returns true, when enabled.
 * @param {JavascriptParserState} parserState parser state
 * @returns {boolean} true, when enabled
 */
module.exports.isEnabled = (parserState) => {
	const value = parserStateExportsState.get(parserState);
	return value === true;
};
