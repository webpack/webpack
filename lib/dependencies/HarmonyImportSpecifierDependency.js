/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyLinkingError = require("../HarmonyLinkingError");
const DependencyReference = require("./DependencyReference");
const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/createHash").Hash} Hash */

class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
	constructor(
		request,
		originModule,
		sourceOrder,
		parserScope,
		id,
		name,
		range,
		strictExportPresence
	) {
		super(request, originModule, sourceOrder, parserScope);
		this.id = id === null ? null : `${id}`;
		this.redirectedId = undefined;
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

	get _id() {
		return this.redirectedId || this.id;
	}

	/**
	 * Returns the referenced module and export
	 * @returns {DependencyReference} reference
	 */
	getReference() {
		if (!this._module) return null;
		return new DependencyReference(
			() => this._module,
			this._id && !this.namespaceObjectAsContext ? [this._id] : true,
			false,
			this.sourceOrder
		);
	}

	/**
	 * Returns warnings
	 * @returns {WebpackError[]} warnings
	 */
	getWarnings() {
		if (
			this.strictExportPresence ||
			this.originModule.buildMeta.strictHarmonyModule
		) {
			return [];
		}
		return this._getErrors();
	}

	/**
	 * Returns errors
	 * @returns {WebpackError[]} errors
	 */
	getErrors() {
		if (
			this.strictExportPresence ||
			this.originModule.buildMeta.strictHarmonyModule
		) {
			return this._getErrors();
		}
		return [];
	}

	_getErrors() {
		const importedModule = this._module;
		if (!importedModule) {
			return;
		}

		if (!importedModule.buildMeta || !importedModule.buildMeta.exportsType) {
			// It's not an harmony module
			if (
				this.originModule.buildMeta.strictHarmonyModule &&
				this._id !== "default"
			) {
				// In strict harmony modules we only support the default export
				const exportName = this._id
					? `the named export '${this._id}'`
					: "the namespace object";
				return [
					new HarmonyLinkingError(
						`Can't import ${exportName} from non EcmaScript module (only default export is available)`
					)
				];
			}
			return;
		}

		if (!this._id) {
			return;
		}

		if (importedModule.isProvided(this._id) !== false) {
			// It's provided or we are not sure
			return;
		}

		// We are sure that it's not provided
		const idIsNotNameMessage =
			this._id !== this.name ? ` (imported as '${this.name}')` : "";
		const errorMessage = `"export '${
			this._id
		}'${idIsNotNameMessage} was not found in '${this.userRequest}'`;
		return [new HarmonyLinkingError(errorMessage)];
	}

	// implement this method to allow the occurrence order plugin to count correctly
	getNumberOfIdOccurrences() {
		return 0;
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
		hash.update((importedModule && this._id) + "");
		hash.update(
			(importedModule && this._id && importedModule.isUsed(this._id)) + ""
		);
		hash.update(
			(importedModule &&
				(!importedModule.buildMeta || importedModule.buildMeta.exportsType)) +
				""
		);
		hash.update(
			(importedModule &&
				importedModule.used + JSON.stringify(importedModule.usedExports)) + ""
		);
	}

	/**
	 * Disconnect the dependency from the graph
	 * @returns {void}
	 */
	disconnect() {
		super.disconnect();
		this.redirectedId = undefined;
	}
}

HarmonyImportSpecifierDependency.Template = class HarmonyImportSpecifierDependencyTemplate extends HarmonyImportDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {HarmonyImportSpecifierDependency} */ (dependency);
		super.apply(dep, source, runtimeTemplate, dependencyTemplates);
		const content = this.getContent(dep, runtimeTemplate);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}

	getContent(dep, runtime) {
		const exportExpr = runtime.exportFromImport({
			module: dep._module,
			request: dep.request,
			exportName: dep._id,
			originModule: dep.originModule,
			asiSafe: dep.shorthand,
			isCall: dep.call,
			callContext: !dep.directImport,
			importVar: dep.getImportVar()
		});
		return dep.shorthand ? `${dep.name}: ${exportExpr}` : exportExpr;
	}
};

module.exports = HarmonyImportSpecifierDependency;
