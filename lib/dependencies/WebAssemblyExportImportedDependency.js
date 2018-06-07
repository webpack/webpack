/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DependencyReference = require("./DependencyReference");
const ModuleDependency = require("./ModuleDependency");

class WebAssemblyExportImportedDependency extends ModuleDependency {
	constructor(exportName, request, name) {
		super(request);
		/** @type {string} */
		this.exportName = exportName;
		/** @type {string} */
		this.name = name;
	}

	getReference() {
		if (!this.module) return null;
		return new DependencyReference(this.module, [this.name], false);
	}

	get type() {
		return "wasm export import";
	}
}

module.exports = WebAssemblyExportImportedDependency;
