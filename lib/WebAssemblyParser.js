/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/* globals WebAssembly */
"use strict";

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API

const Tapable = require("tapable").Tapable;

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
		state.module.buildMeta.harmonyModule = true;

		// extract exports
		// TODO find more efficient way doing it
		// TODO use Promises
		if(typeof WebAssembly !== "undefined") {
			WebAssembly.compile(source).then(module => {
				state.module.buildMeta.providedExports = WebAssembly.Module.exports(module).map(exp => exp.name);
			}).then(() => callback(null, state), err => callback(err));
		} else {
			state.module.buildMeta.providedExports = false;
			callback(null, state);
		}
	}
}

module.exports = WebAssemblyParser;
