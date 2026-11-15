"use strict";

const AMDDefineDependencyParserPlugin = require("../../../../lib/dependencies/amd/AMDDefineDependencyParserPlugin");
const AMDRequireDependenciesBlockParserPlugin = require("../../../../lib/dependencies/amd/AMDRequireDependenciesBlockParserPlugin");
const CommonJsImportsParserPlugin = require("../../../../lib/dependencies/commonjs/CommonJsImportsParserPlugin");

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @typedef {import("../../../../lib/javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../../../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("estree").CallExpression} CallExpression */

const PLUGIN_NAME = "object-api-plugins";

/**
 * Taps the parser with the public object-form handlers a plugin outside webpack
 * builds on, under names of its own, so each handler gets ESTree objects.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptParserOptions} options the resolved parser options
 * @returns {void}
 */
const tapParser = (parser, options) => {
	const getContext = () => undefined;
	parser.hooks.call
		.for("customRequire")
		.tap(
			PLUGIN_NAME,
			CommonJsImportsParserPlugin.createRequireHandler(
				parser,
				options,
				getContext
			)(false)
		);
	parser.hooks.expression
		.for("customRequire")
		.tap(
			PLUGIN_NAME,
			CommonJsImportsParserPlugin.createRequireAsExpressionHandler(
				parser,
				options,
				getContext
			)
		);
	parser.hooks.expression
		.for("customRequire.cache")
		.tap(
			PLUGIN_NAME,
			CommonJsImportsParserPlugin.createRequireCacheDependency(parser)
		);
	const processResolve =
		CommonJsImportsParserPlugin.createProcessResolveHandler(
			parser,
			options,
			getContext
		);
	parser.hooks.call
		.for("customRequire.resolve")
		.tap(PLUGIN_NAME, (expression) =>
			processResolve(/** @type {CallExpression} */ (expression), false)
		);
	const amd = new AMDRequireDependenciesBlockParserPlugin(options);
	parser.hooks.call
		.for("customAmdRequire")
		.tap(PLUGIN_NAME, (expression) =>
			amd.processCallRequire(parser, /** @type {CallExpression} */ (expression))
		);
	const define = new AMDDefineDependencyParserPlugin(options);
	parser.hooks.call
		.for("customDefine")
		.tap(PLUGIN_NAME, (expression) =>
			define.processCallDefine(
				parser,
				/** @type {CallExpression} */ (expression)
			)
		);
	parser.hooks.call.for("customFunction").tap(PLUGIN_NAME, (expression) => {
		for (const argument of /** @type {CallExpression} */ (expression)
			.arguments) {
			amd.processFunctionArgument(parser, argument);
		}
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
				.tap(PLUGIN_NAME, (parser, options) =>
					tapParser(/** @type {JavascriptParser} */ (parser), options)
				);
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [plugin]
};
