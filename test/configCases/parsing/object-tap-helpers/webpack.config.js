"use strict";

const ConstDependency = require("../../../../lib/dependencies/core/ConstDependency");
const {
	approve,
	evaluateToBoolean,
	evaluateToIdentifier,
	evaluateToNumber,
	evaluateToString,
	expressionIsUnsupported,
	getArgumentsRange,
	skipTraversal,
	toConstantDependency
} = require("../../../../lib/javascript/JavascriptParserHelpers");

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @typedef {import("../../../../lib/javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../../../../lib/javascript/JavascriptParser").Range} Range */

const PLUGIN_NAME = "object-tap-helpers";

/**
 * Taps the parser the way a plugin outside webpack does: without `path`, with
 * the object-form helpers, so each hook hands it ESTree objects.
 * @param {JavascriptParser} parser the parser
 * @returns {void}
 */
const tapParser = (parser) => {
	parser.hooks.evaluateTypeof
		.for("HELPER_FLAG")
		.tap(PLUGIN_NAME, evaluateToString("string"));
	parser.hooks.typeof
		.for("HELPER_FLAG")
		.tap(PLUGIN_NAME, toConstantDependency(parser, JSON.stringify("string")));
	parser.hooks.evaluateIdentifier
		.for("HELPER_ON")
		.tap(PLUGIN_NAME, evaluateToBoolean(true));
	parser.hooks.expression
		.for("HELPER_ON")
		.tap(PLUGIN_NAME, toConstantDependency(parser, "true"));
	parser.hooks.evaluateIdentifier
		.for("HELPER_COUNT")
		.tap(PLUGIN_NAME, evaluateToNumber(3));
	parser.hooks.expression
		.for("HELPER_COUNT")
		.tap(PLUGIN_NAME, toConstantDependency(parser, "3"));
	for (const [
		name,
		truthy
	] of /** @type {[string, boolean | null | undefined][]} */ ([
		["HELPER_TRUTHY", true],
		["HELPER_FALSY", false],
		["HELPER_NULLISH", null],
		["HELPER_UNKNOWN", undefined]
	])) {
		parser.hooks.evaluateIdentifier.for(name).tap(
			PLUGIN_NAME,
			evaluateToIdentifier(name, name, () => [], truthy)
		);
	}
	parser.hooks.expression
		.for("HELPER_UNSUPPORTED")
		.tap(
			PLUGIN_NAME,
			expressionIsUnsupported(parser, "HELPER_UNSUPPORTED is not supported")
		);
	parser.hooks.evaluateTypeof
		.for("HELPER_OBJECT.member")
		.tap(PLUGIN_NAME, evaluateToString("number"));
	parser.hooks.typeof
		.for("HELPER_OBJECT.member")
		.tap(PLUGIN_NAME, toConstantDependency(parser, JSON.stringify("number")));
	// a label tap taking the statement leaves its body unwalked
	parser.hooks.label.for("helperLabel").tap(PLUGIN_NAME, () => true);
	parser.hooks.canRename.for("HELPER_TRUTHY").tap(PLUGIN_NAME, approve);
	parser.hooks.expression
		.for("HELPER_TRUTHY")
		.tap(PLUGIN_NAME, toConstantDependency(parser, "true"));
	parser.hooks.call.for("Number").tap(PLUGIN_NAME, skipTraversal);
	parser.hooks.call.for("String").tap(PLUGIN_NAME, (expression) => {
		const dep = new ConstDependency(
			"42",
			getArgumentsRange(
				parser,
				/** @type {import("estree").CallExpression} */ (expression)
			)
		);
		dep.loc = parser.getLocation(expression);
		parser.state.module.addPresentationalDependency(dep);
		return true;
	});
};

/**
 * Taps every JavaScript parser the compilation makes.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const plugin = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			normalModuleFactory.hooks.parser
				.for("javascript/auto")
				.tap(PLUGIN_NAME, (parser) =>
					tapParser(/** @type {JavascriptParser} */ (parser))
				);
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [plugin]
};
