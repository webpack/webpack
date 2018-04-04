/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { traverse } = require("@webassemblyjs/ast");
const { decode } = require("@webassemblyjs/wasm-parser");

const { Tapable } = require("tapable");
const WebAssemblyImportDependency = require("./dependencies/WebAssemblyImportDependency");

const isMemoryImport = moduleImport => moduleImport.descr.type === "Memory";
const isTableImport = moduleImport => moduleImport.descr.type === "Table";

const decoderOpts = {
	ignoreCodeSection: true,
	ignoreDataSection: true
};

function nonSupportImportOfType(type) {
	const e = new Error("Unsupported import of type " + JSON.stringify(type));
	e.stack = "";

	return e;
}

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
		traverse(ast, {
			ModuleExport({ node }) {
				exports.push(node.name);
			},

			ModuleImport({ node }) {
				// Prevent importing a Memory or Table for now
				// Depends on https://github.com/WebAssembly/esm-integration
				if (isMemoryImport(node) === true) {
					throw nonSupportImportOfType("Memory");
				}

				if (isTableImport(node) === true) {
					throw nonSupportImportOfType("Table");
				}

				const dep = new WebAssemblyImportDependency(
					node.module,
					node.name,
					node.descr
				);

				state.module.addDependency(dep);
			}
		});

		return state;
	}
}

module.exports = WebAssemblyParser;
