/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const { VariableInfoFlags } = require("../javascript/JavascriptParser");
const memoize = require("../util/memoize");

const getInlineExports = memoize(() => require("../optimize/InlineExports"));

const PARSED_MODULE_TYPES = [
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
];

/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../optimize/InlineExports").InlinedValue} InlinedValue */
/** @typedef {import("../Module").BuildInfo} BuildInfo */

/** @typedef {{ inlineExports: boolean }} ConstValueParserPluginOptions */

// Parser tag for top-level `const X = <primitive>` bindings
const CONST_BINDING_TAG = Symbol("const binding");

const PLUGIN_NAME = "ConstValueParserPlugin";

class ConstValueParserPlugin {
	/**
	 * @param {ConstValueParserPluginOptions} options plugin options
	 */
	constructor(options) {
		this.options = options;
	}

	get parsedModuleTypes() {
		return PARSED_MODULE_TYPES;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		// Only const is tracked; function/class names can be reassigned in sloppy mode.
		// Re-exports always use getters: cross-module bindings may be mutable,
		// and SideEffectsFlagPlugin can rewire connections skipping the template.
		parser.hooks.preDeclarator.tap(PLUGIN_NAME, (declarator, statement) => {
			// Detect top-level `const` declarations:
			// - Tag ALL const bindings with CONST_BINDING_TAG (for const detection via tag system)
			// - Carry inlined primitive value in tag data when eligible (for inline optimization)
			if (statement.kind !== "const") return;
			if (parser.scope.topLevelScope !== true) return;

			if (declarator.id.type === "Identifier") {
				let inlinedValue;
				if (this.options.inlineExports) {
					const InlineExports = getInlineExports();
					if (declarator.init) {
						const evaluated = parser.evaluateExpression(declarator.init);
						inlinedValue = InlineExports.toInlinedValue(evaluated);
					}
				}
				parser.tagVariable(
					declarator.id.name,
					CONST_BINDING_TAG,
					inlinedValue ? { value: inlinedValue } : {},
					VariableInfoFlags.Normal
				);
			} else {
				// Handle destructuring patterns (ObjectPattern, ArrayPattern, etc.)
				parser.enterPattern(declarator.id, (name) => {
					parser.tagVariable(
						name,
						CONST_BINDING_TAG,
						{},
						VariableInfoFlags.Normal
					);
				});
			}
		});
	}
}

module.exports = ConstValueParserPlugin;
module.exports.CONST_BINDING_TAG = CONST_BINDING_TAG;
