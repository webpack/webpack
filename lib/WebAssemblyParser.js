/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { traverse } = require("@webassemblyjs/ast");
const { decode } = require("@webassemblyjs/wasm-parser");

const { Tapable } = require("tapable");
const WebAssemblyImportDependency = require("./dependencies/WebAssemblyImportDependency");
const { readFileSync } = require("fs");
const { join } = require("path");

const decoderOpts = {
	ignoreCodeSection: true,
	ignoreDataSection: true
};

// FIXME(sven): probably a better way of doing this?
function getSource(context, request) {
	const path = require.resolve(join(context, request));
	return readFileSync(path, "utf8");
}

// FIXME(sven): probably a better way of doing this?
function ensureExported(source, request) {
	const hasExport = source.indexOf("export ") !== -1;

	if (hasExport === false) {
		const error = new Error(
			request + " must export the Memory or Table object."
		);

		error.stack = "";

		throw error;
	}
}

// FIXME(sven): probably a better way of doing this?
function ensureIdentNotAccessed(source, request, ident) {
	const occurence = source.match(new RegExp(ident, "g")).length;

	if (occurence > 1) {
		const error = new Error(
			request + " is not allowed to access the Memory or Table object (yet)."
		);

		error.stack = "";

		throw error;
	}
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
				const dep = new WebAssemblyImportDependency(
					node.module,
					node.name,
					node.descr
				);

				state.module.addDependency(dep);

				// To avoid unexpected behaviors we check that the Memory or Table
				// has been exported and is not accessed by the user.
				if (node.descr.type === "Memory" || node.descr.type === "Table") {
					const content = getSource(state.module.context, node.module);

					ensureExported(content, node.module);
					ensureIdentNotAccessed(content, node.module, node.name);
				}
			}
		});

		return state;
	}
}

module.exports = WebAssemblyParser;
