/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DependencyReference = require("./DependencyReference");
const ModuleDependency = require("./ModuleDependency");

class WebAssemblyImportDependency extends ModuleDependency {
	constructor(request, name, description) {
		super(request);
		this.name = name;
		this.description = description;
	}

	getReference() {
		if (!this.module) return null;
		return new DependencyReference(this.module, [this.name], false);
	}

	get type() {
		return "wasm import";
	}
}

module.exports = WebAssemblyImportDependency;
