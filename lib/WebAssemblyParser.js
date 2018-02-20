/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

var Tools = require("webassembly-interpreter/lib/tools");

const Tapable = require("tapable").Tapable;
const WebAssemblyImportDependency = require("./dependencies/WebAssemblyImportDependency");

class WebAssemblyParser extends Tapable {
	constructor(options) {
		super();
		this.hooks = {};
		this.options = options;
	}

	parse(source, state) {
		// flag it as ESM
		state.module.buildMeta.exportsType = "namespace";

		// parse it
		const ast = Tools.parsers.parseWASM(source);

		// extract imports and exports
		const exports = state.module.buildMeta.providedExports = [];
		Tools.traverse(ast, {
			ModuleExport({
				node
			}) {
				exports.push(node.name);
			},

			ModuleImport({
				node
			}) {
				const dep = new WebAssemblyImportDependency(node.module, node.name);
				state.module.addDependency(dep);
			}
		});

		return state;
	}
}

module.exports = WebAssemblyParser;
