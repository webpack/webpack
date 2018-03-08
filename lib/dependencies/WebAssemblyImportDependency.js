/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");

class WebAssemblyImportDependency extends ModuleDependency {
	constructor(request, name, description) {
		super(request);
		this.name = name;
		this.description = description;
	}

	getReference() {
		if (!this.module) return null;
		return {
			module: this.module,
			importedNames: [this.name]
		};
	}

	get type() {
		return "wasm import";
	}
}

module.exports = WebAssemblyImportDependency;
