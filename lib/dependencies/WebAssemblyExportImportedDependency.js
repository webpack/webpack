/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
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
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {string[][]} referenced exports
	 */
	getReferencedExports(moduleGraph) {
		return [[this.name]];
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
