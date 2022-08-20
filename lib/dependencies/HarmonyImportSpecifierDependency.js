/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const {
	getDependencyUsedByExportsCondition
} = require("../optimize/InnerGraph");
const makeSerializable = require("../util/makeSerializable");
const propertyAccess = require("../util/propertyAccess");
const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

const idsSymbol = Symbol("HarmonyImportSpecifierDependency.ids");

const { ExportPresenceModes } = HarmonyImportDependency;

class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
	constructor(
		request,
		sourceOrder,
		ids,
		name,
		range,
		exportPresenceMode,
		assertions
	) {
		super(request, sourceOrder, assertions);
		this.ids = ids;
		this.name = name;
		this.range = range;
		this.exportPresenceMode = exportPresenceMode;
		this.namespaceObjectAsContext = false;
		this.call = undefined;
		this.directImport = undefined;
		this.shorthand = undefined;
		this.asiSafe = undefined;
		/** @type {Set<string> | boolean} */
		this.usedByExports = undefined;
	}

	// TODO webpack 6 remove
	get id() {
		throw new Error("id was renamed to ids and type changed to string[]");
	}

	// TODO webpack 6 remove
	getId() {
		throw new Error("id was renamed to ids and type changed to string[]");
	}

	// TODO webpack 6 remove
	setId() {
		throw new Error("id was renamed to ids and type changed to string[]");
	}

	get type() {
		return "harmony import specifier";
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {string[]} the imported ids
	 */
	getIds(moduleGraph) {
		const meta = moduleGraph.getMetaIfExisting(this);
		if (meta === undefined) return this.ids;
		const ids = meta[idsSymbol];
		return ids !== undefined ? ids : this.ids;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {string[]} ids the imported ids
	 * @returns {void}
	 */
	setIds(moduleGraph, ids) {
		moduleGraph.getMeta(this)[idsSymbol] = ids;
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | function(ModuleGraphConnection, RuntimeSpec): ConnectionState} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return getDependencyUsedByExportsCondition(
			this,
			this.usedByExports,
			moduleGraph
		);
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this dependency connects the module to referencing modules
	 */
	getModuleEvaluationSideEffectsState(moduleGraph) {
		return false;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {(string[] | ReferencedExport)[]} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		let ids = this.getIds(moduleGraph);
		if (ids.length === 0) return Dependency.EXPORTS_OBJECT_REFERENCED;
		let namespaceObjectAsContext = this.namespaceObjectAsContext;
		if (ids[0] === "default") {
			const selfModule = moduleGraph.getParentModule(this);
			const importedModule = moduleGraph.getModule(this);
			switch (
				importedModule.getExportsType(
					moduleGraph,
					selfModule.buildMeta.strictHarmonyModule
				)
			) {
				case "default-only":
				case "default-with-named":
					if (ids.length === 1) return Dependency.EXPORTS_OBJECT_REFERENCED;
					ids = ids.slice(1);
					namespaceObjectAsContext = true;
					break;
				case "dynamic":
					return Dependency.EXPORTS_OBJECT_REFERENCED;
			}
		}

		if (
			this.call &&
			!this.directImport &&
			(namespaceObjectAsContext || ids.length > 1)
		) {
			if (ids.length === 1) return Dependency.EXPORTS_OBJECT_REFERENCED;
			ids = ids.slice(0, -1);
		}

		return [ids];
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {number} effective mode
	 */
	_getEffectiveExportPresenceLevel(moduleGraph) {
		if (this.exportPresenceMode !== ExportPresenceModes.AUTO)
			return this.exportPresenceMode;
		return moduleGraph.getParentModule(this).buildMeta.strictHarmonyModule
			? ExportPresenceModes.ERROR
			: ExportPresenceModes.WARN;
	}

	/**
	 * Returns warnings
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[]} warnings
	 */
	getWarnings(moduleGraph) {
		const exportsPresence = this._getEffectiveExportPresenceLevel(moduleGraph);
		if (exportsPresence === ExportPresenceModes.WARN) {
			return this._getErrors(moduleGraph);
		}
		return null;
	}

	/**
	 * Returns errors
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[]} errors
	 */
	getErrors(moduleGraph) {
		const exportsPresence = this._getEffectiveExportPresenceLevel(moduleGraph);
		if (exportsPresence === ExportPresenceModes.ERROR) {
			return this._getErrors(moduleGraph);
		}
		return null;
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | undefined} errors
	 */
	_getErrors(moduleGraph) {
		const ids = this.getIds(moduleGraph);
		return this.getLinkingErrors(
			moduleGraph,
			ids,
			`(imported as '${this.name}')`
		);
	}

	/**
	 * implement this method to allow the occurrence order plugin to count correctly
	 * @returns {number} count how often the id is used in this dependency
	 */
	getNumberOfIdOccurrences() {
		return 0;
	}

	serialize(context) {
		const { write } = context;
		write(this.ids);
		write(this.name);
		write(this.range);
		write(this.exportPresenceMode);
		write(this.namespaceObjectAsContext);
		write(this.call);
		write(this.directImport);
		write(this.shorthand);
		write(this.asiSafe);
		write(this.usedByExports);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.ids = read();
		this.name = read();
		this.range = read();
		this.exportPresenceMode = read();
		this.namespaceObjectAsContext = read();
		this.call = read();
		this.directImport = read();
		this.shorthand = read();
		this.asiSafe = read();
		this.usedByExports = read();
		super.deserialize(context);
	}
}

makeSerializable(
	HarmonyImportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyImportSpecifierDependency"
);

HarmonyImportSpecifierDependency.Template = class HarmonyImportSpecifierDependencyTemplate extends (
	HarmonyImportDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyImportSpecifierDependency} */ (dependency);
		const { moduleGraph, runtime } = templateContext;
		const connection = moduleGraph.getConnection(dep);
		// Skip rendering depending when dependency is conditional
		if (connection && !connection.isTargetActive(runtime)) return;

		const ids = dep.getIds(moduleGraph);
		const exportExpr = this._getCodeForIds(dep, source, templateContext, ids);
		const range = dep.range;
		if (dep.shorthand) {
			source.insert(range[1], `: ${exportExpr}`);
		} else {
			source.replace(range[0], range[1] - 1, exportExpr);
		}
	}

	/**
	 * @param {HarmonyImportSpecifierDependency} dep dependency
	 * @param {ReplaceSource} source source
	 * @param {DependencyTemplateContext} templateContext context
	 * @param {string[]} ids ids
	 * @returns {string} generated code
	 */
	_getCodeForIds(dep, source, templateContext, ids) {
		const { moduleGraph, module, runtime, concatenationScope } =
			templateContext;
		const connection = moduleGraph.getConnection(dep);
		let exportExpr;
		if (
			connection &&
			concatenationScope &&
			concatenationScope.isModuleInScope(connection.module)
		) {
			if (ids.length === 0) {
				exportExpr = concatenationScope.createModuleReference(
					connection.module,
					{
						asiSafe: dep.asiSafe
					}
				);
			} else if (dep.namespaceObjectAsContext && ids.length === 1) {
				exportExpr =
					concatenationScope.createModuleReference(connection.module, {
						asiSafe: dep.asiSafe
					}) + propertyAccess(ids);
			} else {
				exportExpr = concatenationScope.createModuleReference(
					connection.module,
					{
						ids,
						call: dep.call,
						directImport: dep.directImport,
						asiSafe: dep.asiSafe
					}
				);
			}
		} else {
			super.apply(dep, source, templateContext);

			const { runtimeTemplate, initFragments, runtimeRequirements } =
				templateContext;

			exportExpr = runtimeTemplate.exportFromImport({
				moduleGraph,
				module: moduleGraph.getModule(dep),
				request: dep.request,
				exportName: ids,
				originModule: module,
				asiSafe: dep.shorthand ? true : dep.asiSafe,
				isCall: dep.call,
				callContext: !dep.directImport,
				defaultInterop: true,
				importVar: dep.getImportVar(moduleGraph),
				initFragments,
				runtime,
				runtimeRequirements
			});
		}
		return exportExpr;
	}
};

module.exports = HarmonyImportSpecifierDependency;
