/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../Dependency").TRANSITIVE} TRANSITIVE */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, string, string]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, string, string]>} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class WebAssemblyExportImportedDependency extends ModuleDependency {
	/**
	 * Creates an instance of WebAssemblyExportImportedDependency.
	 * @param {string} exportName export name
	 * @param {string} request request
	 * @param {string} name name
	 * @param {string} valueType value type
	 */
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
	 * Could affect referencing module.
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		return Dependency.TRANSITIVE;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		// re-exporting wasm glue needs the real binding, never an inlined literal
		return [{ name: [this.name], canInline: false }];
	}

	get type() {
		return "wasm export import";
	}

	get category() {
		return "wasm";
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.exportName).write(this.name).write(this.valueType);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.exportName = context.read();
		const c1 = context.rest;
		this.name = c1.read();
		const c2 = c1.rest;
		this.valueType = c2.read();
		super.deserialize(c2.rest);
	}
}

makeSerializable(
	WebAssemblyExportImportedDependency,
	"webpack/lib/dependencies/WebAssemblyExportImportedDependency"
);

module.exports = WebAssemblyExportImportedDependency;
