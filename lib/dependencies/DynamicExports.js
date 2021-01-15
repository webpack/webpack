/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Parser").ParserState} ParserState */

/** @type {WeakMap<ParserState, boolean>} */
const parserStateExportsState = new WeakMap();

/**
 * @param {ParserState} parserState parser state
 * @returns {void}
 */
exports.bailout = parserState => {
	const value = parserStateExportsState.get(parserState);
	parserStateExportsState.set(parserState, false);
	if (value === true) {
		parserState.module.buildMeta.exportsType = undefined;
		parserState.module.buildMeta.defaultObject = false;
	}
};

/**
 * @param {ParserState} parserState parser state
 * @returns {void}
 */
exports.enable = parserState => {
	const value = parserStateExportsState.get(parserState);
	if (value === false) return;
	parserStateExportsState.set(parserState, true);
	if (value !== true) {
		parserState.module.buildMeta.exportsType = "default";
		parserState.module.buildMeta.defaultObject = "redirect";
	}
};

/**
 * @param {ParserState} parserState parser state
 * @returns {void}
 */
exports.setFlagged = parserState => {
	const value = parserStateExportsState.get(parserState);
	if (value !== true) return;
	const buildMeta = parserState.module.buildMeta;
	if (buildMeta.exportsType === "dynamic") return;
	buildMeta.exportsType = "flagged";
};

/**
 * @param {ParserState} parserState parser state
 * @returns {void}
 */
exports.setDynamic = parserState => {
	const value = parserStateExportsState.get(parserState);
	if (value !== true) return;
	parserState.module.buildMeta.exportsType = "dynamic";
};

/**
 * @param {ParserState} parserState parser state
 * @returns {boolean} true, when enabled
 */
exports.isEnabled = parserState => {
	const value = parserStateExportsState.get(parserState);
	return value === true;
};
