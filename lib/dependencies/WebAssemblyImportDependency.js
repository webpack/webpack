/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const UnsupportedWebAssemblyFeatureError = require("../wasm/UnsupportedWebAssemblyFeatureError");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("@webassemblyjs/ast").ModuleImportDescription} ModuleImportDescription */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../WebpackError")} WebpackError */

class WebAssemblyImportDependency extends ModuleDependency {
	/**
	 * @param {string} request the request
	 * @param {string} name the imported name
	 * @param {ModuleImportDescription} description the WASM ast node
	 * @param {false | string} onlyDirectImport if only direct imports are allowed
	 */
	constructor(request, name, description, onlyDirectImport) {
		super(request);
		/** @type {string} */
		this.name = name;
		/** @type {ModuleImportDescription} */
		this.description = description;
		/** @type {false | string} */
		this.onlyDirectImport = onlyDirectImport;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {string[][]} referenced exports
	 */
	getReferencedExports(moduleGraph) {
		return [[this.name]];
	}

	/**
	 * Returns errors
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[]} errors
	 */
	getErrors(moduleGraph) {
		const module = moduleGraph.getModule(this);

		if (
			this.onlyDirectImport &&
			module &&
			!module.type.startsWith("webassembly")
		) {
			return [
				new UnsupportedWebAssemblyFeatureError(
					`Import "${this.name}" from "${this.request}" with ${this.onlyDirectImport} can only be used for direct wasm to wasm dependencies`
				)
			];
		}
	}

	get type() {
		return "wasm import";
	}

	serialize(context) {
		const { write } = context;

		write(this.name);
		write(this.description);
		write(this.onlyDirectImport);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.name = read();
		this.description = read();
		this.onlyDirectImport = read();

		super.deserialize(context);
	}
}

makeSerializable(
	WebAssemblyImportDependency,
	"webpack/lib/dependencies/WebAssemblyImportDependency"
);

module.exports = WebAssemblyImportDependency;
