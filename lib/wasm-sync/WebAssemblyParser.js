/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

// eslint-disable-next-line import/default -- CJS package, default is module.exports
import t from "@webassemblyjs/ast";
import { decode } from "@webassemblyjs/wasm-parser";
import Parser from "../Parser.js";
import StaticExportsDependency from "../dependencies/StaticExportsDependency.js";
import WebAssemblyExportImportedDependency from "../dependencies/WebAssemblyExportImportedDependency.js";
import WebAssemblyImportDependency from "../dependencies/WebAssemblyImportDependency.js";

const { moduleContextFromModuleAST } = t;
/** @typedef {import("@webassemblyjs/ast").ModuleImport} ModuleImport */
/** @typedef {import("../Module.js").BuildInfo} BuildInfo */
/** @typedef {import("../Module.js").BuildMeta} BuildMeta */
/** @typedef {import("./SyncWasmModule.js").SyncWasmModuleBuildMeta} SyncWasmModuleBuildMeta */
/** @typedef {import("../Parser.js").ParserState} ParserState */
/** @typedef {import("../Parser.js").PreparsedAst} PreparsedAst */

const JS_COMPAT_TYPES = new Set(["i32", "i64", "f32", "f64", "externref"]);

/**
 * Gets js incompatible type.
 * @param {t.Signature} signature the func signature
 * @returns {null | string} the type incompatible with js types
 */
const getJsIncompatibleType = (signature) => {
	for (const param of signature.params) {
		if (!JS_COMPAT_TYPES.has(param.valtype)) {
			return `${param.valtype} as parameter`;
		}
	}
	for (const type of signature.results) {
		if (!JS_COMPAT_TYPES.has(type)) return `${type} as result`;
	}
	return null;
};

/**
 * Same check for the other `@webassemblyjs` signature shape: imports carry the
 * AST `Signature` node (above), the module context uses plain `FuncSignature`.
 * @param {t.FuncSignature} signature the func signature
 * @returns {null | string} the type incompatible with js types
 */
const getJsIncompatibleTypeOfFuncSignature = (signature) => {
	for (const param of signature.args) {
		if (!JS_COMPAT_TYPES.has(param)) {
			return `${param} as parameter`;
		}
	}
	for (const type of signature.result) {
		if (!JS_COMPAT_TYPES.has(type)) return `${type} as result`;
	}
	return null;
};

const decoderOpts = {
	ignoreCodeSection: true,
	ignoreDataSection: true,

	// this will avoid having to lookup with identifiers in the ModuleContext
	ignoreCustomNameSection: true
};

class WebAssemblyParser extends Parser {
	/**
	 * Parses the provided source and updates the parser state.
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (!Buffer.isBuffer(source)) {
			throw new Error("WebAssemblyParser input must be a Buffer");
		}

		// flag it as ESM
		/** @type {BuildInfo} */
		(state.module.buildInfo).strict = true;
		/** @type {BuildMeta} */
		(state.module.buildMeta).exportsType = "namespace";

		// parse it
		const program = decode(source, decoderOpts);
		const module = program.body[0];

		const moduleContext = moduleContextFromModuleAST(module);

		// extract imports and exports
		/** @type {string[]} */
		const exports = [];
		const buildMeta = /** @type {SyncWasmModuleBuildMeta} */ (
			state.module.buildMeta
		);
		/** @type {Record<string, string> | undefined} */
		let jsIncompatibleExports = (buildMeta.jsIncompatibleExports = undefined);

		/** @typedef {ModuleImport | null} ImportNode */
		/** @type {ImportNode[]} */
		const importedGlobals = [];

		t.traverse(module, {
			ModuleExport({ node }) {
				const descriptor = node.descr;

				if (descriptor.exportType === "Func") {
					const funcIdx = descriptor.id.value;

					/** @type {t.FuncSignature} */
					const funcSignature = moduleContext.getFunction(funcIdx);

					const incompatibleType =
						getJsIncompatibleTypeOfFuncSignature(funcSignature);

					if (incompatibleType) {
						if (jsIncompatibleExports === undefined) {
							jsIncompatibleExports =
								/** @type {SyncWasmModuleBuildMeta} */
								(state.module.buildMeta).jsIncompatibleExports = {};
						}
						jsIncompatibleExports[node.name] = incompatibleType;
					}
				}

				exports.push(node.name);

				if (node.descr && node.descr.exportType === "Global") {
					const refNode = importedGlobals[node.descr.id.value];
					if (refNode) {
						const dep = new WebAssemblyExportImportedDependency(
							node.name,
							refNode.module,
							refNode.name,
							/** @type {string} */
							(refNode.descr.valtype)
						);

						state.module.addDependency(dep);
					}
				}
			},

			Global({ node }) {
				const init = node.init[0];

				/** @type {ImportNode} */
				let importNode = null;

				if (init.id === "get_global") {
					const globalIdx = init.args[0].value;

					if (globalIdx < importedGlobals.length) {
						importNode = importedGlobals[globalIdx];
					}
				}

				importedGlobals.push(importNode);
			},

			ModuleImport({ node }) {
				/** @type {false | string} */
				let onlyDirectImport = false;

				if (t.isMemory(node.descr) === true) {
					onlyDirectImport = "Memory";
				} else if (t.isTable(node.descr) === true) {
					onlyDirectImport = "Table";
				} else if (t.isFuncImportDescr(node.descr) === true) {
					const incompatibleType = getJsIncompatibleType(
						/** @type {t.Signature} */
						(node.descr.signature)
					);
					if (incompatibleType) {
						onlyDirectImport = `Non-JS-compatible Func Signature (${incompatibleType})`;
					}
				} else if (t.isGlobalType(node.descr) === true) {
					const type = /** @type {string} */ (node.descr.valtype);
					if (!JS_COMPAT_TYPES.has(type)) {
						onlyDirectImport = `Non-JS-compatible Global Type (${type})`;
					}
				}

				const dep = new WebAssemblyImportDependency(
					node.module,
					node.name,
					node.descr,
					onlyDirectImport
				);

				state.module.addDependency(dep);

				if (t.isGlobalType(node.descr)) {
					importedGlobals.push(node);
				}
			}
		});

		state.module.addDependency(new StaticExportsDependency(exports, false));

		return state;
	}
}

export default WebAssemblyParser;

export { WebAssemblyParser as "module.exports" };
