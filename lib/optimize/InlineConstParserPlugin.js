/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author webpack contributors
*/

"use strict";

const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { INLINED_CONST_TAG, toInlinedValue } = require("./InlineExports");

/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./InlineExports").InlinedValue} InlinedValue */

const PLUGIN_NAME = "InlineConstParserPlugin";

class InlineConstParserPlugin {
	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		// Mark this module as parsed with inline-exports enabled so the rest of the
		// pipeline knows it is safe to inline its exports.
		parser.hooks.program.tap(PLUGIN_NAME, () => {
			const buildInfo =
				/** @type {import("../Module").BuildInfo} */
				(parser.state.module.buildInfo);
			buildInfo.inlineExports = true;
		});

		// Tag top-level `const X = <primitive>` bindings whose initializer is a small primitive constant
		parser.hooks.preDeclarator.tap(PLUGIN_NAME, (declarator, statement) => {
			if (statement.kind !== "const") return;
			if (parser.scope.topLevelScope !== true) return;
			if (declarator.id.type !== "Identifier") return;
			if (!declarator.init) return;
			const evaluated = parser.evaluateExpression(declarator.init);
			const inlinedValue = toInlinedValue(evaluated);
			if (!inlinedValue) return;
			parser.tagVariable(declarator.id.name, INLINED_CONST_TAG, {
				value: inlinedValue
			});
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
	}
}

module.exports = InlineConstParserPlugin;
