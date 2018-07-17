/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const Template = require("../Template");
const DependencyReference = require("./DependencyReference");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").TemplateContext} TemplateContext */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../util/createHash").Hash} Hash */

class HarmonyImportDependency extends ModuleDependency {
	constructor(request, originModule, sourceOrder, parserScope) {
		super(request);
		this.redirectedModule = undefined;
		this.originModule = originModule;
		this.sourceOrder = sourceOrder;
		this.parserScope = parserScope;
	}

	get _module() {
		return this.redirectedModule || this.module;
	}

	/**
	 * Returns the referenced module and export
	 * @returns {DependencyReference} reference
	 */
	getReference() {
		if (!this._module) return null;
		return new DependencyReference(
			() => this._module,
			false,
			this.weak,
			this.sourceOrder
		);
	}

	getImportVar() {
		let importVarMap = this.parserScope.importVarMap;
		if (!importVarMap) this.parserScope.importVarMap = importVarMap = new Map();
		let importVar = importVarMap.get(this._module);
		if (importVar) return importVar;
		importVar = `${Template.toIdentifier(
			`${this.userRequest}`
		)}__WEBPACK_IMPORTED_MODULE_${importVarMap.size}__`;
		importVarMap.set(this._module, importVar);
		return importVar;
	}

	getImportStatement(update, runtime) {
		return runtime.importStatement({
			update,
			module: this._module,
			importVar: this.getImportVar(),
			request: this.request,
			originModule: this.originModule
		});
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {void}
	 */
	updateHash(hash, moduleGraph) {
		super.updateHash(hash, moduleGraph);
		const importedModule = this._module;
		hash.update(
			(importedModule &&
				(!importedModule.buildMeta || importedModule.buildMeta.exportsType)) +
				""
		);
		hash.update((importedModule && importedModule.id) + "");
	}

	/**
	 * Disconnect the dependency from the graph
	 * @returns {void}
	 */
	disconnect() {
		super.disconnect();
		this.redirectedModule = undefined;
	}
}

module.exports = HarmonyImportDependency;

const importEmittedMap = new WeakMap();

HarmonyImportDependency.Template = class HarmonyImportDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		// no-op
	}

	/**
	 *
	 * @param {Dependency} dep the dependency
	 * @param {Module} module the module
	 * @returns {boolean} true, when for this dependency and module a import init fragment was created
	 */
	static isImportEmitted(dep, module) {
		const emittedModules = importEmittedMap.get(dep);
		return emittedModules !== undefined && emittedModules.has(module);
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {TemplateContext} templateContext the template context
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, { runtimeTemplate, module }) {
		const dep = /** @type {HarmonyImportDependency} */ (dependency);

		const moduleKey = dep._module ? dep._module.identifier() : dep.request;
		const key = `harmony import ${moduleKey}`;

		if (module) {
			let emittedModules = importEmittedMap.get(dep);
			if (emittedModules === undefined) {
				emittedModules = new WeakSet();
				importEmittedMap.set(dep, emittedModules);
			}
			emittedModules.add(module);
		}

		return [
			new InitFragment(
				dep.getImportStatement(false, runtimeTemplate),
				InitFragment.STAGE_HARMONY_IMPORTS,
				dep.sourceOrder,
				key
			)
		];
	}
};
