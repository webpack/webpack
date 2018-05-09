/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DependencyReference = require("./DependencyReference");
const ModuleDependency = require("./ModuleDependency");
const UnsupportedWebAssemblyFeatureError = require("../wasm/UnsupportedWebAssemblyFeatureError");

class WebAssemblyImportDependency extends ModuleDependency {
	constructor(request, name, description, onlyDirectImport) {
		super(request);
		this.name = name;
		this.description = description;
		this.onlyDirectImport = onlyDirectImport;
	}

	getReference() {
		if (!this.module) return null;
		return new DependencyReference(this.module, [this.name], false);
	}

	getErrors() {
		if (
			this.onlyDirectImport &&
			this.module &&
			!this.module.type.startsWith("webassembly")
		) {
			const type = this.description.type;
			return [
				new UnsupportedWebAssemblyFeatureError(
					`${type} imports are only available for direct wasm to wasm dependencies`
				)
			];
		}
	}

	get type() {
		return "wasm import";
	}
}

module.exports = WebAssemblyImportDependency;
