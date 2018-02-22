/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const wasmDce = require("wasm-dce");
const RawSource = require("webpack-sources").RawSource;

class WebAssemblyGenerator {
	generate(module) {
		if(Array.isArray(module.usedExports)) {
			// rewrite WASM
			const buf = module.originalSource().source();
			return new RawSource(wasmDce(buf, module.usedExports));
		}
		return module.originalSource();
	}
}

module.exports = WebAssemblyGenerator;
