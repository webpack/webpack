/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
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
	toConstantDependency
} = require("./javascript/JavascriptParserHelpers");
const { relative } = require("./util/fs");
const { parseResource } = require("./util/identifier");

/** @typedef {import("../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../declarations/WebpackOptions").NodeOptions} NodeOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./NormalModule")} NormalModule */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./javascript/JavascriptParser").Expression} Expression */
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
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions options
				 * @returns {void}
				 */
				const globalHandler = (parser, parserOptions) => {
					if (parserOptions.node === false) return;

					let localOptions = options;
					if (parserOptions.node) {
						localOptions = { ...localOptions, ...parserOptions.node };
					}

					if (localOptions.global !== false) {
						/**
						 * @param {Expression} expr expression
						 * @returns {ConstDependency} const dependency
						 */
						const getGlobalDep = (expr) => {
							if (compilation.outputOptions.environment.globalThis) {
								return new ConstDependency(
									"globalThis",
									/** @type {Range} */ (expr.range)
								);
							}

							return new ConstDependency(
								RuntimeGlobals.global,
								/** @type {Range} */ (expr.range),
								[RuntimeGlobals.global]
							);
						};

						const withWarning = localOptions.global === "warn";

						parser.hooks.expression.for("global").tap(PLUGIN_NAME, (expr) => {
							const dep = getGlobalDep(expr);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);

							if (withWarning) {
								parser.state.module.addWarning(
									new NodeStuffInWebError(
										dep.loc,
										"global",
										"The global namespace object is a Node.js feature and isn't available in browsers."
									)
								);
							}
						});

						parser.hooks.rename.for("global").tap(PLUGIN_NAME, (expr) => {
							const dep = getGlobalDep(expr);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return false;
						});
					}
				};

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions options
				 * @param {{ dirname: string, filename: string }} identifiers options
				 * @returns {void}
				 */
				const dirnameAndFilenameHandler = (
					parser,
					parserOptions,
					{ dirname, filename }
				) => {
					if (parserOptions.node === false) return;

					let localOptions = options;

					if (parserOptions.node) {
						localOptions = { ...localOptions, ...parserOptions.node };
					}

					/**
					 * @param {string} expressionName expression name
					 * @param {(module: NormalModule) => string} fn function
					 * @param {string} identifier identifier
					 * @param {string=} warning warning
					 * @returns {void}
					 */
					const setModuleConstant = (
						expressionName,
						fn,
						identifier,
						warning
					) => {
						parser.hooks.expression
							.for(expressionName)
							.tap({ name: PLUGIN_NAME, stage: -100 }, (expr) => {
								const dep = new CachedConstDependency(
									JSON.stringify(fn(parser.state.module)),
									/** @type {Range} */
									(expr.range),
									identifier
								);
								dep.loc = /** @type {DependencyLocation} */ (expr.loc);
								parser.state.module.addPresentationalDependency(dep);

								// TODO webpack 6 remove
								if (warning) {
									parser.state.module.addWarning(
										new NodeStuffInWebError(dep.loc, expressionName, warning)
									);
								}

								return true;
							});
					};

					/**
					 * @param {string} expressionName expression name
					 * @param {(value: string) => string} fn function
					 * @param {"dirname" | "filename"} property property
					 * @returns {void}
					 */
					const setUrlModuleConstant = (expressionName, fn, property) => {
						parser.hooks.expression
							.for(expressionName)
							.tap(PLUGIN_NAME, (expr) => {
								const { importMetaName, environment, module } =
									compilation.outputOptions;

								if (
									module &&
									importMetaName === "import.meta" &&
									expressionName.startsWith("import.meta") &&
									environment.importMetaDirnameAndFilename
								) {
									return true;
								}

								const dep = environment.importMetaDirnameAndFilename
									? new CachedConstDependency(
											`${compilation.outputOptions.importMetaName}.${property}`,
											/** @type {Range} */
											(expr.range),
											`__webpack_${property}__`
										)
									: new ExternalModuleDependency(
											"url",
											[
												{
													name: "fileURLToPath",
													value: "__webpack_fileURLToPath__"
												}
											],
											undefined,
											fn("__webpack_fileURLToPath__"),
											/** @type {Range} */ (expr.range),
											`__webpack_${property}__`
										);
								dep.loc = /** @type {DependencyLocation} */ (expr.loc);
								parser.state.module.addPresentationalDependency(dep);

								return true;
							});
					};

					/**
					 * @param {string} expressionName expression name
					 * @param {string} value value
					 * @param {string} identifier identifier
					 * @param {string=} warning warning
					 * @returns {void}
					 */
					const setConstant = (expressionName, value, identifier, warning) =>
						setModuleConstant(expressionName, () => value, identifier, warning);

					const context = compiler.context;

					if (localOptions.__filename) {
						switch (localOptions.__filename) {
							case "mock":
								setConstant(filename, "/index.js", "__webpack_filename__");
								break;
							case "warn-mock":
								setConstant(
									filename,
									"/index.js",
									"__webpack_filename__",
									"__filename is a Node.js feature and isn't available in browsers."
								);
								break;
							case "node-module": {
								const importMetaName = compilation.outputOptions.importMetaName;

								setUrlModuleConstant(
									filename,
									(functionName) => `${functionName}(${importMetaName}.url)`,
									"filename"
								);
								break;
							}
							case "eval-only":
								if (filename === "import.meta.filename") {
									parser.hooks.expression
										.for(filename)
										.tap(
											PLUGIN_NAME,
											toConstantDependency(parser, "__filename")
										);
								}
								break;
							case true:
								setModuleConstant(
									filename,
									(module) =>
										relative(
											/** @type {InputFileSystem} */ (compiler.inputFileSystem),
											context,
											module.resource
										),
									"__webpack_filename__"
								);
								break;
						}

						parser.hooks.evaluateIdentifier
							.for("__filename")
							.tap(PLUGIN_NAME, (expr) => {
								if (!parser.state.module) return;
								const resource = parseResource(parser.state.module.resource);
								return evaluateToString(resource.path)(expr);
							});
					}
					if (localOptions.__dirname) {
						switch (localOptions.__dirname) {
							case "mock":
								setConstant(dirname, "/", "__webpack_dirname__");
								break;
							case "warn-mock":
								setConstant(
									dirname,
									"/",
									"__webpack_dirname__",
									"__dirname is a Node.js feature and isn't available in browsers."
								);
								break;
							case "node-module": {
								const importMetaName = compilation.outputOptions.importMetaName;

								setUrlModuleConstant(
									dirname,
									(functionName) =>
										`${functionName}(${importMetaName}.url.replace(/\\/(?:[^\\/]*)$/, ""))`,
									"dirname"
								);
								break;
							}
							case "eval-only":
								if (dirname === "import.meta.dirname") {
									parser.hooks.expression
										.for(dirname)
										.tap(
											PLUGIN_NAME,
											toConstantDependency(parser, "__dirname")
										);
								}
								break;
							case true:
								setModuleConstant(
									dirname,
									(module) =>
										relative(
											/** @type {InputFileSystem} */ (compiler.inputFileSystem),
											context,
											/** @type {string} */ (module.context)
										),
									"__webpack_dirname__"
								);
								break;
						}

						parser.hooks.evaluateIdentifier
							.for(dirname)
							.tap(PLUGIN_NAME, (expr) => {
								if (!parser.state.module) return;
								return evaluateToString(
									/** @type {string} */
									(parser.state.module.context)
								)(expr);
							});
					}
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, (parser, parserOptions) => {
						globalHandler(parser, parserOptions);
						dirnameAndFilenameHandler(parser, parserOptions, {
							dirname: "__dirname",
							filename: "__filename"
						});
						dirnameAndFilenameHandler(parser, parserOptions, {
							dirname: "import.meta.dirname",
							filename: "import.meta.filename"
						});
					});
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, (parser, parserOptions) => {
						globalHandler(parser, parserOptions);
						dirnameAndFilenameHandler(parser, parserOptions, {
							dirname: "__dirname",
							filename: "__filename"
						});
					});
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, (parser, parserOptions) => {
						globalHandler(parser, parserOptions);
						dirnameAndFilenameHandler(parser, parserOptions, {
							dirname: "import.meta.dirname",
							filename: "import.meta.filename"
						});
					});
			}
		);
	}
}

module.exports = NodeStuffPlugin;
