/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("./InitFragment");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const { equals } = require("./util/ArrayHelpers");
const propertyAccess = require("./util/propertyAccess");

/** @typedef {import("../declarations/WebpackOptions").OutputNormalized} OutputOptions */
/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./InitFragment")} InitFragment */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @param {Module} module the module
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {string} error message
 */
const noModuleIdErrorMessage = (module, chunkGraph) => {
	return `Module ${module.identifier()} has no id assigned.
This should not happen.
It's in these chunks: ${
		Array.from(
			chunkGraph.getModuleChunksIterable(module),
			c => c.name || c.id || c.debugId
		).join(", ") || "none"
	} (If module is in no chunk this indicates a bug in some chunk/module optimization logic)
Module has these incoming connections: ${Array.from(
		chunkGraph.moduleGraph.getIncomingConnections(module),
		connection =>
			`\n - ${
				connection.originModule && connection.originModule.identifier()
			} ${connection.dependency && connection.dependency.type} ${
				(connection.explanations &&
					Array.from(connection.explanations).join(", ")) ||
				""
			}`
	).join("")}`;
};

class RuntimeTemplate {
	/**
	 * @param {OutputOptions} outputOptions the compilation output options
	 * @param {RequestShortener} requestShortener the request shortener
	 */
	constructor(outputOptions, requestShortener) {
		this.outputOptions = outputOptions || {};
		/** @type {RequestShortener} */
		this.requestShortener = requestShortener;
	}

	isIIFE() {
		return this.outputOptions.iife;
	}

	isModule() {
		return this.outputOptions.module;
	}

	supportsConst() {
		return this.outputOptions.environment.const;
	}

	supportsArrowFunction() {
		return this.outputOptions.environment.arrowFunction;
	}

	supportsForOf() {
		return this.outputOptions.environment.forOf;
	}

	supportsDestructuring() {
		return this.outputOptions.environment.destructuring;
	}

	supportsBigIntLiteral() {
		return this.outputOptions.environment.bigIntLiteral;
	}

	supportsDynamicImport() {
		return this.outputOptions.environment.dynamicImport;
	}

	supportsEcmaScriptModuleSyntax() {
		return this.outputOptions.environment.module;
	}

	supportTemplateLiteral() {
		// TODO
		return false;
	}

	returningFunction(returnValue, args = "") {
		return this.supportsArrowFunction()
			? `(${args}) => ${returnValue}`
			: `function(${args}) { return ${returnValue}; }`;
	}

	basicFunction(args, body) {
		return this.supportsArrowFunction()
			? `(${args}) => {\n${Template.indent(body)}\n}`
			: `function(${args}) {\n${Template.indent(body)}\n}`;
	}

	destructureArray(items, value) {
		return this.supportsDestructuring()
			? `var [${items.join(", ")}] = ${value};`
			: Template.asString(
					items.map((item, i) => `var ${item} = ${value}[${i}];`)
			  );
	}

	iife(args, body) {
		return `(${this.basicFunction(args, body)})()`;
	}

	forEach(variable, array, body) {
		return this.supportsForOf()
			? `for(const ${variable} of ${array}) {\n${Template.indent(body)}\n}`
			: `${array}.forEach(function(${variable}) {\n${Template.indent(
					body
			  )}\n});`;
	}

	/**
	 * Add a comment
	 * @param {object} options Information content of the comment
	 * @param {string=} options.request request string used originally
	 * @param {string=} options.chunkName name of the chunk referenced
	 * @param {string=} options.chunkReason reason information of the chunk
	 * @param {string=} options.message additional message
	 * @param {string=} options.exportName name of the export
	 * @returns {string} comment
	 */
	comment({ request, chunkName, chunkReason, message, exportName }) {
		let content;
		if (this.outputOptions.pathinfo) {
			content = [message, request, chunkName, chunkReason]
				.filter(Boolean)
				.map(item => this.requestShortener.shorten(item))
				.join(" | ");
		} else {
			content = [message, chunkName, chunkReason]
				.filter(Boolean)
				.map(item => this.requestShortener.shorten(item))
				.join(" | ");
		}
		if (!content) return "";
		if (this.outputOptions.pathinfo) {
			return Template.toComment(content) + " ";
		} else {
			return Template.toNormalComment(content) + " ";
		}
	}

	/**
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error block
	 */
	throwMissingModuleErrorBlock({ request }) {
		const err = `Cannot find module '${request}'`;
		return `var e = new Error(${JSON.stringify(
			err
		)}); e.code = 'MODULE_NOT_FOUND'; throw e;`;
	}

	/**
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error function
	 */
	throwMissingModuleErrorFunction({ request }) {
		return `function webpackMissingModule() { ${this.throwMissingModuleErrorBlock(
			{ request }
		)} }`;
	}

	/**
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error IIFE
	 */
	missingModule({ request }) {
		return `Object(${this.throwMissingModuleErrorFunction({ request })}())`;
	}

	/**
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error statement
	 */
	missingModuleStatement({ request }) {
		return `${this.missingModule({ request })};\n`;
	}

	/**
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error code
	 */
	missingModulePromise({ request }) {
		return `Promise.resolve().then(${this.throwMissingModuleErrorFunction({
			request
		})})`;
	}

	/**
	 * @param {Object} options options object
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {Module} options.module the module
	 * @param {string} options.request the request that should be printed as comment
	 * @param {string=} options.idExpr expression to use as id expression
	 * @param {"expression" | "promise" | "statements"} options.type which kind of code should be returned
	 * @returns {string} the code
	 */
	weakError({ module, chunkGraph, request, idExpr, type }) {
		const moduleId = chunkGraph.getModuleId(module);
		const errorMessage =
			moduleId === null
				? JSON.stringify("Module is not available (weak dependency)")
				: idExpr
				? `"Module '" + ${idExpr} + "' is not available (weak dependency)"`
				: JSON.stringify(
						`Module '${moduleId}' is not available (weak dependency)`
				  );
		const comment = request ? Template.toNormalComment(request) + " " : "";
		const errorStatements =
			`var e = new Error(${errorMessage}); ` +
			comment +
			"e.code = 'MODULE_NOT_FOUND'; throw e;";
		switch (type) {
			case "statements":
				return errorStatements;
			case "promise":
				return `Promise.resolve().then(${this.basicFunction(
					"",
					errorStatements
				)})`;
			case "expression":
				return this.iife("", errorStatements);
		}
	}

	/**
	 * @param {Object} options options object
	 * @param {Module} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string} options.request the request that should be printed as comment
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @returns {string} the expression
	 */
	moduleId({ module, chunkGraph, request, weak }) {
		if (!module) {
			return this.missingModule({
				request
			});
		}
		const moduleId = chunkGraph.getModuleId(module);
		if (moduleId === null) {
			if (weak) {
				return "null /* weak dependency, without id */";
			}
			throw new Error(
				`RuntimeTemplate.moduleId(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		return `${this.comment({ request })}${JSON.stringify(moduleId)}`;
	}

	/**
	 * @param {Object} options options object
	 * @param {Module} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string} options.request the request that should be printed as comment
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} the expression
	 */
	moduleRaw({ module, chunkGraph, request, weak, runtimeRequirements }) {
		if (!module) {
			return this.missingModule({
				request
			});
		}
		const moduleId = chunkGraph.getModuleId(module);
		if (moduleId === null) {
			if (weak) {
				// only weak referenced modules don't get an id
				// we can always emit an error emitting code here
				return this.weakError({
					module,
					chunkGraph,
					request,
					type: "expression"
				});
			}
			throw new Error(
				`RuntimeTemplate.moduleId(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		runtimeRequirements.add(RuntimeGlobals.require);
		return `__webpack_require__(${this.moduleId({
			module,
			chunkGraph,
			request,
			weak
		})})`;
	}

	/**
	 * @param {Object} options options object
	 * @param {Module} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string} options.request the request that should be printed as comment
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} the expression
	 */
	moduleExports({ module, chunkGraph, request, weak, runtimeRequirements }) {
		return this.moduleRaw({
			module,
			chunkGraph,
			request,
			weak,
			runtimeRequirements
		});
	}

	/**
	 * @param {Object} options options object
	 * @param {Module} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string} options.request the request that should be printed as comment
	 * @param {boolean=} options.strict if the current module is in strict esm mode
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} the expression
	 */
	moduleNamespace({
		module,
		chunkGraph,
		request,
		strict,
		weak,
		runtimeRequirements
	}) {
		if (!module) {
			return this.missingModule({
				request
			});
		}
		if (chunkGraph.getModuleId(module) === null) {
			if (weak) {
				// only weak referenced modules don't get an id
				// we can always emit an error emitting code here
				return this.weakError({
					module,
					chunkGraph,
					request,
					type: "expression"
				});
			}
			throw new Error(
				`RuntimeTemplate.moduleNamespace(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		const moduleId = this.moduleId({
			module,
			chunkGraph,
			request,
			weak
		});
		const exportsType = module.getExportsType(chunkGraph.moduleGraph, strict);
		switch (exportsType) {
			case "namespace":
				return this.moduleRaw({
					module,
					chunkGraph,
					request,
					weak,
					runtimeRequirements
				});
			case "default-with-named":
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				return `${RuntimeGlobals.createFakeNamespaceObject}(${moduleId}, 3)`;
			case "default-only":
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				return `${RuntimeGlobals.createFakeNamespaceObject}(${moduleId}, 1)`;
			case "dynamic":
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				return `${RuntimeGlobals.createFakeNamespaceObject}(${moduleId}, 7)`;
		}
	}

	/**
	 * @param {Object} options options object
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {AsyncDependenciesBlock=} options.block the current dependencies block
	 * @param {Module} options.module the module
	 * @param {string} options.request the request that should be printed as comment
	 * @param {string} options.message a message for the comment
	 * @param {boolean=} options.strict if the current module is in strict esm mode
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} the promise expression
	 */
	moduleNamespacePromise({
		chunkGraph,
		block,
		module,
		request,
		message,
		strict,
		weak,
		runtimeRequirements
	}) {
		if (!module) {
			return this.missingModulePromise({
				request
			});
		}
		const moduleId = chunkGraph.getModuleId(module);
		if (moduleId === null) {
			if (weak) {
				// only weak referenced modules don't get an id
				// we can always emit an error emitting code here
				return this.weakError({
					module,
					chunkGraph,
					request,
					type: "promise"
				});
			}
			throw new Error(
				`RuntimeTemplate.moduleNamespacePromise(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		const promise = this.blockPromise({
			chunkGraph,
			block,
			message,
			runtimeRequirements
		});

		let appending;
		let idExpr = JSON.stringify(chunkGraph.getModuleId(module));
		const comment = this.comment({
			request
		});
		let header = "";
		if (weak) {
			if (idExpr.length > 8) {
				// 'var x="nnnnnn";x,"+x+",x' vs '"nnnnnn",nnnnnn,"nnnnnn"'
				header += `var id = ${idExpr}; `;
				idExpr = "id";
			}
			runtimeRequirements.add(RuntimeGlobals.moduleFactories);
			header += `if(!${
				RuntimeGlobals.moduleFactories
			}[${idExpr}]) { ${this.weakError({
				module,
				chunkGraph,
				request,
				idExpr,
				type: "statements"
			})} } `;
		}
		const moduleIdExpr = this.moduleId({
			module,
			chunkGraph,
			request,
			weak
		});
		const exportsType = module.getExportsType(chunkGraph.moduleGraph, strict);
		let fakeType = 0;
		switch (exportsType) {
			case "namespace":
				if (header) {
					const rawModule = this.moduleRaw({
						module,
						chunkGraph,
						request,
						weak,
						runtimeRequirements
					});
					appending = `.then(${this.basicFunction(
						"",
						`${header}return ${rawModule};`
					)})`;
				} else {
					runtimeRequirements.add(RuntimeGlobals.require);
					appending = `.then(__webpack_require__.bind(__webpack_require__, ${comment}${idExpr}))`;
				}
				break;
			case "dynamic":
				fakeType |= 4;
			/* fall through */
			case "default-with-named":
				fakeType |= 2;
			/* fall through */
			case "default-only":
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				if (chunkGraph.moduleGraph.isAsync(module)) {
					if (header) {
						const rawModule = this.moduleRaw({
							module,
							chunkGraph,
							request,
							weak,
							runtimeRequirements
						});
						appending = `.then(${this.basicFunction(
							"",
							`${header}return ${rawModule};`
						)})`;
					} else {
						runtimeRequirements.add(RuntimeGlobals.require);
						appending = `.then(__webpack_require__.bind(__webpack_require__, ${comment}${idExpr}))`;
					}
					appending += `.then(${this.returningFunction(
						`${RuntimeGlobals.createFakeNamespaceObject}(m, ${fakeType})`,
						"m"
					)})`;
				} else {
					fakeType |= 1;
					if (header) {
						const returnExpression = `${RuntimeGlobals.createFakeNamespaceObject}(${moduleIdExpr}, ${fakeType})`;
						appending = `.then(${this.basicFunction(
							"",
							`${header}return ${returnExpression};`
						)})`;
					} else {
						appending = `.then(${RuntimeGlobals.createFakeNamespaceObject}.bind(__webpack_require__, ${comment}${idExpr}, ${fakeType}))`;
					}
				}
				break;
		}

		return `${promise || "Promise.resolve()"}${appending}`;
	}

	/**
	 *
	 * @param {Object} options options object
	 * @param {boolean=} options.update whether a new variable should be created or the existing one updated
	 * @param {Module} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string} options.request the request that should be printed as comment
	 * @param {string} options.importVar name of the import variable
	 * @param {Module} options.originModule module in which the statement is emitted
	 * @param {boolean=} options.weak true, if this is a weak dependency
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {[string, string]} the import statement and the compat statement
	 */
	importStatement({
		update,
		module,
		chunkGraph,
		request,
		importVar,
		originModule,
		weak,
		runtimeRequirements
	}) {
		if (!module) {
			return [
				this.missingModuleStatement({
					request
				}),
				""
			];
		}
		if (chunkGraph.getModuleId(module) === null) {
			if (weak) {
				// only weak referenced modules don't get an id
				// we can always emit an error emitting code here
				return [
					this.weakError({
						module,
						chunkGraph,
						request,
						type: "statements"
					}),
					""
				];
			}
			throw new Error(
				`RuntimeTemplate.importStatement(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		const moduleId = this.moduleId({
			module,
			chunkGraph,
			request,
			weak
		});
		const optDeclaration = update ? "" : "var ";

		const exportsType = module.getExportsType(
			chunkGraph.moduleGraph,
			originModule.buildMeta.strictHarmonyModule
		);
		runtimeRequirements.add(RuntimeGlobals.require);
		const importContent = `/* harmony import */ ${optDeclaration}${importVar} = __webpack_require__(${moduleId});\n`;

		if (exportsType === "dynamic") {
			runtimeRequirements.add(RuntimeGlobals.compatGetDefaultExport);
			return [
				importContent,
				`/* harmony import */ ${optDeclaration}${importVar}_default = /*#__PURE__*/${RuntimeGlobals.compatGetDefaultExport}(${importVar});\n`
			];
		}
		return [importContent, ""];
	}

	/**
	 * @param {Object} options options
	 * @param {ModuleGraph} options.moduleGraph the module graph
	 * @param {Module} options.module the module
	 * @param {string} options.request the request
	 * @param {string | string[]} options.exportName the export name
	 * @param {Module} options.originModule the origin module
	 * @param {boolean|undefined} options.asiSafe true, if location is safe for ASI, a bracket can be emitted
	 * @param {boolean} options.isCall true, if expression will be called
	 * @param {boolean} options.callContext when false, call context will not be preserved
	 * @param {boolean} options.defaultInterop when true and accessing the default exports, interop code will be generated
	 * @param {string} options.importVar the identifier name of the import variable
	 * @param {InitFragment[]} options.initFragments init fragments will be added here
	 * @param {RuntimeSpec} options.runtime runtime for which this code will be generated
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} expression
	 */
	exportFromImport({
		moduleGraph,
		module,
		request,
		exportName,
		originModule,
		asiSafe,
		isCall,
		callContext,
		defaultInterop,
		importVar,
		initFragments,
		runtime,
		runtimeRequirements
	}) {
		if (!module) {
			return this.missingModule({
				request
			});
		}
		if (!Array.isArray(exportName)) {
			exportName = exportName ? [exportName] : [];
		}
		const exportsType = module.getExportsType(
			moduleGraph,
			originModule.buildMeta.strictHarmonyModule
		);

		if (defaultInterop) {
			if (exportName.length > 0 && exportName[0] === "default") {
				switch (exportsType) {
					case "dynamic":
						if (isCall) {
							return `${importVar}_default()${propertyAccess(exportName, 1)}`;
						} else {
							return asiSafe
								? `(${importVar}_default()${propertyAccess(exportName, 1)})`
								: asiSafe === false
								? `;(${importVar}_default()${propertyAccess(exportName, 1)})`
								: `${importVar}_default.a${propertyAccess(exportName, 1)}`;
						}
					case "default-only":
					case "default-with-named":
						exportName = exportName.slice(1);
						break;
				}
			} else if (exportName.length > 0) {
				if (exportsType === "default-only") {
					return (
						"/* non-default import from non-esm module */undefined" +
						propertyAccess(exportName, 1)
					);
				}
			} else if (
				exportsType === "default-only" ||
				exportsType === "default-with-named"
			) {
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				initFragments.push(
					new InitFragment(
						`var ${importVar}_namespace_cache;\n`,
						InitFragment.STAGE_CONSTANTS,
						-1,
						`${importVar}_namespace_cache`
					)
				);
				return `/*#__PURE__*/ ${
					asiSafe ? "" : asiSafe === false ? ";" : "Object"
				}(${importVar}_namespace_cache || (${importVar}_namespace_cache = ${
					RuntimeGlobals.createFakeNamespaceObject
				}(${importVar}${exportsType === "default-only" ? "" : ", 2"})))`;
			}
		}

		if (exportName.length > 0) {
			const exportsInfo = moduleGraph.getExportsInfo(module);
			const used = exportsInfo.getUsedName(exportName, runtime);
			if (!used) {
				const comment = Template.toNormalComment(
					`unused export ${propertyAccess(exportName)}`
				);
				return `${comment} undefined`;
			}
			const comment = equals(used, exportName)
				? ""
				: Template.toNormalComment(propertyAccess(exportName)) + " ";
			const access = `${importVar}${comment}${propertyAccess(used)}`;
			if (isCall && callContext === false) {
				return asiSafe
					? `(0,${access})`
					: asiSafe === false
					? `;(0,${access})`
					: `Object(${access})`;
			}
			return access;
		} else {
			return importVar;
		}
	}

	/**
	 * @param {Object} options options
	 * @param {AsyncDependenciesBlock} options.block the async block
	 * @param {string} options.message the message
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} expression
	 */
	blockPromise({ block, message, chunkGraph, runtimeRequirements }) {
		if (!block) {
			const comment = this.comment({
				message
			});
			return `Promise.resolve(${comment.trim()})`;
		}
		const chunkGroup = chunkGraph.getBlockChunkGroup(block);
		if (!chunkGroup || chunkGroup.chunks.length === 0) {
			const comment = this.comment({
				message
			});
			return `Promise.resolve(${comment.trim()})`;
		}
		const chunks = chunkGroup.chunks.filter(
			chunk => !chunk.hasRuntime() && chunk.id !== null
		);
		const comment = this.comment({
			message,
			chunkName: block.chunkName
		});
		if (chunks.length === 1) {
			const chunkId = JSON.stringify(chunks[0].id);
			runtimeRequirements.add(RuntimeGlobals.ensureChunk);
			return `${RuntimeGlobals.ensureChunk}(${comment}${chunkId})`;
		} else if (chunks.length > 0) {
			runtimeRequirements.add(RuntimeGlobals.ensureChunk);
			const requireChunkId = chunk =>
				`${RuntimeGlobals.ensureChunk}(${JSON.stringify(chunk.id)})`;
			return `Promise.all(${comment.trim()}[${chunks
				.map(requireChunkId)
				.join(", ")}])`;
		} else {
			return `Promise.resolve(${comment.trim()})`;
		}
	}

	/**
	 * @param {Object} options options
	 * @param {AsyncDependenciesBlock} options.block the async block
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @param {string=} options.request request string used originally
	 * @returns {string} expression
	 */
	asyncModuleFactory({ block, chunkGraph, runtimeRequirements, request }) {
		const dep = block.dependencies[0];
		const module = chunkGraph.moduleGraph.getModule(dep);
		const ensureChunk = this.blockPromise({
			block,
			message: "",
			chunkGraph,
			runtimeRequirements
		});
		const factory = this.returningFunction(
			this.moduleRaw({
				module,
				chunkGraph,
				request,
				runtimeRequirements
			})
		);
		return this.returningFunction(
			ensureChunk.startsWith("Promise.resolve(")
				? `${factory}`
				: `${ensureChunk}.then(${this.returningFunction(factory)})`
		);
	}

	/**
	 * @param {Object} options options
	 * @param {Dependency} options.dependency the dependency
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @param {string=} options.request request string used originally
	 * @returns {string} expression
	 */
	syncModuleFactory({ dependency, chunkGraph, runtimeRequirements, request }) {
		const module = chunkGraph.moduleGraph.getModule(dependency);
		const factory = this.returningFunction(
			this.moduleRaw({
				module,
				chunkGraph,
				request,
				runtimeRequirements
			})
		);
		return this.returningFunction(factory);
	}

	/**
	 * @param {Object} options options
	 * @param {string} options.exportsArgument the name of the exports object
	 * @param {Set<string>} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} statement
	 */
	defineEsModuleFlagStatement({ exportsArgument, runtimeRequirements }) {
		runtimeRequirements.add(RuntimeGlobals.makeNamespaceObject);
		runtimeRequirements.add(RuntimeGlobals.exports);
		return `${RuntimeGlobals.makeNamespaceObject}(${exportsArgument});\n`;
	}
}

module.exports = RuntimeTemplate;
