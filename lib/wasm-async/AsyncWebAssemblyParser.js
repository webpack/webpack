/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const t = require("@webassemblyjs/ast");
const { decode } = require("@webassemblyjs/wasm-parser");
const Parser = require("../Parser");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

const decoderOpts = {
	ignoreCodeSection: true,
	ignoreDataSection: true,

	// this will avoid having to lookup with identifiers in the ModuleContext
	ignoreCustomNameSection: true
};

class WebAssemblyParser extends Parser {
	constructor(options) {
		super();
		this.hooks = Object.freeze({});
		this.options = options;
	}

	/**
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (!Buffer.isBuffer(source)) {
			throw new Error("WebAssemblyParser input must be a Buffer");
		}

		// flag it as async module
		state.module.buildInfo.strict = true;
		state.module.buildMeta.exportsType = "namespace";
		state.module.buildMeta.async = true;

		// parse it
		const program = decode(source, decoderOpts);
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
