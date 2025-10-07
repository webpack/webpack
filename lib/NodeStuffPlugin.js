/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	Author Aviv Keller @avivkeller
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");
const NodeStuffInWebError = require("./NodeStuffInWebError");
const RuntimeGlobals = require("./RuntimeGlobals");
const CachedConstDependency = require("./dependencies/CachedConstDependency");
const ConstDependency = require("./dependencies/ConstDependency");
const ExternalModuleDependency = require("./dependencies/ExternalModuleDependency");
const {
	evaluateToString,
	expressionIsUnsupported,
	toConstantDependency
} = require("./javascript/JavascriptParserHelpers");
const { relative } = require("./util/fs");
const { parseResource } = require("./util/identifier");

/** @typedef {import("../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../declarations/WebpackOptions").NodeOptions} NodeOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./javascript/BasicEvaluatedExpression")} BasicEvaluatedExpression */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("./NormalModule")} NormalModule */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./javascript/JavascriptParser").Range} Range */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

const PLUGIN_NAME = "NodeStuffPlugin";

class NodeStuffPlugin {
	/**
	 * @param {NodeOptions} options options
	 */
	constructor(options) {
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ExternalModuleDependency,
					new ExternalModuleDependency.Template()
				);

				/**
				 * @param {string} mode mode
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions options
				 * @returns {void}
				 */
				const handler = (mode, parser, parserOptions) => {
					if (parserOptions.node === false) return;

					let localOptions = options;
					if (parserOptions.node) {
						localOptions = { ...localOptions, ...parserOptions.node };
					}

					const isESM =
						mode === JAVASCRIPT_MODULE_TYPE_DYNAMIC ||
						mode === JAVASCRIPT_MODULE_TYPE_AUTO;

					const isCJS =
						mode === JAVASCRIPT_MODULE_TYPE_DYNAMIC ||
						mode === JAVASCRIPT_MODULE_TYPE_AUTO;

					const context = compiler.context;
					const inputFileSystem = /** @type {InputFileSystem} */ (
						compiler.inputFileSystem
					);

					/**
					 * Get path value based on option type
					 * @param {string | boolean} type Option value
					 * @param {string} mockPath Mock path to return
					 * @param {() => string} realPath Function to get real path
					 * @returns {string} path
					 */
					const getPathValue = (type, mockPath, realPath) => {
						if (type === true) {
							return JSON.stringify(realPath());
						}

						return JSON.stringify(mockPath);
					};

					/**
					 * Get filename value
					 * @param {string | boolean} type Option value
					 * @param {NormalModule} module Module
					 * @returns {string} filename
					 */
					const getFilename = (type, module) =>
						getPathValue(type, "/index.js", () =>
							relative(inputFileSystem, context, module.resource)
						);

					/**
					 * Get dirname value
					 * @param {string | boolean} type Option value
					 * @param {NormalModule} module Module
					 * @returns {string} directory name
					 */
					const getDirname = (type, module) =>
						getPathValue(type, "/", () =>
							relative(
								inputFileSystem,
								context,
								/** @type {string} */ (module.context)
							)
						);

					/**
					 * Create expression handler that adds a dependency
					 * @param {string | boolean} optionValue Option value
					 * @param {(module: NormalModule) => string} valueGetter Value getter
					 * @param {string} propertyName Property name
					 * @param {boolean=} cache cache
					 * @returns {(expr: Expression, allowEmits?: boolean) => boolean} handler
					 */
					const createDependencyHandler = (
						optionValue,
						valueGetter,
						propertyName,
						cache = true
					) => {
						const DepClass = cache ? CachedConstDependency : ConstDependency;
						const prop = cache ? propertyName : [propertyName];

						const withWarning =
							optionValue === "warn-mock" || optionValue === "warn";

						return (expr, allowEmits = true) => {
							const dep = new DepClass(
								valueGetter(parser.state.module),
								/** @type {Range} */ (expr.range),
								/** @type {EXPECTED_ANY} */ (prop)
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);

							// TODO webpack 6 remove
							if (withWarning && allowEmits) {
								const isGlobalObject = propertyName === RuntimeGlobals.global;

								parser.state.module.addWarning(
									new NodeStuffInWebError(
										dep.loc,
										isGlobalObject ? "global" : propertyName,
										`${isGlobalObject ? "The global namespace" : propertyName} is a Node.js feature and isn't available in browsers.`
									)
								);
							}

							return true;
						};
					};

					/**
					 * Create expression handler for node-module mode
					 * @param {string} propertyName Property name
					 * @returns {(expr: Expression) => boolean} handler
					 */
					const createNodeModuleHandler = (propertyName) => {
						const importMetaName = compilation.outputOptions.importMetaName;
						const expression =
							propertyName === "__filename"
								? `__webpack_fileURLToPath__(${importMetaName}.url)`
								: `__webpack_fileURLToPath__(${importMetaName}.url + "/..").slice(0, -1)`;

						return (expr) => {
							const dep = new ExternalModuleDependency(
								"url",
								[{ name: "fileURLToPath", value: "__webpack_fileURLToPath__" }],
								undefined,
								expression,
								/** @type {Range} */ (expr.range),
								propertyName
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						};
					};

					/**
					 * Create evaluateIdentifier handler for global properties
					 * @param {string} propertyName Property name
					 * @returns {(expr: Expression) => BasicEvaluatedExpression} handler
					 */
					const createEvaluateIdentifierHandler = (propertyName) => {
						if (propertyName === "__filename") {
							return (expr) => {
								const { path } = parseResource(parser.state.module.resource);
								return evaluateToString(path)(expr);
							};
						}

						return (expr) =>
							evaluateToString(
								/** @type {string} */ (parser.state.module.context)
							)(expr);
					};

					/**
					 * Define import.meta properties
					 * @param {string} propertyName Property name (e.g., "filename", "dirname")
					 * @param {string | boolean} optionValue Option value
					 * @param {(type: string | boolean, module: NormalModule) => string} getter Value getter
					 */
					const defineImportMetaProperty = (
						propertyName,
						optionValue,
						getter
					) => {
						const fullName = `import.meta.${propertyName}`;

						if (propertyName !== "eval-only") {
							parser.hooks.expression.for(fullName).tap(
								PLUGIN_NAME,
								createDependencyHandler(
									optionValue,
									(module) => getter(optionValue, module),
									fullName,
									false
								)
							);
						}

						parser.hooks.typeof
							.for(fullName)
							.tap(
								PLUGIN_NAME,
								toConstantDependency(parser, JSON.stringify("string"))
							);
						parser.hooks.evaluateTypeof
							.for(fullName)
							.tap(PLUGIN_NAME, evaluateToString("string"));
						parser.hooks.evaluateIdentifier
							.for(fullName)
							.tap(PLUGIN_NAME, (expr) => {
								const value = getter(optionValue, parser.state.module);
								return evaluateToString(value)(expr);
							});
					};

					/**
					 * Define global properties like __filename and __dirname
					 * @param {string} propertyName Property name
					 * @param {string | boolean} optionValue Option value
					 * @param {(type: string | boolean, module: NormalModule) => string} getter Value getter
					 */
					const defineGlobalProperty = (propertyName, optionValue, getter) => {
						if (optionValue !== "eval-only") {
							parser.hooks.expression
								.for(propertyName)
								.tap(
									PLUGIN_NAME,
									optionValue === "node-module"
										? createNodeModuleHandler(propertyName)
										: createDependencyHandler(
												optionValue,
												(module) => getter(optionValue, module),
												propertyName
											)
								);
						}

						parser.hooks.evaluateIdentifier
							.for(propertyName)
							.tap(PLUGIN_NAME, createEvaluateIdentifierHandler(propertyName));
					};

					/**
					 * Setup property handlers
					 * @param {keyof NodeOptions} propertyName Property name (e.g., "__filename", "__dirname")
					 * @param {(type: string | boolean, module: NormalModule) => string} getter Value getter
					 */
					const setupProperty = (propertyName, getter) => {
						const optionValue = localOptions[propertyName];
						if (!optionValue) return;

						if (isCJS) {
							defineGlobalProperty(propertyName, optionValue, getter);
						}

						// Handle import.meta version
						if (isESM) {
							const importMetaPropertyName = propertyName.slice(2); // Remove "__" prefix
							defineImportMetaProperty(
								importMetaPropertyName,
								optionValue,
								getter
							);
						}
					};

					if (isCJS) {
						// Handle global
						if (localOptions.global !== false) {
							const global = compilation.outputOptions.environment.globalThis
								? "globalThis"
								: RuntimeGlobals.global;

							const renameHandler = createDependencyHandler(
								/** @type {string} */ (localOptions.global),
								() => global,
								global,
								false
							);

							parser.hooks.expression
								.for("global")
								.tap(PLUGIN_NAME, renameHandler);
							parser.hooks.rename.for("global").tap(PLUGIN_NAME, (expr) => {
								renameHandler(expr, false);
								return false;
							});
						}

						// Handle require.extensions
						parser.hooks.expression
							.for("require.extensions")
							.tap(
								PLUGIN_NAME,
								expressionIsUnsupported(
									parser,
									"require.extensions is not supported by webpack. Use a loader instead."
								)
							);
					}

					// Setup __filename and __dirname
					setupProperty("__filename", getFilename);
					setupProperty("__dirname", getDirname);
				};

				// Register handlers
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, (a, b) =>
						handler(JAVASCRIPT_MODULE_TYPE_AUTO, a, b)
					);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, (a, b) =>
						handler(JAVASCRIPT_MODULE_TYPE_ESM, a, b)
					);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, (a, b) =>
						handler(JAVASCRIPT_MODULE_TYPE_DYNAMIC, a, b)
					);
			}
		);
	}
}

module.exports = NodeStuffPlugin;
