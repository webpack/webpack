/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const t = require("@webassemblyjs/ast");
const { decode } = require("@webassemblyjs/wasm-parser");

const { Tapable } = require("tapable");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

/** @typedef {import("../Module")} Module */

/**
 * @param {t.ModuleImport} n the import
 * @returns {boolean} true, if a memory was imported
 */
const isMemoryImport = n => n.descr.type === "Memory";

/**
 * @param {t.ModuleImport} n the import
 * @returns {boolean} true, if a table was imported
 */
const isTableImport = n => n.descr.type === "Table";

/**
 * @param {t.ModuleImport} n the import
 * @returns {boolean} true, if a global was imported
 */
const isGlobalImport = n => n.descr.type === "GlobalType";

/**
 * @param {t.ModuleExport} n the export
 * @returns {boolean} true, if a global was exported
 */
const isGlobalExport = n => n.descr.exportType === "Global";

const JS_COMPAT_TYPES = new Set(["i32", "f32", "f64"]);

const isMapEmpty = map => Object.keys(map).length === 0;

/**
 * @param {t.ModuleImport} moduleImport the import
 * @returns {null | string} the type incompatible with js types
 */
const getJsIncompatibleType = moduleImport => {
	if (moduleImport.descr.type !== "FuncImportDescr") return null;
	const signature = moduleImport.descr.signature;
	for (const param of signature.params) {
		if (!JS_COMPAT_TYPES.has(param.valtype))
			return `${param.valtype} as parameter`;
	}
	for (const type of signature.results) {
		if (!JS_COMPAT_TYPES.has(type)) return `${type} as result`;
	}
	return null;
};

const decoderOpts = {
	ignoreCodeSection: true,
	ignoreDataSection: true
};

class WebAssemblyParser extends Tapable {
	constructor(options) {
		super();
		this.hooks = {};
		this.options = options;
	}

	parse(binary, state) {
		// flag it as ESM
		state.module.buildMeta.exportsType = "namespace";

		// parse it
		const ast = decode(binary, decoderOpts);

		// track offset in module of exported elements
		const exportsByModuleOffset = {};

		// track offset in module of import elements
		const importByModuleOffset = {};

		let importOffsetByType = {
			Global: 0
		};

		// extract imports and exports
		const exports = (state.module.buildMeta.providedExports = []);
		const reExports = (state.module.buildMeta.reExports = []);

		t.traverse(ast, {
			ModuleExport({ node }) {
				exports.push(node.name);

				const descriptor = node.descr;

				if (isGlobalExport(node)) {
					// FIXME(sven): handle multiple export instruction refering to
					// the name element?
					exportsByModuleOffset[descriptor.id.value] = node.name;
				}
			},

			ModuleImport({ node }) {
				/** @type {false | string} */
				let onlyDirectImport = false;

				if (isMemoryImport(node) === true) {
					onlyDirectImport = "Memory";
				} else if (isTableImport(node) === true) {
					onlyDirectImport = "Table";
				} else {
					const incompatibleType = getJsIncompatibleType(node);
					if (incompatibleType) {
						onlyDirectImport = `Non-JS-compatible Func Sigurature (${incompatibleType})`;
					}
				}

				const dep = new WebAssemblyImportDependency(
					node.module,
					node.name,
					node.descr,
					onlyDirectImport
				);

				state.module.addDependency(dep);

				if (isGlobalImport(node)) {
					importByModuleOffset[importOffsetByType["Global"]] = {
						module: node.module,
						name: node.name
					};

					// import are always first in the module no need to track
					// implemented elements
					importOffsetByType["Global"]++;
				}
			}
		});

		// Check if an import has been exported (called reExport)
		if (
			isMapEmpty(exportsByModuleOffset) === false &&
			isMapEmpty(importByModuleOffset) === false
		) {
			Object.keys(importByModuleOffset).forEach(offset => {
				const reExportedAs = exportsByModuleOffset[offset];
				const { module, name } = importByModuleOffset[offset];

				if (typeof reExportedAs === "string") {
					console.debug(
						"should be rewritten",
						module,
						name,
						"->",
						reExportedAs
					);

					reExports.push({ module, name, reExportedAs });
				}
			});
		}

		return state;
	}
}

module.exports = WebAssemblyParser;
