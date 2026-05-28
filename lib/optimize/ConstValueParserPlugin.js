/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { VariableInfoFlags } = require("../javascript/JavascriptParser");
const { INLINED_CONST_TAG, toInlinedValue } = require("./InlineExports");

/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./InlineExports").InlinedValue} InlinedValue */
/** @typedef {import("../Module").BuildInfo} BuildInfo */

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
		/** @type {Set<string> | undefined} */
		let constBindings;

		parser.hooks.program.tap(PLUGIN_NAME, () => {
			constBindings = undefined;
			const buildInfo =
				/** @type {BuildInfo | undefined} */
				(parser.state.module.buildInfo);
			if (buildInfo) buildInfo.inlineExports = true;
		});

		// Detect top-level `const` declarations:
		// - Record ALL const names in constBindings (for value binding optimization)
		// - Tag inline-eligible primitives with INLINED_CONST_TAG (for inline optimization)
		parser.hooks.preDeclarator.tap(PLUGIN_NAME, (declarator, statement) => {
			if (statement.kind !== "const") return;
			if (parser.scope.topLevelScope !== true) return;

			// Record all const bindings for value binding optimization
			if (constBindings === undefined) constBindings = new Set();
			if (declarator.id.type === "Identifier") {
				constBindings.add(declarator.id.name);
			} else {
				// Handle destructuring patterns (ObjectPattern, ArrayPattern, etc.)
				parser.enterPattern(declarator.id, (name) => {
					/** @type {Set<string>} */
					(constBindings).add(name);
				});
			}

			// Tag only simple identifier inline-eligible primitives for inline optimization
			if (declarator.id.type !== "Identifier") return;
			if (!declarator.init) return;
			const evaluated = parser.evaluateExpression(declarator.init);
			const inlinedValue = toInlinedValue(evaluated);
			if (!inlinedValue) return;
			parser.tagVariable(
				declarator.id.name,
				INLINED_CONST_TAG,
				{
					value: inlinedValue
				},
				VariableInfoFlags.Normal
			);
		});

		// Propagate inlined constant through evaluator so chained constants and uses see the literal
		parser.hooks.evaluateIdentifier
			.for(INLINED_CONST_TAG)
			.tap(PLUGIN_NAME, (expr) => {
				const tagData =
					/** @type {{ value: InlinedValue } | undefined} */
					(parser.currentTagData);
				if (!tagData) return;
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

		parser.hooks.finish.tap(PLUGIN_NAME, () => {
			if (constBindings === undefined) return;
			/** @type {BuildInfo} */
			(parser.state.module.buildInfo).constBindings = constBindings;
		});
	}
}

module.exports = ConstValueParserPlugin;
