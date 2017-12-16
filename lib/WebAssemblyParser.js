/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API

const Tapable = require("tapable").Tapable;

class WebAssemblyParser extends Tapable {
	constructor(options) {
		super();
		this.hooks = {};
		this.options = options;
	}

	parse(source, initialState) {
		// Does nothing current
		// TODO parse WASM AST and walk it
		// extract exports, imports
		return initialState;
	}
}

module.exports = WebAssemblyParser;
