/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyLinkingError = require("../HarmonyLinkingError");
const makeSerializable = require("../util/makeSerializable");
const DependencyReference = require("./DependencyReference");
const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/createHash").Hash} Hash */

const idSymbol = Symbol("HarmonyImportSpecifierDependency.id");

class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
	constructor(request, sourceOrder, id, name, range, strictExportPresence) {
		super(request, sourceOrder);
		this.id = id === null ? null : `${id}`;
		this.name = name;
		this.range = range;
		this.strictExportPresence = strictExportPresence;
		this.namespaceObjectAsContext = false;
		this.callArgs = undefined;
		this.call = undefined;
		this.directImport = undefined;
		this.shorthand = undefined;
	}

	get type() {
		return "harmony import specifier";
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {string} the imported id
	 */
	getId(moduleGraph) {
		return moduleGraph.getMeta(this)[idSymbol] || this.id;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {string} id the imported id
	 * @returns {void}
	 */
	setId(moduleGraph, id) {
		moduleGraph.getMeta(this)[idSymbol] = id;
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
			this.getId(moduleGraph) && !this.namespaceObjectAsContext
				? [this.getId(moduleGraph)]
				: true,
			false,
			this.sourceOrder
		);
	}

	/**
	 * Returns warnings
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[]} warnings
	 */
	getWarnings(moduleGraph) {
		if (
			this.strictExportPresence ||
			moduleGraph.getParentModule(this).buildMeta.strictHarmonyModule
		) {
			return [];
		}
		return this._getErrors(moduleGraph);
	}

	/**
	 * Returns errors
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[]} errors
	 */
	getErrors(moduleGraph) {
		if (
			this.strictExportPresence ||
			moduleGraph.getParentModule(this).buildMeta.strictHarmonyModule
		) {
			return this._getErrors(moduleGraph);
		}
		return [];
	}

	_getErrors(moduleGraph) {
		const importedModule = moduleGraph.getModule(this);
		if (!importedModule) {
			return;
		}

		if (!importedModule.buildMeta || !importedModule.buildMeta.exportsType) {
			// It's not an harmony module
			if (
				moduleGraph.getParentModule(this).buildMeta.strictHarmonyModule &&
				this.getId(moduleGraph) !== "default"
			) {
				// In strict harmony modules we only support the default export
				const exportName = this.getId(moduleGraph)
					? `the named export '${this.getId(moduleGraph)}'`
					: "the namespace object";
				return [
					new HarmonyLinkingError(
						`Can't import ${exportName} from non EcmaScript module (only default export is available)`
					)
				];
			}
			return;
		}

		if (!this.getId(moduleGraph)) {
			return;
		}

		if (importedModule.isProvided(this.getId(moduleGraph)) !== false) {
			// It's provided or we are not sure
			return;
		}

		// We are sure that it's not provided
		const idIsNotNameMessage =
			this.getId(moduleGraph) !== this.name
				? ` (imported as '${this.name}')`
				: "";
		const errorMessage = `"export '${this.getId(
			moduleGraph
		)}'${idIsNotNameMessage} was not found in '${this.userRequest}'`;
		return [new HarmonyLinkingError(errorMessage)];
	}

	/**
	 * implement this method to allow the occurrence order plugin to count correctly
	 * @returns {number} count how often the id is used in this dependency
	 */
	getNumberOfIdOccurrences() {
		return 0;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		super.updateHash(hash, chunkGraph);
		const moduleGraph = chunkGraph.moduleGraph;
		const importedModule = moduleGraph.getModule(this);
		hash.update((importedModule && this.getId(moduleGraph)) + "");
		hash.update(
			(importedModule &&
				this.getId(moduleGraph) &&
				importedModule.getUsedName(moduleGraph, this.getId(moduleGraph))) + ""
		);
		hash.update(
			(importedModule &&
				(!importedModule.buildMeta || importedModule.buildMeta.exportsType)) +
				""
		);
		if (importedModule) {
			const usedExports = moduleGraph.getUsedExports(importedModule);
			const stringifyUsedExports = JSON.stringify(usedExports);
			hash.update(stringifyUsedExports);
		}
	}

	serialize(context) {
		const { write } = context;
		write(this.id);
		write(this.name);
		write(this.range);
		write(this.strictExportPresence);
		write(this.namespaceObjectAsContext);
		write(this.callArgs);
		write(this.call);
		write(this.directImport);
		write(this.shorthand);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.id = read();
		this.name = read();
		this.range = read();
		this.strictExportPresence = read();
		this.namespaceObjectAsContext = read();
		this.callArgs = read();
		this.call = read();
		this.directImport = read();
		this.shorthand = read();
		super.deserialize(context);
	}
}

makeSerializable(
	HarmonyImportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyImportSpecifierDependency"
);

HarmonyImportSpecifierDependency.Template = class HarmonyImportSpecifierDependencyTemplate extends HarmonyImportDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		super.apply(dependency, source, templateContext);
		const dep = /** @type {HarmonyImportSpecifierDependency} */ (dependency);
		const content = this.getContent(dep, templateContext);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}

	getContent(dep, { runtimeTemplate, module, moduleGraph }) {
		const exportExpr = runtimeTemplate.exportFromImport({
			moduleGraph,
			module: moduleGraph.getModule(dep),
			request: dep.request,
			exportName: dep.getId(moduleGraph),
			originModule: module,
			asiSafe: dep.shorthand,
			isCall: dep.call,
			callContext: !dep.directImport,
			importVar: dep.getImportVar(moduleGraph)
		});
		return dep.shorthand ? `${dep.name}: ${exportExpr}` : exportExpr;
	}
};

module.exports = HarmonyImportSpecifierDependency;
