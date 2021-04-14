/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { WebpackError } = require("..");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const EntryOptionPlugin = require("../EntryOptionPlugin");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const formatLocation = require("../formatLocation");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { resolveByProperty } = require("../util/cleverMerge");
const { contextify } = require("../util/identifier");
const AsyncEntryDependency = require("./AsyncEntryDependency");

/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserAsyncEntryDescription} JavascriptParserAsyncEntryDescription */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Entrypoint").EntryOptions} EntryOptions */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./HarmonyImportDependencyParserPlugin").HarmonySettings} HarmonySettings */

const DEFAULT_ENTRIES = {};

class AsyncEntriesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const cachedContextify = contextify.bindContextCache(
			compiler.context,
			compiler.root
		);
		compiler.hooks.thisCompilation.tap(
			"AsyncEntriesPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					AsyncEntryDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					AsyncEntryDependency,
					new AsyncEntryDependency.Template()
				);

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {object} parserOptions options
				 */
				const parserPlugin = (parser, parserOptions) => {
					if (parserOptions.entries === false) return;
					const entries = /** @type {Record<string, JavascriptParserAsyncEntryDescription>} */ (parserOptions.entries);
					for (const key of Object.keys({
						...DEFAULT_ENTRIES,
						...entries
					})) {
						const userOptions = entries[key];
						parser.hooks.call.for(key).tap("AsyncEntriesPlugin", expr => {
							const evaluatedArgs = expr.arguments.map(arg =>
								arg.type === "SpreadElement"
									? new BasicEvaluatedExpression()
									: parser.evaluateExpression(arg)
							);
							if (!evaluatedArgs.every(arg => arg.isCompileTimeValue())) {
								const error = new UnsupportedFeatureWarning(
									`Call to async entrypoint function ${key} has non-constant values`,
									expr.loc
								);
								parser.state.module.addError(error);
								return;
							}
							const args = evaluatedArgs.map(arg => arg.asCompileTimeValue());
							const options = resolveByProperty(
								userOptions,
								"byArguments",
								{ expression: expr },
								...args
							);
							if (options === false) return;
							const {
								request = args[0],
								dependencyType = "import",
								entryOptions: entryDescription,
								return: returnValue,
								value
							} = options;
							if (value !== undefined && returnValue !== undefined) {
								const err = new WebpackError(
									`'value' and 'return' specified for options for async entrypoint '${key}'`
								);
								err.loc = expr.loc;
								throw err;
							}

							const entryOptions = EntryOptionPlugin.entryDescriptionToOptions(
								compiler,
								entryDescription.name,
								entryDescription
							);

							if (!entryOptions.runtime && !entryOptions.runtimeName) {
								entryOptions.runtimeName = `${cachedContextify(
									parser.state.module.identifier()
								)}|${formatLocation(expr.loc)}`;
							}

							const block = new AsyncDependenciesBlock({
								name: entryOptions.name,
								entryOptions
							});
							block.loc = expr.loc;
							const dep = new AsyncEntryDependency(
								request,
								dependencyType,
								expr.range,
								returnValue !== undefined
									? returnValue
									: typeof value === "string"
									? `value ${value}`
									: value
							);
							dep.loc = expr.loc;
							block.addDependency(dep);
							parser.state.module.addBlock(block);
							return true;
						});
					}
				};
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("AsyncEntriesPlugin", parserPlugin);
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("AsyncEntriesPlugin", parserPlugin);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("AsyncEntriesPlugin", parserPlugin);
			}
		);
	}
}
module.exports = AsyncEntriesPlugin;
