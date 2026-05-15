/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");
const {
	ESM_MODULE_EXPORTS_NAME,
	getRequireEsmModuleExportsAccess
} = require("./CommonJsDependencyHelpers");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency").RawReferencedExports} RawReferencedExports */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class CommonJsRequireDependency extends ModuleDependency {
	/**
	 * Creates an instance of CommonJsRequireDependency.
	 * @param {string} request request
	 * @param {Range=} range location in source code of the string-literal argument (gets replaced by the module id)
	 * @param {string=} context request context
	 * @param {RawReferencedExports | null=} referencedExports list of referenced exports
	 * @param {Range=} valueRange location in source code of the whole `require(...)` call (for `require(esm)` interop)
	 */
	constructor(
		request,
		range,
		context,
		referencedExports = null,
		valueRange = undefined
	) {
		super(request);
		this.range = range;
		this._context = context;
		this.referencedExports = referencedExports;
		this.valueRange = valueRange;
	}

	get type() {
		return "cjs require";
	}

	get category() {
		return "commonjs";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		const importedModule = moduleGraph.getModule(this);
		if (
			importedModule &&
			getRequireEsmModuleExportsAccess(importedModule, moduleGraph, runtime) !==
				null
		) {
			// `require(esm)` will unwrap the "module.exports" named export; only
			// that export is observable through this `require()` call.
			return [[ESM_MODULE_EXPORTS_NAME]];
		}
		if (!this.referencedExports) return Dependency.EXPORTS_OBJECT_REFERENCED;
		return this.referencedExports.map((name) => ({
			name,
			canMangle: false
		}));
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.referencedExports);
		write(this.valueRange);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.referencedExports = read();
		this.valueRange = read();
		super.deserialize(context);
	}
}

CommonJsRequireDependency.Template = class CommonJsRequireDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ runtimeTemplate, moduleGraph, chunkGraph, runtime }
	) {
		const dep = /** @type {CommonJsRequireDependency} */ (dependency);
		if (!dep.range) return;
		const importedModule = /** @type {Module} */ (moduleGraph.getModule(dep));
		const content = runtimeTemplate.moduleId({
			module: importedModule,
			chunkGraph,
			request: dep.request,
			weak: dep.weak
		});
		source.replace(dep.range[0], dep.range[1] - 1, content);

		if (dep.valueRange && importedModule) {
			const access = getRequireEsmModuleExportsAccess(
				importedModule,
				moduleGraph,
				runtime
			);
			if (access !== null) {
				source.insert(dep.valueRange[1], access);
			}
		}
	}
};

makeSerializable(
	CommonJsRequireDependency,
	"webpack/lib/dependencies/CommonJsRequireDependency"
);

module.exports = CommonJsRequireDependency;
