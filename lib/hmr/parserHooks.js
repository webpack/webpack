/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { SyncBailHook } = require("tapable");
const JavascriptParser = require("../javascript/JavascriptParser");

/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").SpreadElement} SpreadElement */

/** @typedef {string[]} Requests */

/**
 * Defines the hmr javascript parser hooks type used by this module.
 * @typedef {object} HMRJavascriptParserHooks
 * @property {SyncBailHook<[Expression | SpreadElement, Requests], void>} hotAcceptCallback
 * @property {SyncBailHook<[CallExpression, Requests], void>} hotAcceptWithoutCallback
 */

/** @type {WeakMap<JavascriptParser, HMRJavascriptParserHooks>} */
const parserHooksMap = new WeakMap();

/**
 * Returns the attached hooks.
 * @param {JavascriptParser} parser the parser
 * @returns {HMRJavascriptParserHooks} the attached hooks
 */
const getParserHooks = (parser) => {
	if (!(parser instanceof JavascriptParser)) {
		throw new TypeError(
			"The 'parser' argument must be an instance of JavascriptParser"
		);
	}
	let hooks = parserHooksMap.get(parser);
	if (hooks === undefined) {
		hooks = {
			hotAcceptCallback: new SyncBailHook(["expression", "requests"]),
			hotAcceptWithoutCallback: new SyncBailHook(["expression", "requests"])
		};
		parserHooksMap.set(parser, hooks);
	}
	return hooks;
};

module.exports = getParserHooks;
