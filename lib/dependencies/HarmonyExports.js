/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("../Parser").ParserState} ParserState */

/** @type {WeakMap<ParserState, boolean>} */
const parserStateExportsState = new WeakMap();

/**
 * @param {ParserState} parserState parser state
 * @param {boolean} isStrictHarmony strict harmony mode should be enabled
 * @returns {void}
 */
exports.enable = (parserState, isStrictHarmony) => {
	const value = parserStateExportsState.get(parserState);
	if (value === false) return;
	parserStateExportsState.set(parserState, true);
	if (value !== true) {
		parserState.module.buildMeta.exportsType = "namespace";
		parserState.module.buildInfo.strict = true;
		parserState.module.buildInfo.exportsArgument = RuntimeGlobals.exports;
		if (isStrictHarmony) {
			parserState.module.buildMeta.strictHarmonyModule = true;
			parserState.module.buildInfo.moduleArgument = "__webpack_module__";
		}
	}
};

/**
 * @param {ParserState} parserState parser state
 * @returns {boolean} true, when enabled
 */
exports.isEnabled = parserState => {
	const value = parserStateExportsState.get(parserState);
	return value === true;
};
