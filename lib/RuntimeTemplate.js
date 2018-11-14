/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RequestShortener")} RequestShortener */

class RuntimeTemplate {
	/**
	 * @param {TODO} outputOptions the compilation output options
	 * @param {RequestShortener} requestShortener the request shortener
	 */
	constructor(outputOptions, requestShortener) {
		this.outputOptions = outputOptions || {};
		/** @type {RequestShortener} */
		this.requestShortener = requestShortener;
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
		return `!(${this.throwMissingModuleErrorFunction({ request })}())`;
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
				return `Promise.resolve().then(function() { ${errorStatements} })`;
			case "expression":
				return `(function() { ${errorStatements} }())`;
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
				`RuntimeTemplate.moduleId(): Module ${module.identifier()} has no id. This should not happen.`
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
	 * @returns {string} the expression
	 */
	moduleRaw({ module, chunkGraph, request, weak }) {
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
				`RuntimeTemplate.moduleId(): Module ${module.identifier()} has no id. This should not happen.`
			);
		}
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
	 * @returns {string} the expression
	 */
	moduleExports({ module, chunkGraph, request, weak }) {
		return this.moduleRaw({
			module,
			chunkGraph,
			request,
			weak
		});
	}

	/**
	 * @param {Object} options options object
	 * @param {Module} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string} options.request the request that should be printed as comment
	 * @param {boolean=} options.strict if the current module is in strict esm mode
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @param {Set<string>=} options.runtimeRequirements if set, will be filled with runtime requirements
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
				`RuntimeTemplate.moduleNamespace(): Module ${module.identifier()} has no id. This should not happen.`
			);
		}
		const moduleId = this.moduleId({
			module,
			chunkGraph,
			request,
			weak
		});
		const exportsType = module.buildMeta && module.buildMeta.exportsType;
		if (exportsType === "namespace") {
			const rawModule = this.moduleRaw({
				module,
				chunkGraph,
				request,
				weak
			});
			return rawModule;
		} else if (exportsType === "named") {
			if (runtimeRequirements) {
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
			}
			return `${RuntimeGlobals.createFakeNamespaceObject}(${moduleId}, 3)`;
		} else if (strict) {
			if (runtimeRequirements) {
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
			}
			return `${RuntimeGlobals.createFakeNamespaceObject}(${moduleId}, 1)`;
		} else {
			if (runtimeRequirements) {
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
			}
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
	 * @param {Set<string>=} options.runtimeRequirements if set, will be filled with runtime requirements
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
				`RuntimeTemplate.moduleNamespacePromise(): Module ${module.identifier()} has no id. This should not happen.`
			);
		}
		const promise = this.blockPromise({
			chunkGraph,
			block,
			message
		});

		let getModuleFunction;
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
		const exportsType = module.buildMeta && module.buildMeta.exportsType;
		if (exportsType === "namespace") {
			if (header) {
				const rawModule = this.moduleRaw({
					module,
					chunkGraph,
					request,
					weak
				});
				getModuleFunction = `function() { ${header}return ${rawModule}; }`;
			} else {
				getModuleFunction = `__webpack_require__.bind(null, ${comment}${idExpr})`;
			}
		} else if (exportsType === "named") {
			if (header) {
				getModuleFunction = `function() { ${header}return ${
					RuntimeGlobals.createFakeNamespaceObject
				}(${moduleIdExpr}, 3); }`;
			} else {
				getModuleFunction = `${
					RuntimeGlobals.createFakeNamespaceObject
				}.bind(null, ${comment}${idExpr}, 3)`;
			}
		} else if (strict) {
			if (header) {
				getModuleFunction = `function() { ${header}return ${
					RuntimeGlobals.createFakeNamespaceObject
				}(${moduleIdExpr}, 1); }`;
			} else {
				getModuleFunction = `${
					RuntimeGlobals.createFakeNamespaceObject
				}.bind(null, ${comment}${idExpr}, 1)`;
			}
		} else {
			if (header) {
				getModuleFunction = `function() { ${header}return ${
					RuntimeGlobals.createFakeNamespaceObject
				}(${moduleIdExpr}, 7); }`;
			} else {
				getModuleFunction = `${
					RuntimeGlobals.createFakeNamespaceObject
				}.bind(null, ${comment}${idExpr}, 7)`;
			}
		}

		return `${promise || "Promise.resolve()"}.then(${getModuleFunction})`;
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
	 * @param {Set<string>=} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} the import statement
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
			return this.missingModuleStatement({
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
					type: "statements"
				});
			}
			throw new Error(
				`RuntimeTemplate.importStatment(): Module ${module.identifier()} has no id. This should not happen.`
			);
		}
		const moduleId = this.moduleId({
			module,
			chunkGraph,
			request,
			weak
		});
		const optDeclaration = update ? "" : "var ";

		const exportsType = module.buildMeta && module.buildMeta.exportsType;
		let content = `/* harmony import */ ${optDeclaration}${importVar} = __webpack_require__(${moduleId});\n`;

		if (!exportsType && !originModule.buildMeta.strictHarmonyModule) {
			if (runtimeRequirements) {
				runtimeRequirements.add(RuntimeGlobals.compatGetDefaultExport);
			}
			content += `/* harmony import */ ${optDeclaration}${importVar}_default = /*#__PURE__*/${
				RuntimeGlobals.compatGetDefaultExport
			}(${importVar});\n`;
		}
		if (exportsType === "named") {
			if (runtimeRequirements) {
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
			}
			if (Array.isArray(module.buildMeta.providedExports)) {
				content += `${optDeclaration}${importVar}_namespace = /*#__PURE__*/${
					RuntimeGlobals.createFakeNamespaceObject
				}(${moduleId}, 1);\n`;
			} else {
				content += `${optDeclaration}${importVar}_namespace = /*#__PURE__*/${
					RuntimeGlobals.createFakeNamespaceObject
				}(${moduleId});\n`;
			}
		}
		return content;
	}

	/**
	 * @param {Object} options options
	 * @param {ModuleGraph} options.moduleGraph the module graph
	 * @param {Module} options.module the module
	 * @param {string} options.request the request
	 * @param {string} options.exportName the export name
	 * @param {Module} options.originModule the origin module
	 * @param {boolean} options.asiSafe true, if location is safe for ASI, a bracket can be emitted
	 * @param {boolean} options.isCall true, if expression will be called
	 * @param {boolean} options.callContext when false, call context will not be preserved
	 * @param {string} options.importVar the identifier name of the import variable
	 * @param {Set<string>=} options.runtimeRequirements if set, will be filled with runtime requirements
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
		importVar,
		runtimeRequirements
	}) {
		if (!module) {
			return this.missingModule({
				request
			});
		}
		const exportsType = module.buildMeta && module.buildMeta.exportsType;

		if (!exportsType) {
			if (exportName === "default") {
				if (!originModule.buildMeta.strictHarmonyModule) {
					if (isCall) {
						return `${importVar}_default()`;
					} else if (asiSafe) {
						return `(${importVar}_default())`;
					} else {
						return `${importVar}_default.a`;
					}
				} else {
					return importVar;
				}
			} else if (originModule.buildMeta.strictHarmonyModule) {
				if (exportName) {
					return "/* non-default import from non-esm module */undefined";
				} else {
					if (runtimeRequirements) {
						runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
					}
					return `/*#__PURE__*/${
						RuntimeGlobals.createFakeNamespaceObject
					}(${importVar})`;
				}
			}
		}

		if (exportsType === "named") {
			if (exportName === "default") {
				return importVar;
			} else if (!exportName) {
				return `${importVar}_namespace`;
			}
		}

		if (exportName) {
			const used = module.getUsedName(moduleGraph, exportName);
			if (!used) {
				const comment = Template.toNormalComment(`unused export ${exportName}`);
				return `${comment} undefined`;
			}
			const comment =
				used !== exportName ? Template.toNormalComment(exportName) + " " : "";
			const access = `${importVar}[${comment}${JSON.stringify(used)}]`;
			if (isCall) {
				if (callContext === false && asiSafe) {
					return `(0,${access})`;
				} else if (callContext === false) {
					return `Object(${access})`;
				}
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
	 * @param {Set<string>=} options.runtimeRequirements if set, will be filled with runtime requirements
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
			if (runtimeRequirements) {
				runtimeRequirements.add(RuntimeGlobals.ensureChunk);
			}
			return `${RuntimeGlobals.ensureChunk}(${comment}${chunkId})`;
		} else if (chunks.length > 0) {
			const requireChunkId = chunk =>
				`${RuntimeGlobals.ensureChunk}(${JSON.stringify(chunk.id)})`;
			if (runtimeRequirements) {
				runtimeRequirements.add(RuntimeGlobals.ensureChunk);
			}
			return `Promise.all(${comment.trim()}[${chunks
				.map(requireChunkId)
				.join(", ")}])`;
		} else {
			return `Promise.resolve(${comment.trim()})`;
		}
	}

	onError() {
		return RuntimeGlobals.uncaughtErrorHandler;
	}

	defineEsModuleFlagStatement({ exportsArgument }) {
		return `${RuntimeGlobals.makeNamespaceObject}(${exportsArgument});\n`;
	}
}

module.exports = RuntimeTemplate;
