/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { SyncBailHook } = require("tapable");

/** @import JavascriptParser from "../javascript/JavascriptParser" */
/** @import { CallExpression, Expression, SpreadElement } from "estree" */

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
	// matched by class name, as `createHooksRegistry` does: a parser from another
	// webpack copy has to pass, and requiring the parser here loads it eagerly
	const candidate = /** @type {{ constructor?: { name: string } } | null} */ (
		parser
	);
	if (
		!candidate ||
		!candidate.constructor ||
		candidate.constructor.name !== "JavascriptParser"
	) {
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
