/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { VariableInfoFlags } = require("../javascript/JavascriptParser");
const { CONST_BINDING_TAG, toInlinedValue } = require("./InlineExports");

/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./InlineExports").InlinedValue} InlinedValue */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../javascript/JavascriptModule").JavascriptBuildInfo} JavascriptBuildInfo */

const PLUGIN_NAME = "ConstValueParserPlugin";

class ConstValueParserPlugin {
	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		// Only const is tracked; function/class names can be reassigned in sloppy mode.
		// Re-exports always use getters: cross-module bindings may be mutable,
		// and SideEffectsFlagPlugin can rewire connections skipping the template.

		parser.hooks.program.tap(PLUGIN_NAME, () => {
			const buildInfo =
				/** @type {JavascriptBuildInfo | undefined} */
				(parser.state.module.buildInfo);
			if (buildInfo) buildInfo.inlineExports = true;
		});

		// Detect top-level `const` declarations:
		// - Tag ALL const bindings with CONST_BINDING_TAG (for const detection via tag system)
		// - Carry inlined primitive value in tag data when eligible (for inline optimization)
		parser.hooks.preDeclarator.tap(PLUGIN_NAME, (declarator, statement) => {
			if (statement.kind !== "const") return;
			if (parser.scope.topLevelScope !== true) return;

			if (declarator.id.type === "Identifier") {
				let inlinedValue;
				if (declarator.init) {
					const evaluated = parser.evaluateExpression(declarator.init);
					inlinedValue = toInlinedValue(evaluated);
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

		// Propagate inlined constant through evaluator so chained constants and uses see the literal
		parser.hooks.evaluateIdentifier
			.for(CONST_BINDING_TAG)
			.tap(PLUGIN_NAME, (expr) => {
				const tagData =
					/** @type {{ value?: InlinedValue } | undefined} */
					(parser.currentTagData);
				if (!tagData || !tagData.value) return;
				const { value } = tagData;
				const eval_ = new BasicEvaluatedExpression().setRange(
					/** @type {[number, number]} */ (expr.range)
				);
				switch (value.kind) {
					case "null":
						return eval_.setNull();
					case "undefined":
						return eval_.setUndefined();
					case "boolean":
						return eval_.setBoolean(/** @type {boolean} */ (value.value));
					case "number":
						return eval_.setNumber(/** @type {number} */ (value.value));
					case "string":
						return eval_.setString(/** @type {string} */ (value.value));
				}
			});
	}
}

module.exports = ConstValueParserPlugin;
