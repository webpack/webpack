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
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../util/createHash").Hash} Hash */

class HarmonyImportDependency extends ModuleDependency {
	/**
	 *
	 * @param {string} request request string
	 * @param {number} sourceOrder source order
	 */
	constructor(request, sourceOrder) {
		super(request);
		this.sourceOrder = sourceOrder;
	}

	/**
	 * Returns the referenced module and export
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {DependencyReference} reference
	 */
	getReference(moduleGraph) {
		if (!moduleGraph.getModule(this)) return null;
		return new DependencyReference(
			() => moduleGraph.getModule(this),
			false,
			this.weak,
			this.sourceOrder
		);
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {string} name of the variable for the import
	 */
	getImportVar(moduleGraph) {
		const module = moduleGraph.getParentModule(this);
		const meta = moduleGraph.getMeta(module);
		let importVarMap = meta.importVarMap;
		if (!importVarMap) meta.importVarMap = importVarMap = new Map();
		let importVar = importVarMap.get(moduleGraph.getModule(this));
		if (importVar) return importVar;
		importVar = `${Template.toIdentifier(
			`${this.userRequest}`
		)}__WEBPACK_IMPORTED_MODULE_${importVarMap.size}__`;
		importVarMap.set(moduleGraph.getModule(this), importVar);
		return importVar;
	}

	/**
	 * @param {boolean} update create new variables or update existing one
	 * @param {DependencyTemplateContext} templateContext the template context
	 * @returns {string} name of the variable for the import
	 */
	getImportStatement(
		update,
		{ runtimeTemplate, module, moduleGraph, chunkGraph, runtimeRequirements }
	) {
		return runtimeTemplate.importStatement({
			update,
			module: moduleGraph.getModule(this),
			chunkGraph,
			importVar: this.getImportVar(moduleGraph),
			request: this.request,
			originModule: module,
			runtimeRequirements
		});
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		super.updateHash(hash, chunkGraph);
		const importedModule = chunkGraph.moduleGraph.getModule(this);
		hash.update(
			(importedModule &&
				(!importedModule.buildMeta || importedModule.buildMeta.exportsType)) +
				""
		);
	}

	serialize(context) {
		const { write } = context;
		write(this.sourceOrder);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.sourceOrder = read();
		super.deserialize(context);
	}
}

module.exports = HarmonyImportDependency;

const importEmittedMap = new WeakMap();

HarmonyImportDependency.Template = class HarmonyImportDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyImportDependency} */ (dependency);
		const { module, moduleGraph } = templateContext;

		const referencedModule = moduleGraph.getModule(dep);
		const moduleKey = referencedModule
			? referencedModule.identifier()
			: dep.request;
		const key = `harmony import ${moduleKey}`;

		if (module) {
			let emittedModules = importEmittedMap.get(dep);
			if (emittedModules === undefined) {
				emittedModules = new WeakSet();
				importEmittedMap.set(dep, emittedModules);
			}
			emittedModules.add(module);
		}

		templateContext.initFragments.push(
			new InitFragment(
				dep.getImportStatement(false, templateContext),
				InitFragment.STAGE_HARMONY_IMPORTS,
				dep.sourceOrder,
				key
			)
		);
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
};
