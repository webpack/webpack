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
const ExternalModuleInitFragmentDependency = require("./dependencies/ExternalModuleInitFragmentDependency");
const ImportMetaPlugin = require("./dependencies/ImportMetaPlugin");
const { evaluateToString } = require("./javascript/JavascriptParserHelpers");
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
const URL_MODULE_CONSTANT_FUNCTION_NAME = "__webpack_fileURLToPath__";

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
		const { options } = this;

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ExternalModuleDependency,
					new ExternalModuleDependency.Template()
				);
				compilation.dependencyTemplates.set(
					ExternalModuleInitFragmentDependency,
					new ExternalModuleInitFragmentDependency.Template()
				);

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {NodeOptions} nodeOptions options
				 * @returns {void}
				 */
				const globalHandler = (parser, nodeOptions) => {
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

					const withWarning = nodeOptions.global === "warn";

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
				};

				const hooks = ImportMetaPlugin.getCompilationHooks(compilation);

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {"__filename" | "__dirname" | "import.meta.filename" | "import.meta.dirname"} expressionName expression name
				 * @param {(module: NormalModule) => string} fn function
				 * @param {"filename" | "dirname"} property a property
				 * @returns {void}
				 */
				const setModuleConstant = (parser, expressionName, fn, property) => {
					parser.hooks.expression
						.for(expressionName)
						.tap(PLUGIN_NAME, (expr) => {
							const dep = new ConstDependency(
								fn(parser.state.module),
								/** @type {Range} */
								(expr.range)
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					if (
						expressionName === "import.meta.filename" ||
						expressionName === "import.meta.dirname"
					) {
						hooks.propertyInDestructuring.tap(PLUGIN_NAME, (usingProperty) => {
							if (usingProperty.id === property) {
								return `${property}: ${fn(parser.state.module)},`;
							}
						});
					}
				};

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {"__filename" | "__dirname" | "import.meta.filename" | "import.meta.dirname"} expressionName expression name
				 * @param {(module: NormalModule) => string} fn function
				 * @param {"filename" | "dirname"} property a property
				 * @param {string=} warning warning
				 * @returns {void}
				 */
				const setCachedModuleConstant = (
					parser,
					expressionName,
					fn,
					property,
					warning
				) => {
					parser.hooks.expression
						.for(expressionName)
						.tap(PLUGIN_NAME, (expr) => {
							const dep = new CachedConstDependency(
								JSON.stringify(fn(parser.state.module)),
								/** @type {Range} */
								(expr.range),
								`__webpack_${property}__`
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);

							if (warning) {
								parser.state.module.addWarning(
									new NodeStuffInWebError(dep.loc, expressionName, warning)
								);
							}

							return true;
						});

					if (
						expressionName === "import.meta.filename" ||
						expressionName === "import.meta.dirname"
					) {
						hooks.propertyInDestructuring.tap(PLUGIN_NAME, (usingProperty) => {
							if (property === usingProperty.id) {
								return `${property}: ${JSON.stringify(fn(parser.state.module))},`;
							}
						});
					}
				};

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {"__filename" | "__dirname" | "import.meta.filename" | "import.meta.dirname"} expressionName expression name
				 * @param {string} value value
				 * @param {"filename" | "dirname"} property a property
				 * @param {string=} warning warning
				 * @returns {void}
				 */
				const setConstant = (
					parser,
					expressionName,
					value,
					property,
					warning
				) =>
					setCachedModuleConstant(
						parser,
						expressionName,
						() => value,
						property,
						warning
					);

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {"__filename" | "__dirname" | "import.meta.filename" | "import.meta.dirname"} expressionName expression name
				 * @param {"dirname" | "filename"} property property
				 * @param {() => string} value function to get value
				 * @returns {void}
				 */
				const setUrlModuleConstant = (
					parser,
					expressionName,
					property,
					value
				) => {
					parser.hooks.expression
						.for(expressionName)
						.tap(PLUGIN_NAME, (expr) => {
							const { importMetaName, environment, module } =
								compilation.outputOptions;

							if (
								module &&
								importMetaName === "import.meta" &&
								(expressionName === "import.meta.filename" ||
									expressionName === "import.meta.dirname") &&
								environment.importMetaDirnameAndFilename
							) {
								return true;
							}

							const dep = environment.importMetaDirnameAndFilename
								? new CachedConstDependency(
										`${importMetaName}.${property}`,
										/** @type {Range} */
										(expr.range),
										`__webpack_${property}__`
									)
								: new ExternalModuleDependency(
										"url",
										[
											{
												name: "fileURLToPath",
												value: URL_MODULE_CONSTANT_FUNCTION_NAME
											}
										],
										undefined,
										`${URL_MODULE_CONSTANT_FUNCTION_NAME}(${value()})`,
										/** @type {Range} */ (expr.range),
										`__webpack_${property}__`
									);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);

							return true;
						});

					if (
						expressionName === "import.meta.filename" ||
						expressionName === "import.meta.dirname"
					) {
						hooks.propertyInDestructuring.tap(PLUGIN_NAME, (usingProperty) => {
							if (property === usingProperty.id) {
								const { importMetaName, environment, module } =
									compilation.outputOptions;

								if (
									module &&
									importMetaName === "import.meta" &&
									(expressionName === "import.meta.filename" ||
										expressionName === "import.meta.dirname") &&
									environment.importMetaDirnameAndFilename
								) {
									return `${property}: ${importMetaName}.${property},`;
								}

								if (environment.importMetaDirnameAndFilename) {
									return `${property}: ${importMetaName}.${property},`;
								}

								const dep = new ExternalModuleInitFragmentDependency(
									"url",
									[
										{
											name: "fileURLToPath",
											value: URL_MODULE_CONSTANT_FUNCTION_NAME
										}
									],
									undefined
								);

								dep.loc = /** @type {DependencyLocation} */ (usingProperty.loc);
								parser.state.module.addPresentationalDependency(dep);

								return `${property}: ${URL_MODULE_CONSTANT_FUNCTION_NAME}(${value()}),`;
							}
						});
					}
				};

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {NodeOptions} nodeOptions options
				 * @param {{ dirname: "__dirname" | "import.meta.dirname", filename: "__filename" | "import.meta.filename" }} identifiers options
				 * @returns {void}
				 */
				const dirnameAndFilenameHandler = (
					parser,
					nodeOptions,
					{ dirname, filename }
				) => {
					const context = compiler.context;

					// Keep `import.meta.filename` in code
					if (
						nodeOptions.__filename === false &&
						filename === "import.meta.filename"
					) {
						setModuleConstant(parser, filename, () => filename, "filename");
					}

					if (nodeOptions.__filename) {
						switch (nodeOptions.__filename) {
							case "mock":
								setConstant(parser, filename, "/index.js", "filename");
								break;
							case "warn-mock":
								setConstant(
									parser,
									filename,
									"/index.js",
									"filename",
									"__filename is a Node.js feature and isn't available in browsers."
								);
								break;
							case "node-module": {
								const importMetaName = compilation.outputOptions.importMetaName;

								setUrlModuleConstant(
									parser,
									filename,
									"filename",
									() => `${importMetaName}.url`
								);
								break;
							}
							case "eval-only":
								// Keep `import.meta.filename` in the source code for the ES module output
								if (compilation.outputOptions.module) {
									const { importMetaName } = compilation.outputOptions;

									setModuleConstant(
										parser,
										filename,
										() => `${importMetaName}.filename`,
										"filename"
									);
								}
								// Replace `import.meta.filename` with `__filename` for the non-ES module output
								else if (filename === "import.meta.filename") {
									setModuleConstant(
										parser,
										filename,
										() => "__filename",
										"filename"
									);
								}
								break;
							case true:
								setCachedModuleConstant(
									parser,
									filename,
									(module) =>
										relative(
											/** @type {InputFileSystem} */ (compiler.inputFileSystem),
											context,
											module.resource
										),
									"filename"
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

					// Keep `import.meta.dirname` in code
					if (
						nodeOptions.__dirname === false &&
						dirname === "import.meta.dirname"
					) {
						setModuleConstant(parser, dirname, () => dirname, "dirname");
					}

					if (nodeOptions.__dirname) {
						switch (nodeOptions.__dirname) {
							case "mock":
								setConstant(parser, dirname, "/", "dirname");
								break;
							case "warn-mock":
								setConstant(
									parser,
									dirname,
									"/",
									"dirname",
									"__dirname is a Node.js feature and isn't available in browsers."
								);
								break;
							case "node-module": {
								const importMetaName = compilation.outputOptions.importMetaName;

								setUrlModuleConstant(
									parser,
									dirname,
									"dirname",
									() => `${importMetaName}.url.replace(/\\/(?:[^\\/]*)$/, "")`
								);
								break;
							}
							case "eval-only":
								// Keep `import.meta.dirname` in the source code for the ES module output and replace `__dirname` on `import.meta.dirname`
								if (compilation.outputOptions.module) {
									const { importMetaName } = compilation.outputOptions;

									setModuleConstant(
										parser,
										dirname,
										() => `${importMetaName}.dirname`,
										"dirname"
									);
								}
								// Replace `import.meta.dirname` with `__dirname` for the non-ES module output
								else if (dirname === "import.meta.dirname") {
									setModuleConstant(
										parser,
										dirname,
										() => "__dirname",
										"dirname"
									);
								}
								break;
							case true:
								setCachedModuleConstant(
									parser,
									dirname,
									(module) =>
										relative(
											/** @type {InputFileSystem} */ (compiler.inputFileSystem),
											context,
											/** @type {string} */ (module.context)
										),
									"dirname"
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
						if (parserOptions.node === false) {
							setModuleConstant(
								parser,
								"import.meta.dirname",
								() => "import.meta.dirname",
								"dirname"
							);
							setModuleConstant(
								parser,
								"import.meta.filename",
								() => "import.meta.filename",
								"filename"
							);
							return;
						}

						let localOptions = options;

						if (parserOptions.node) {
							localOptions = { ...localOptions, ...parserOptions.node };
						}

						if (localOptions.global !== false) {
							globalHandler(parser, localOptions);
						}

						dirnameAndFilenameHandler(parser, localOptions, {
							dirname: "__dirname",
							filename: "__filename"
						});

						if (parserOptions.importMeta !== false) {
							dirnameAndFilenameHandler(parser, localOptions, {
								dirname: "import.meta.dirname",
								filename: "import.meta.filename"
							});
						}
					});
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, (parser, parserOptions) => {
						if (parserOptions.node === false) return;

						let localOptions = options;

						if (parserOptions.node) {
							localOptions = { ...localOptions, ...parserOptions.node };
						}

						if (localOptions.global !== false) {
							globalHandler(parser, localOptions);
						}

						dirnameAndFilenameHandler(parser, localOptions, {
							dirname: "__dirname",
							filename: "__filename"
						});
					});
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, (parser, parserOptions) => {
						if (parserOptions.node === false) {
							setModuleConstant(
								parser,
								"import.meta.dirname",
								() => "import.meta.dirname",
								"dirname"
							);
							setModuleConstant(
								parser,
								"import.meta.filename",
								() => "import.meta.filename",
								"filename"
							);
							return;
						}

						let localOptions = options;

						if (parserOptions.node) {
							localOptions = { ...localOptions, ...parserOptions.node };
						}

						if (localOptions.global !== false) {
							globalHandler(parser, localOptions);
						}

						if (parserOptions.importMeta !== false) {
							dirnameAndFilenameHandler(parser, localOptions, {
								dirname: "import.meta.dirname",
								filename: "import.meta.filename"
							});
						}
					});
			}
		);
	}
}

module.exports = NodeStuffPlugin;
