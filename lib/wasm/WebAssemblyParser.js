/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const t = require("@webassemblyjs/ast");
const { decode } = require("@webassemblyjs/wasm-parser");

const { Tapable } = require("tapable");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

/**
 * @param {t.ModuleImport} moduleImport the import
 * @returns {boolean} true, if a memory was imported
 */
const isMemoryImport = moduleImport => moduleImport.descr.type === "Memory";

/**
 * @param {t.ModuleImport} moduleImport the import
 * @returns {boolean} true, if a table was imported
 */
const isTableImport = moduleImport => moduleImport.descr.type === "Table";

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

		// extract imports and exports
		const exports = (state.module.buildMeta.providedExports = []);
		t.traverse(ast, {
			ModuleExport({ node }) {
				const moduleExport = /** @type {t.ModuleExport} */ (node);
				exports.push(moduleExport.name);
			},

			ModuleImport({ node }) {
				const moduleImport = /** @type {t.ModuleImport} */ (node);

				let onlyDirectImport = false;

				if (isMemoryImport(moduleImport) === true) {
					onlyDirectImport = true;
				}

				if (isTableImport(moduleImport) === true) {
					onlyDirectImport = true;
				}

				const dep = new WebAssemblyImportDependency(
					moduleImport.module,
					moduleImport.name,
					moduleImport.descr,
					onlyDirectImport
				);

				state.module.addDependency(dep);
			}
		});

		return state;
	}
}

module.exports = WebAssemblyParser;
