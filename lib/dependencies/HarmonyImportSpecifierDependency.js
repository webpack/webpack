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
/** @typedef {import("../javascript/JavascriptParser").Assertions} Assertions */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

const idsSymbol = Symbol("HarmonyImportSpecifierDependency.ids");

const { ExportPresenceModes } = HarmonyImportDependency;

class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
	/**
	 * @param {TODO} request request
	 * @param {number} sourceOrder source order
	 * @param {string[]} ids ids
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {TODO} exportPresenceMode export presence mode
	 * @param {Assertions=} assertions assertions
	 * @param {Range[]=} idRanges ranges for members of ids; the two arrays are right-aligned
	 */
	constructor(
		request,
		sourceOrder,
		ids,
		name,
		range,
		exportPresenceMode,
		assertions,
		idRanges // TODO webpack 6 make this non-optional. It must always be set to properly trim ids.
	) {
		super(request, sourceOrder, assertions);
		this.ids = ids;
		this.name = name;
		this.range = range;
		this.idRanges = idRanges;
		this.exportPresenceMode = exportPresenceMode;
		this.namespaceObjectAsContext = false;
		this.call = undefined;
		this.directImport = undefined;
		this.shorthand = undefined;
		this.asiSafe = undefined;
		/** @type {Set<string> | boolean} */
		this.usedByExports = undefined;
		/** @type {Set<string>} */
		this.referencedPropertiesInDestructuring = undefined;
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
		if (ids.length === 0) return this._getReferencedExportsInDestructuring();
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
					if (ids.length === 1)
						return this._getReferencedExportsInDestructuring();
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

		return this._getReferencedExportsInDestructuring(ids);
	}

	/**
	 * @param {string[]=} ids ids
	 * @returns {(string[] | ReferencedExport)[]} referenced exports
	 */
	_getReferencedExportsInDestructuring(ids) {
		if (this.referencedPropertiesInDestructuring) {
			/** @type {ReferencedExport[]} */
			const refs = [];
			for (const key of this.referencedPropertiesInDestructuring) {
				refs.push({
					name: ids ? ids.concat([key]) : [key],
					canMangle: false
				});
			}
			return refs;
		} else {
			return ids ? [ids] : Dependency.EXPORTS_OBJECT_REFERENCED;
		}
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

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.ids);
		write(this.name);
		write(this.range);
		write(this.idRanges);
		write(this.exportPresenceMode);
		write(this.namespaceObjectAsContext);
		write(this.call);
		write(this.directImport);
		write(this.shorthand);
		write(this.asiSafe);
		write(this.usedByExports);
		write(this.referencedPropertiesInDestructuring);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.ids = read();
		this.name = read();
		this.range = read();
		this.idRanges = read();
		this.exportPresenceMode = read();
		this.namespaceObjectAsContext = read();
		this.call = read();
		this.directImport = read();
		this.shorthand = read();
		this.asiSafe = read();
		this.usedByExports = read();
		this.referencedPropertiesInDestructuring = read();
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

		const ids = dep.getIds(moduleGraph); // determine minimal set of IDs.
		let trimmedIds = this._trimIdsToThoseImported(ids, moduleGraph, dep);

		let [rangeStart, rangeEnd] = dep.range;
		if (trimmedIds.length !== ids.length) {
			// The array returned from dep.idRanges is right-aligned with the array returned from dep.getIds.
			// Meaning, the two arrays may not always have the same number of elements, but the last element of
			// dep.idRanges corresponds to [the expression fragment to the left of] the last element of dep.getIds.
			// Use this to find the correct replacement range based on the number of ids that were trimmed.
			const idx =
				dep.idRanges === undefined
					? -1 /* trigger failure case below */
					: dep.idRanges.length + (trimmedIds.length - ids.length);
			if (idx < 0 || idx >= dep.idRanges.length) {
				// cspell:ignore minifiers
				// Should not happen but we can't throw an error here because of backward compatibility with
				// external plugins in wp5.  Instead, we just disable trimming for now.  This may break some minifiers.
				trimmedIds = ids;
				// TODO webpack 6 remove the "trimmedIds = ids" above and uncomment the following line instead.
				// throw new Error("Missing range starts data for id replacement trimming.");
			} else {
				[rangeStart, rangeEnd] = dep.idRanges[idx];
			}
		}

		const exportExpr = this._getCodeForIds(
			dep,
			source,
			templateContext,
			trimmedIds
		);
		if (dep.shorthand) {
			source.insert(rangeEnd, `: ${exportExpr}`);
		} else {
			source.replace(rangeStart, rangeEnd - 1, exportExpr);
		}
	}

	/**
	 * @summary Determine which IDs in the id chain are actually referring to namespaces or imports,
	 * and which are deeper member accessors on the imported object.  Only the former should be re-rendered.
	 * @param {string[]} ids ids
	 * @param {ModuleGraph} moduleGraph moduleGraph
	 * @param {HarmonyImportSpecifierDependency} dependency dependency
	 * @returns {string[]} generated code
	 */
	_trimIdsToThoseImported(ids, moduleGraph, dependency) {
		let trimmedIds = [];
		const exportsInfo = moduleGraph.getExportsInfo(
			moduleGraph.getModule(dependency)
		);
		let currentExportsInfo = /** @type {ExportsInfo=} */ exportsInfo;
		for (let i = 0; i < ids.length; i++) {
			if (i === 0 && ids[i] === "default") {
				continue; // ExportInfo for the next level under default is still at the root ExportsInfo, so don't advance currentExportsInfo
			}
			const exportInfo = currentExportsInfo.getExportInfo(ids[i]);
			if (exportInfo.provided === false) {
				// json imports have nested ExportInfo for elements that things that are not actually exported, so check .provided
				trimmedIds = ids.slice(0, i);
				break;
			}
			const nestedInfo = exportInfo.getNestedExportsInfo();
			if (!nestedInfo) {
				// once all nested exports are traversed, the next item is the actual import so stop there
				trimmedIds = ids.slice(0, i + 1);
				break;
			}
			currentExportsInfo = nestedInfo;
		}
		// Never trim to nothing.  This can happen for invalid imports (e.g. import { notThere } from "./module", or import { anything } from "./missingModule")
		return trimmedIds.length ? trimmedIds : ids;
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
