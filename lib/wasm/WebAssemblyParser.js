/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const t = require("@webassemblyjs/ast");
const { decode } = require("@webassemblyjs/wasm-parser");
const {
	moduleContextFromModuleAST
} = require("@webassemblyjs/helper-module-context");

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

const JS_COMPAT_TYPES = new Set(["i32", "f32", "f64"]);

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
	ignoreDataSection: true,

	// this will avoid having to lookup with identifiers in the ModuleContext
	ignoreCustomNameSection: true
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
		const program = decode(binary, decoderOpts);
		const module = program.body[0];

		const moduleContext = moduleContextFromModuleAST(module);

		// extract imports and exports
		const exports = (state.module.buildMeta.providedExports = []);
		const jsIncompatibleExports = (state.module.buildMeta.jsIncompatibleExports = []);

		t.traverse(module, {
			ModuleExport({ node }) {
				const descriptor = node.descr;

				if (descriptor.exportType === "Func") {
					const funcidx = descriptor.id.value;

					const funcSignature = moduleContext.getFunction(funcidx);

					const hasIncompatibleArg = funcSignature.args.some(
						t => !JS_COMPAT_TYPES.has(t)
					);
					const hasIncompatibleResult = funcSignature.result.some(
						t => !JS_COMPAT_TYPES.has(t)
					);

					if (hasIncompatibleArg === true || hasIncompatibleResult === true) {
						jsIncompatibleExports.push(node.name);
					}
				}

				exports.push(node.name);
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
			}
		});

		return state;
	}
}

module.exports = WebAssemblyParser;
