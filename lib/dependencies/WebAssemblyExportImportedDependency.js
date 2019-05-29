/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const DependencyReference = require("./DependencyReference");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("../ModuleGraph")} ModuleGraph */

class WebAssemblyExportImportedDependency extends ModuleDependency {
	constructor(exportName, request, name, valueType) {
		super(request);
		/** @type {string} */
		this.exportName = exportName;
		/** @type {string} */
		this.name = name;
		/** @type {string} */
		this.valueType = valueType;
	}

	/**
	 * Returns the referenced module and export
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {DependencyReference} reference
	 */
	getReference(moduleGraph) {
		const module = moduleGraph.getModule(this);

		if (!module) return null;

		return new DependencyReference(
			() => moduleGraph.getModule(this),
			[[this.name]],
			false
		);
	}

	get type() {
		return "wasm export import";
	}

	serialize(context) {
		const { write } = context;

		write(this.exportName);
		write(this.name);
		write(this.valueType);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.exportName = read();
		this.name = read();
		this.valueType = read();

		super.deserialize(context);
	}
}

makeSerializable(
	WebAssemblyExportImportedDependency,
	"webpack/lib/dependencies/WebAssemblyExportImportedDependency"
);

module.exports = WebAssemblyExportImportedDependency;
