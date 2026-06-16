/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");

const DEFAULT = [
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
];

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ModuleTypeConstants").JavaScriptModuleTypes} JavaScriptModuleTypes */
/** @typedef {import("./JavascriptParser")} JavascriptParser */
/** @typedef {{ apply: (parser: JavascriptParser) => void, parsedModuleTypes: JavaScriptModuleTypes[] }} ParserPlugin */

const PLUGIN_NAME = "JavascriptParserApplyPlugin";

/**
 * Adapts a parser plugin into a compiler plugin: applies it to the JavaScript
 * module types the parser plugin declares via `parsedModuleTypes`.
 */
class JavascriptParserApplyPlugin {
	/**
	 * @param {ParserPlugin} parserPlugin parser plugin applied to each declared JavaScript parser
	 */
	constructor(parserPlugin) {
		this.parserPlugin = parserPlugin;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(_compilation, { normalModuleFactory }) => {
				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					this.parserPlugin.apply(parser);
				};
				for (const type of this.parserPlugin.parsedModuleTypes || DEFAULT) {
					normalModuleFactory.hooks.parser.for(type).tap(PLUGIN_NAME, handler);
				}
			}
		);
	}
}

module.exports = JavascriptParserApplyPlugin;
