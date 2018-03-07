/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("./Template");

module.exports = class RuntimeTemplate {
	constructor(outputOptions, requestShortener) {
		this.outputOptions = outputOptions || {};
		this.requestShortener = requestShortener;
	}

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

	throwMissingModuleErrorFunction({ request }) {
		const err = `Cannot find module "${request}"`;
		return `function webpackMissingModule() { var e = new Error(${JSON.stringify(
			err
		)}); e.code = 'MODULE_NOT_FOUND'; throw e; }`;
	}

	missingModule({ request }) {
		return `!(${this.throwMissingModuleErrorFunction({ request })}())`;
	}

	missingModuleStatement({ request }) {
		return `${this.missingModule({ request })};\n`;
	}

	missingModulePromise({ request }) {
		return `Promise.resolve().then(${this.throwMissingModuleErrorFunction({
			request
		})})`;
	}

	moduleId({ module, request }) {
		if (!module)
			return this.missingModule({
				request
			});
		return `${this.comment({ request })}${JSON.stringify(module.id)}`;
	}

	moduleRaw({ module, request }) {
		if (!module)
			return this.missingModule({
				request
			});
		return `__webpack_require__(${this.moduleId({ module, request })})`;
	}

	moduleExports({ module, request }) {
		return this.moduleRaw({
			module,
			request
		});
	}

	moduleNamespace({ module, request, strict }) {
		const rawModule = this.moduleRaw({
			module,
			request
		});
		const exportsType = module.buildMeta && module.buildMeta.exportsType;
		if (exportsType === "namespace") {
			return rawModule;
		} else if (exportsType === "named") {
			return `Object.assign({/* fake namespace object */}, ${
				rawModule
			}, { "default": ${rawModule} })`;
		} else if (strict) {
			return `Object({ /* fake namespace object */ "default": ${rawModule} })`;
		} else {
			return `Object(function() { var module = ${
				rawModule
			}; return typeof module === "object" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === "object" && module, { "default": module }); }())`;
		}
	}

	moduleNamespacePromise({ block, module, request, message, strict, weak }) {
		if (!module)
			return this.missingModulePromise({
				request
			});
		const promise = this.blockPromise({
			block,
			message
		});

		let getModuleFunction;
		let idExpr = JSON.stringify(module.id);
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
			header += `if(!__webpack_require__.m[${
				idExpr
			}]) { var e = new Error("Module '" + ${
				idExpr
			} + "' is not available (weak dependency)"); e.code = 'MODULE_NOT_FOUND'; throw e; } `;
		}
		const rawModule = this.moduleRaw({
			module,
			request
		});
		const exportsType = module.buildMeta && module.buildMeta.exportsType;
		if (exportsType === "namespace") {
			if (header) {
				getModuleFunction = `function() { ${header}return ${rawModule}; }`;
			} else {
				getModuleFunction = `__webpack_require__.bind(null, ${comment}${
					idExpr
				})`;
			}
		} else if (exportsType === "named") {
			getModuleFunction = `function() { ${header}var module = ${
				rawModule
			}; return Object.assign({/* fake namespace object */}, module, { "default": module }); }`;
		} else if (strict) {
			getModuleFunction = `function() { ${
				header
			}return { /* fake namespace object */ "default": ${rawModule} }; }`;
		} else {
			getModuleFunction = `function() { ${header}var module = ${
				rawModule
			}; return typeof module === "object" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === "object" && module, { "default": module }); }`;
		}

		return `${promise || "Promise.resolve()"}.then(${getModuleFunction})`;
	}

	importStatement({ update, module, request, importVar, originModule }) {
		if (!module)
			return this.missingModuleStatement({
				request
			});
		const comment = this.comment({
			request
		});
		const optDeclaration = update ? "" : "var ";

		const exportsType = module.buildMeta && module.buildMeta.exportsType;
		let content = `/* harmony import */ ${optDeclaration}${
			importVar
		} = __webpack_require__(${comment}${JSON.stringify(module.id)});\n`;

		if (!exportsType && !originModule.buildMeta.strictHarmonyModule) {
			content += `/* harmony import */ ${optDeclaration}${
				importVar
			}_default = /*#__PURE__*/__webpack_require__.n(${importVar});\n`;
		}
		if (exportsType === "named") {
			if (Array.isArray(module.buildMeta.providedExports))
				content += `${optDeclaration}${
					importVar
				}_namespace = /*#__PURE__*/Object.assign({}, ${
					importVar
				}, {"default": ${importVar}});\n`;
			else
				content += `${optDeclaration}${
					importVar
				}_namespace = /*#__PURE__*/{ /* fake namespace object */ "default": ${
					importVar
				} };\n`;
		}
		return content;
	}

	exportFromImport({
		module,
		request,
		exportName,
		originModule,
		asiSafe,
		isCall,
		callContext,
		importVar
	}) {
		if (!module)
			return this.missingModule({
				request
			});
		const exportsType = module.buildMeta && module.buildMeta.exportsType;

		if (!exportsType) {
			if (exportName === "default") {
				if (!originModule.buildMeta.strictHarmonyModule) {
					if (isCall) return `${importVar}_default()`;
					else if (asiSafe) return `(${importVar}_default())`;
					else return `${importVar}_default.a`;
				} else {
					return importVar;
				}
			} else if (originModule.buildMeta.strictHarmonyModule) {
				if (exportName) {
					return "/* non-default import from non-esm module */undefined";
				} else if (!exportName) {
					if (asiSafe) {
						return `/*#__PURE__*/{ /* fake namespace object */ "default": ${
							importVar
						} }`;
					} else {
						return `/*#__PURE__*/Object({ /* fake namespace object */ "default": ${
							importVar
						} })`;
					}
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
			const used = module.isUsed(exportName);
			const comment =
				used !== exportName ? Template.toNormalComment(exportName) + " " : "";
			const access = `${importVar}[${comment}${JSON.stringify(used)}]`;
			if (isCall) {
				if (callContext === false && asiSafe) return `(0,${access})`;
				else if (callContext === false) return `Object(${access})`;
			}
			return access;
		} else {
			return importVar;
		}
	}

	blockPromise({ block, message }) {
		if (!block || !block.chunkGroup || block.chunkGroup.chunks.length === 0) {
			const comment = this.comment({
				message
			});
			return `Promise.resolve(${comment.trim()})`;
		}
		const chunks = block.chunkGroup.chunks.filter(
			chunk => !chunk.hasRuntime() && chunk.id !== null
		);
		const comment = this.comment({
			message,
			chunkName: block.chunkName,
			chunkReason: block.chunkReason
		});
		if (chunks.length === 1) {
			const chunkId = JSON.stringify(chunks[0].id);
			return `__webpack_require__.e(${comment}${chunkId})`;
		} else if (chunks.length > 0) {
			const requireChunkId = chunk =>
				`__webpack_require__.e(${JSON.stringify(chunk.id)})`;
			return `Promise.all(${comment.trim()}[${chunks
				.map(requireChunkId)
				.join(", ")}])`;
		} else {
			return `Promise.resolve(${comment.trim()})`;
		}
	}

	onError() {
		return "__webpack_require__.oe";
	}

	defineEsModuleFlagStatement({ exportsArgument }) {
		return `__webpack_require__.r(${exportsArgument});\n`;
	}
};
