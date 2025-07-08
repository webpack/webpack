/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const CachedConstDependency = require("./CachedConstDependency");
const ExternalModuleInitFragment = require("./ExternalModuleInitFragment");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptModulesPlugin").ChunkRenderContext} ChunkRenderContext */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */

class ExternalModuleDependency extends CachedConstDependency {
	/**
	 * @param {string} module module
	 * @param {{ name: string, value: string }[]} importSpecifiers import specifiers
	 * @param {string | undefined} defaultImport default import
	 * @param {string} expression expression
	 * @param {Range} range range
	 * @param {string} identifier identifier
	 * @param {boolean=} isLazyCompilationDependency whether this is a dependency for a lazy-compiled module
	 */
	constructor(
		module,
		importSpecifiers,
		defaultImport,
		expression,
		range,
		identifier,
		isLazyCompilationDependency = false
	) {
		super(expression, range, identifier);

		this.importedModule = module;
		this.specifiers = importSpecifiers;
		this.default = defaultImport;
		this.isLazyCompilationDependency = isLazyCompilationDependency;
	}

	/**
	 * @returns {string} hash update
	 */
	_createHashUpdate() {
		return `${this.importedModule}${JSON.stringify(this.specifiers)}${
			this.default || "null"
		}${this.isLazyCompilationDependency ? "lazy" : ""}${super._createHashUpdate()}`;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		super.serialize(context);
		const { write } = context;
		write(this.importedModule);
		write(this.specifiers);
		write(this.default);
		write(this.isLazyCompilationDependency);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		super.deserialize(context);
		const { read } = context;
		this.importedModule = read();
		this.specifiers = read();
		this.default = read();
		this.isLazyCompilationDependency = read();
	}

	/**
	 * @param {boolean} value whether this is a dependency for a lazy-compiled module
	 */
	setLazyCompilationDependency(value) {
		this.isLazyCompilationDependency = value;
	}

	/**
	 * @returns {boolean} whether this is a dependency for a lazy-compiled module
	 */
	isLazyCompiled() {
		return this.isLazyCompilationDependency === true;
	}

	/**
	 * @returns {string} the external module path or URL
	 */
	getExternalResourcePath() {
		return `${RuntimeGlobals.publicPath}${this.importedModule}`;
	}
}

makeSerializable(
	ExternalModuleDependency,
	"webpack/lib/dependencies/ExternalModuleDependency"
);

ExternalModuleDependency.Template = class ExternalModuleDependencyTemplate extends (
	CachedConstDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		super.apply(dependency, source, templateContext);
		const dep = /** @type {ExternalModuleDependency} */ (dependency);
		const { chunkInitFragments, runtimeTemplate } = templateContext;

		// Add runtime requirements for lazy loading if needed
		if (dep.isLazyCompiled()) {
			templateContext.runtimeRequirements.add(RuntimeGlobals.loadScript);
		}

		// Create the external module initialization fragment
		const externalModulePath = `${runtimeTemplate.supportNodePrefixForCoreModules() ? "node:" : ""}${
			dep.importedModule
		}`;

		// Different handling for lazy-compiled external dependencies
		if (dep.isLazyCompilationDependency) {
			// Register this external in the lazy compilation tracking system
			const externalResource = dep.getExternalResourcePath();

			chunkInitFragments.push(
				new ExternalModuleInitFragment(
					externalModulePath,
					dep.specifiers,
					dep.default,
					true, // isLazy
					externalResource
				)
			);
		} else {
			// Standard external module handling
			chunkInitFragments.push(
				new ExternalModuleInitFragment(
					externalModulePath,
					dep.specifiers,
					dep.default
				)
			);
		}
	}
};

module.exports = ExternalModuleDependency;
