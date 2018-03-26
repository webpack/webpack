/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/* globals WebAssembly */
"use strict";

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API

const { Tapable } = require("tapable");
const WebAssemblyImportDependency = require("./dependencies/WebAssemblyImportDependency");

class WebAssemblyParser extends Tapable {
	constructor(options) {
		super();
		this.hooks = {};
		this.options = options;
	}

	parse(source, state, callback) {
		// TODO parse WASM AST and walk it
		// TODO extract imports

		// flag it as ESM
		state.module.buildMeta.exportsType = "namespace";

		// extract exports
		// TODO find more efficient way doing it
		// TODO use Promises
		if (typeof WebAssembly !== "undefined") {
			WebAssembly.compile(source)
				.then(module => {
					state.module.buildMeta.providedExports = WebAssembly.Module.exports(
						module
					).map(exp => exp.name);
					for (const imp of WebAssembly.Module.imports(module)) {
						const dep = new WebAssemblyImportDependency(
							imp.module,
							imp.name,
							imp.kind
						);
						state.module.addDependency(dep);
					}
				})
				.then(() => callback(null, state), err => callback(err));
		} else {
			throw new Error(
				"Can't compile WebAssembly modules without WebAssembly support in current node.js version (Update to latest node.js version)"
			);
		}
	}
}

module.exports = WebAssemblyParser;
