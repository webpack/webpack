/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const t = require("@webassemblyjs/ast");
const { decode } = require("@webassemblyjs/wasm-parser");

const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

const decoderOpts = {
	ignoreCodeSection: true,
	ignoreDataSection: true,

	// this will avoid having to lookup with identifiers in the ModuleContext
	ignoreCustomNameSection: true
};

class WebAssemblyParser {
	constructor(options) {
		this.hooks = Object.freeze({});
		this.options = options;
	}

	parse(binary, state) {
		// flag it as async module
		state.module.buildMeta.exportsType = "async";

		// parse it
		const program = decode(binary, decoderOpts);
		const module = program.body[0];

		const exports = [];
		t.traverse(module, {
			ModuleExport({ node }) {
				exports.push(node.name);
			},

			ModuleImport({ node }) {
				const dep = new WebAssemblyImportDependency(
					node.module,
					node.name,
					node.descr,
					false
				);

				state.module.addDependency(dep);
			}
		});

		state.module.addDependency(new StaticExportsDependency(exports, false));

		return state;
	}
}

module.exports = WebAssemblyParser;
