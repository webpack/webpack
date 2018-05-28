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
				exports.push(node.name);
			},

			ModuleImport({ node }) {
				let onlyDirectImport = false;

				if (isMemoryImport(node) === true) {
					onlyDirectImport = true;
				}

				if (isTableImport(node) === true) {
					onlyDirectImport = true;
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
