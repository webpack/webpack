/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const { UsageState } = require("../ExportsInfo");
const HarmonyLinkingError = require("../HarmonyLinkingError");
const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { countIterable } = require("../util/IterableHelpers");
const { first, combine } = require("../util/SetHelpers");
const makeSerializable = require("../util/makeSerializable");
const propertyAccess = require("../util/propertyAccess");
const HarmonyExportInitFragment = require("./HarmonyExportInitFragment");
const HarmonyImportDependency = require("./HarmonyImportDependency");
const processExportInfo = require("./processExportInfo");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ExportsInfo")} ExportsInfo */
/** @typedef {import("../ExportsInfo").ExportInfo} ExportInfo */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/** @typedef {"missing"|"unused"|"empty-star"|"reexport-dynamic-default"|"reexport-named-default"|"reexport-namespace-object"|"reexport-fake-namespace-object"|"reexport-undefined"|"normal-reexport"|"dynamic-reexport"} ExportModeType */

const idsSymbol = Symbol("HarmonyExportImportedSpecifierDependency.ids");

class NormalReexportItem {
	/**
	 * @param {string} name export name
	 * @param {string[]} ids reexported ids from other module
	 * @param {ExportInfo} exportInfo export info from other module
	 * @param {boolean} checked true, if it should be checked at runtime if this export exists
	 * @param {boolean} hidden true, if it is hidden behind another active export in the same module
	 */
	constructor(name, ids, exportInfo, checked, hidden) {
		this.name = name;
		this.ids = ids;
		this.exportInfo = exportInfo;
		this.checked = checked;
		this.hidden = hidden;
	}
}

class ExportMode {
	/**
	 * @param {ExportModeType} type type of the mode
	 */
	constructor(type) {
		/** @type {ExportModeType} */
		this.type = type;

		// for "normal-reexport":
		/** @type {NormalReexportItem[] | null} */
		this.items = null;

		// for "reexport-named-default" | "reexport-fake-namespace-object" | "reexport-namespace-object"
		/** @type {string|null} */
		this.name = null;
		/** @type {ExportInfo | null} */
		this.partialNamespaceExportInfo = null;

		// for "dynamic-reexport":
		/** @type {Set<string> | null} */
		this.ignored = null;

		// for "dynamic-reexport" | "empty-star":
		/** @type {Set<string> | null} */
		this.hidden = null;

		// for "missing":
		/** @type {string | null} */
		this.userRequest = null;

		// for "reexport-fake-namespace-object":
		/** @type {number} */
		this.fakeType = 0;
	}
}

const determineExportAssignments = (
	moduleGraph,
	dependencies,
	additionalDependency
) => {
	const names = new Set();
	const dependencyIndices = [];

	if (additionalDependency) {
		dependencies = dependencies.concat(additionalDependency);
	}

	for (const dep of dependencies) {
		const i = dependencyIndices.length;
		dependencyIndices[i] = names.size;
		const otherImportedModule = moduleGraph.getModule(dep);
		if (otherImportedModule) {
			const exportsInfo = moduleGraph.getExportsInfo(otherImportedModule);
			for (const exportInfo of exportsInfo.exports) {
				if (
					exportInfo.provided === true &&
					exportInfo.name !== "default" &&
					!names.has(exportInfo.name)
				) {
					names.add(exportInfo.name);
					dependencyIndices[i] = names.size;
				}
			}
		}
	}
	dependencyIndices.push(names.size);

	return { names: Array.from(names), dependencyIndices };
};

const findDependencyForName = (
	{ names, dependencyIndices },
	name,
	dependencies
) => {
	const dependenciesIt = dependencies[Symbol.iterator]();
	const dependencyIndicesIt = dependencyIndices[Symbol.iterator]();
	let dependenciesItResult = dependenciesIt.next();
	let dependencyIndicesItResult = dependencyIndicesIt.next();
	if (dependencyIndicesItResult.done) return;
	for (let i = 0; i < names.length; i++) {
		while (i >= dependencyIndicesItResult.value) {
			dependenciesItResult = dependenciesIt.next();
			dependencyIndicesItResult = dependencyIndicesIt.next();
			if (dependencyIndicesItResult.done) return;
		}
		if (names[i] === name) return dependenciesItResult.value;
	}
	return undefined;
};

class HarmonyExportImportedSpecifierDependency extends HarmonyImportDependency {
	/**
	 * @param {string} request the request string
	 * @param {number} sourceOrder the order in the original source file
	 * @param {string[]} ids the requested export name of the imported module
	 * @param {string | null} name the export name of for this module
	 * @param {Set<string>} activeExports other named exports in the module
	 * @param {ReadonlyArray<HarmonyExportImportedSpecifierDependency> | Iterable<HarmonyExportImportedSpecifierDependency>} otherStarExports other star exports in the module before this import
	 * @param {boolean} strictExportPresence when true, missing exports in the imported module lead to errors instead of warnings
	 * @param {HarmonyStarExportsList} allStarExports all star exports in the module
	 */
	constructor(
		request,
		sourceOrder,
		ids,
		name,
		activeExports,
		otherStarExports,
		strictExportPresence,
		allStarExports
	) {
		super(request, sourceOrder);

		this.ids = ids;
		this.name = name;
		this.activeExports = activeExports;
		this.otherStarExports = otherStarExports;
		this.strictExportPresence = strictExportPresence;
		this.allStarExports = allStarExports;
		this._getMode = this._getMode.bind(this);
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
		return "harmony export imported specifier";
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {string[]} the imported id
	 */
	getIds(moduleGraph) {
		return moduleGraph.getMeta(this)[idsSymbol] || this.ids;
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
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {ExportMode} the export mode
	 */
	getMode(moduleGraph, runtime) {
		return moduleGraph.cached(this._getMode, runtime);
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {ExportMode} the export mode
	 */
	_getMode(moduleGraph, runtime) {
		const name = this.name;
		const ids = this.getIds(moduleGraph);
		const parentModule = moduleGraph.getParentModule(this);
		const importedModule = moduleGraph.getModule(this);
		const exportsInfo = moduleGraph.getExportsInfo(parentModule);

		if (!importedModule) {
			const mode = new ExportMode("missing");

			mode.userRequest = this.userRequest;

			return mode;
		}

		if (
			name
				? exportsInfo.getUsed(name, runtime) === UsageState.Unused
				: exportsInfo.isUsed(runtime) === false
		) {
			const mode = new ExportMode("unused");

			mode.name = name || "*";

			return mode;
		}

		const importedExportsType = importedModule.getExportsType(
			moduleGraph,
			parentModule.buildMeta.strictHarmonyModule
		);

		// Special handling for reexporting the default export
		// from non-namespace modules
		if (name && ids.length > 0 && ids[0] === "default") {
			switch (importedExportsType) {
				case "dynamic": {
					const mode = new ExportMode("reexport-dynamic-default");

					mode.name = name;

					return mode;
				}
				case "default-only":
				case "default-with-named": {
					const exportInfo = exportsInfo.getReadOnlyExportInfo(name);
					const mode = new ExportMode("reexport-named-default");

					mode.name = name;
					mode.partialNamespaceExportInfo = exportInfo;

					return mode;
				}
			}
		}

		// reexporting with a fixed name
		if (name) {
			let mode;
			const exportInfo = exportsInfo.getReadOnlyExportInfo(name);

			if (ids.length > 0) {
				// export { name as name }
				switch (importedExportsType) {
					case "default-only":
						mode = new ExportMode("reexport-undefined");
						mode.name = name;
						break;
					default:
						mode = new ExportMode("normal-reexport");
						mode.items = [
							new NormalReexportItem(name, ids, exportInfo, false, false)
						];
						break;
				}
			} else {
				// export * as name
				switch (importedExportsType) {
					case "default-only":
						mode = new ExportMode("reexport-fake-namespace-object");
						mode.name = name;
						mode.partialNamespaceExportInfo = exportInfo;
						mode.fakeType = 0;
						break;
					case "default-with-named":
						mode = new ExportMode("reexport-fake-namespace-object");
						mode.name = name;
						mode.partialNamespaceExportInfo = exportInfo;
						mode.fakeType = 2;
						break;
					case "dynamic":
					default:
						mode = new ExportMode("reexport-namespace-object");
						mode.name = name;
						mode.partialNamespaceExportInfo = exportInfo;
				}
			}

			return mode;
		}

		// Star reexporting

		const { ignoredExports, exports, checked, hidden } = this.getStarReexports(
			moduleGraph,
			runtime,
			exportsInfo,
			importedModule
		);
		if (!exports) {
			// We have too few info about the modules
			// Delegate the logic to the runtime code

			const mode = new ExportMode("dynamic-reexport");
			mode.ignored = ignoredExports;
			mode.hidden = hidden;

			return mode;
		}

		if (exports.size === 0) {
			const mode = new ExportMode("empty-star");
			mode.hidden = hidden;

			return mode;
		}

		const mode = new ExportMode("normal-reexport");

		mode.items = Array.from(
			exports,
			exportName =>
				new NormalReexportItem(
					exportName,
					[exportName],
					exportsInfo.getReadOnlyExportInfo(exportName),
					checked.has(exportName),
					false
				)
		);
		if (hidden !== undefined) {
			for (const exportName of hidden) {
				mode.items.push(
					new NormalReexportItem(
						exportName,
						[exportName],
						exportsInfo.getReadOnlyExportInfo(exportName),
						false,
						true
					)
				);
			}
		}

		return mode;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {ExportsInfo} exportsInfo exports info about the current module (optional)
	 * @param {Module} importedModule the imported module (optional)
	 * @returns {{exports?: Set<string>, checked?: Set<string>, ignoredExports: Set<string>, hidden?: Set<string>}} information
	 */
	getStarReexports(
		moduleGraph,
		runtime,
		exportsInfo = moduleGraph.getExportsInfo(moduleGraph.getParentModule(this)),
		importedModule = moduleGraph.getModule(this)
	) {
		const importedExportsInfo = moduleGraph.getExportsInfo(importedModule);

		const noExtraExports =
			importedExportsInfo.otherExportsInfo.provided === false;
		const noExtraImports =
			exportsInfo.otherExportsInfo.getUsed(runtime) === UsageState.Unused;

		const ignoredExports = new Set(["default", ...this.activeExports]);

		let hiddenExports = undefined;
		const otherStarExports =
			this._discoverActiveExportsFromOtherStarExports(moduleGraph);
		if (otherStarExports !== undefined) {
			hiddenExports = new Set();
			for (let i = 0; i < otherStarExports.namesSlice; i++) {
				hiddenExports.add(otherStarExports.names[i]);
			}
			for (const e of ignoredExports) hiddenExports.delete(e);
		}

		if (!noExtraExports && !noExtraImports) {
			return {
				ignoredExports,
				hidden: hiddenExports
			};
		}

		/** @type {Set<string>} */
		const exports = new Set();
		/** @type {Set<string>} */
		const checked = new Set();
		/** @type {Set<string>} */
		const hidden = hiddenExports !== undefined ? new Set() : undefined;

		if (noExtraImports) {
			for (const exportInfo of exportsInfo.orderedExports) {
				const name = exportInfo.name;
				if (ignoredExports.has(name)) continue;
				if (exportInfo.getUsed(runtime) === UsageState.Unused) continue;
				const importedExportInfo =
					importedExportsInfo.getReadOnlyExportInfo(name);
				if (importedExportInfo.provided === false) continue;
				if (hiddenExports !== undefined && hiddenExports.has(name)) {
					hidden.add(name);
					continue;
				}
				exports.add(name);
				if (importedExportInfo.provided === true) continue;
				checked.add(name);
			}
		} else if (noExtraExports) {
			for (const importedExportInfo of importedExportsInfo.orderedExports) {
				const name = importedExportInfo.name;
				if (ignoredExports.has(name)) continue;
				if (importedExportInfo.provided === false) continue;
				const exportInfo = exportsInfo.getReadOnlyExportInfo(name);
				if (exportInfo.getUsed(runtime) === UsageState.Unused) continue;
				if (hiddenExports !== undefined && hiddenExports.has(name)) {
					hidden.add(name);
					continue;
				}
				exports.add(name);
				if (importedExportInfo.provided === true) continue;
				checked.add(name);
			}
		}

		return { ignoredExports, exports, checked, hidden };
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | function(ModuleGraphConnection, RuntimeSpec): ConnectionState} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return (connection, runtime) => {
			const mode = this.getMode(moduleGraph, runtime);
			return mode.type !== "unused" && mode.type !== "empty-star";
		};
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
		const mode = this.getMode(moduleGraph, runtime);

		switch (mode.type) {
			case "missing":
			case "unused":
			case "empty-star":
			case "reexport-undefined":
				return Dependency.NO_EXPORTS_REFERENCED;

			case "reexport-dynamic-default":
				return Dependency.EXPORTS_OBJECT_REFERENCED;

			case "reexport-named-default": {
				if (!mode.partialNamespaceExportInfo)
					return Dependency.EXPORTS_OBJECT_REFERENCED;
				/** @type {string[][]} */
				const referencedExports = [];
				processExportInfo(
					runtime,
					referencedExports,
					[],
					/** @type {ExportInfo} */ (mode.partialNamespaceExportInfo)
				);
				return referencedExports;
			}

			case "reexport-namespace-object":
			case "reexport-fake-namespace-object": {
				if (!mode.partialNamespaceExportInfo)
					return Dependency.EXPORTS_OBJECT_REFERENCED;
				/** @type {string[][]} */
				const referencedExports = [];
				processExportInfo(
					runtime,
					referencedExports,
					[],
					/** @type {ExportInfo} */ (mode.partialNamespaceExportInfo),
					mode.type === "reexport-fake-namespace-object"
				);
				return referencedExports;
			}

			case "dynamic-reexport":
				return Dependency.EXPORTS_OBJECT_REFERENCED;

			case "normal-reexport": {
				const referencedExports = [];
				for (const { ids, exportInfo, hidden } of mode.items) {
					if (hidden) continue;
					processExportInfo(runtime, referencedExports, ids, exportInfo, false);
				}
				return referencedExports;
			}

			default:
				throw new Error(`Unknown mode ${mode.type}`);
		}
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {{ names: string[], namesSlice: number, dependencyIndices: number[], dependencyIndex: number } | undefined} exported names and their origin dependency
	 */
	_discoverActiveExportsFromOtherStarExports(moduleGraph) {
		if (!this.otherStarExports) return undefined;

		const i =
			"length" in this.otherStarExports
				? this.otherStarExports.length
				: countIterable(this.otherStarExports);
		if (i === 0) return undefined;

		if (this.allStarExports) {
			const { names, dependencyIndices } = moduleGraph.cached(
				determineExportAssignments,
				this.allStarExports.dependencies
			);

			return {
				names,
				namesSlice: dependencyIndices[i - 1],
				dependencyIndices,
				dependencyIndex: i
			};
		}

		const { names, dependencyIndices } = moduleGraph.cached(
			determineExportAssignments,
			this.otherStarExports,
			this
		);

		return {
			names,
			namesSlice: dependencyIndices[i - 1],
			dependencyIndices,
			dependencyIndex: i
		};
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const mode = this.getMode(moduleGraph, undefined);

		switch (mode.type) {
			case "missing":
				return undefined;
			case "dynamic-reexport": {
				const from = moduleGraph.getConnection(this);
				return {
					exports: true,
					from,
					canMangle: false,
					excludeExports: mode.hidden
						? combine(mode.ignored, mode.hidden)
						: mode.ignored,
					hideExports: mode.hidden,
					dependencies: [from.module]
				};
			}
			case "empty-star":
				return {
					exports: [],
					hideExports: mode.hidden,
					dependencies: [moduleGraph.getModule(this)]
				};
			// falls through
			case "normal-reexport": {
				const from = moduleGraph.getConnection(this);
				return {
					exports: Array.from(mode.items, item => ({
						name: item.name,
						from,
						export: item.ids,
						hidden: item.hidden
					})),
					priority: 1,
					dependencies: [from.module]
				};
			}
			case "reexport-dynamic-default": {
				{
					const from = moduleGraph.getConnection(this);
					return {
						exports: [
							{
								name: mode.name,
								from,
								export: ["default"]
							}
						],
						priority: 1,
						dependencies: [from.module]
					};
				}
			}
			case "reexport-undefined":
				return {
					exports: [mode.name],
					dependencies: [moduleGraph.getModule(this)]
				};
			case "reexport-fake-namespace-object": {
				const from = moduleGraph.getConnection(this);
				return {
					exports: [
						{
							name: mode.name,
							from,
							export: null,
							exports: [
								{
									name: "default",
									canMangle: false,
									from,
									export: null
								}
							]
						}
					],
					priority: 1,
					dependencies: [from.module]
				};
			}
			case "reexport-namespace-object": {
				const from = moduleGraph.getConnection(this);
				return {
					exports: [
						{
							name: mode.name,
							from,
							export: null
						}
					],
					priority: 1,
					dependencies: [from.module]
				};
			}
			case "reexport-named-default": {
				const from = moduleGraph.getConnection(this);
				return {
					exports: [
						{
							name: mode.name,
							from,
							export: ["default"]
						}
					],
					priority: 1,
					dependencies: [from.module]
				};
			}
			default:
				throw new Error(`Unknown mode ${mode.type}`);
		}
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
			return null;
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

		return null;
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | undefined} errors
	 */
	_getErrors(moduleGraph) {
		const ids = this.getIds(moduleGraph);
		let errors = this.getLinkingErrors(
			moduleGraph,
			ids,
			`(reexported as '${this.name}')`
		);
		if (ids.length === 0 && this.name === null) {
			const potentialConflicts =
				this._discoverActiveExportsFromOtherStarExports(moduleGraph);
			if (potentialConflicts && potentialConflicts.namesSlice > 0) {
				const ownNames = new Set(
					potentialConflicts.names.slice(
						potentialConflicts.namesSlice,
						potentialConflicts.dependencyIndices[
							potentialConflicts.dependencyIndex
						]
					)
				);
				const importedModule = moduleGraph.getModule(this);
				if (importedModule) {
					const exportsInfo = moduleGraph.getExportsInfo(importedModule);
					const conflicts = new Map();
					for (const exportInfo of exportsInfo.orderedExports) {
						if (exportInfo.provided !== true) continue;
						if (exportInfo.name === "default") continue;
						if (this.activeExports.has(exportInfo.name)) continue;
						if (ownNames.has(exportInfo.name)) continue;
						const conflictingDependency = findDependencyForName(
							potentialConflicts,
							exportInfo.name,
							this.allStarExports
								? this.allStarExports.dependencies
								: [...this.otherStarExports, this]
						);
						if (!conflictingDependency) continue;
						const target = exportInfo.getTerminalBinding(moduleGraph);
						if (!target) continue;
						const conflictingModule = moduleGraph.getModule(
							conflictingDependency
						);
						if (conflictingModule === importedModule) continue;
						const conflictingExportInfo = moduleGraph.getExportInfo(
							conflictingModule,
							exportInfo.name
						);
						const conflictingTarget =
							conflictingExportInfo.getTerminalBinding(moduleGraph);
						if (!conflictingTarget) continue;
						if (target === conflictingTarget) continue;
						const list = conflicts.get(conflictingDependency.request);
						if (list === undefined) {
							conflicts.set(conflictingDependency.request, [exportInfo.name]);
						} else {
							list.push(exportInfo.name);
						}
					}
					for (const [request, exports] of conflicts) {
						if (!errors) errors = [];
						errors.push(
							new HarmonyLinkingError(
								`The requested module '${
									this.request
								}' contains conflicting star exports for the ${
									exports.length > 1 ? "names" : "name"
								} ${exports
									.map(e => `'${e}'`)
									.join(", ")} with the previous requested module '${request}'`
							)
						);
					}
				}
			}
		}
		return errors;
	}

	serialize(context) {
		const { write, setCircularReference } = context;

		setCircularReference(this);
		write(this.ids);
		write(this.name);
		write(this.activeExports);
		write(this.otherStarExports);
		write(this.strictExportPresence);
		write(this.allStarExports);

		super.serialize(context);
	}

	deserialize(context) {
		const { read, setCircularReference } = context;

		setCircularReference(this);
		this.ids = read();
		this.name = read();
		this.activeExports = read();
		this.otherStarExports = read();
		this.strictExportPresence = read();
		this.allStarExports = read();

		super.deserialize(context);
	}
}

makeSerializable(
	HarmonyExportImportedSpecifierDependency,
	"webpack/lib/dependencies/HarmonyExportImportedSpecifierDependency"
);

module.exports = HarmonyExportImportedSpecifierDependency;

HarmonyExportImportedSpecifierDependency.Template = class HarmonyExportImportedSpecifierDependencyTemplate extends (
	HarmonyImportDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { moduleGraph, runtime, concatenationScope } = templateContext;

		const dep = /** @type {HarmonyExportImportedSpecifierDependency} */ (
			dependency
		);

		const mode = dep.getMode(moduleGraph, runtime);

		if (concatenationScope) {
			switch (mode.type) {
				case "reexport-undefined":
					concatenationScope.registerRawExport(
						mode.name,
						"/* reexport non-default export from non-harmony */ undefined"
					);
			}
			return;
		}

		if (mode.type !== "unused" && mode.type !== "empty-star") {
			super.apply(dependency, source, templateContext);

			this._addExportFragments(
				templateContext.initFragments,
				dep,
				mode,
				templateContext.module,
				moduleGraph,
				runtime,
				templateContext.runtimeTemplate,
				templateContext.runtimeRequirements
			);
		}
	}

	/**
	 * @param {InitFragment[]} initFragments target array for init fragments
	 * @param {HarmonyExportImportedSpecifierDependency} dep dependency
	 * @param {ExportMode} mode the export mode
	 * @param {Module} module the current module
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {Set<string>} runtimeRequirements runtime requirements
	 * @returns {void}
	 */
	_addExportFragments(
		initFragments,
		dep,
		mode,
		module,
		moduleGraph,
		runtime,
		runtimeTemplate,
		runtimeRequirements
	) {
		const importedModule = moduleGraph.getModule(dep);
		const importVar = dep.getImportVar(moduleGraph);

		switch (mode.type) {
			case "missing":
			case "empty-star":
				initFragments.push(
					new InitFragment(
						"/* empty/unused harmony star reexport */\n",
						InitFragment.STAGE_HARMONY_EXPORTS,
						1
					)
				);
				break;

			case "unused":
				initFragments.push(
					new InitFragment(
						`${Template.toNormalComment(
							`unused harmony reexport ${mode.name}`
						)}\n`,
						InitFragment.STAGE_HARMONY_EXPORTS,
						1
					)
				);
				break;

			case "reexport-dynamic-default":
				initFragments.push(
					this.getReexportFragment(
						module,
						"reexport default from dynamic",
						moduleGraph.getExportsInfo(module).getUsedName(mode.name, runtime),
						importVar,
						null,
						runtimeRequirements
					)
				);
				break;

			case "reexport-fake-namespace-object":
				initFragments.push(
					...this.getReexportFakeNamespaceObjectFragments(
						module,
						moduleGraph.getExportsInfo(module).getUsedName(mode.name, runtime),
						importVar,
						mode.fakeType,
						runtimeRequirements
					)
				);
				break;

			case "reexport-undefined":
				initFragments.push(
					this.getReexportFragment(
						module,
						"reexport non-default export from non-harmony",
						moduleGraph.getExportsInfo(module).getUsedName(mode.name, runtime),
						"undefined",
						"",
						runtimeRequirements
					)
				);
				break;

			case "reexport-named-default":
				initFragments.push(
					this.getReexportFragment(
						module,
						"reexport default export from named module",
						moduleGraph.getExportsInfo(module).getUsedName(mode.name, runtime),
						importVar,
						"",
						runtimeRequirements
					)
				);
				break;

			case "reexport-namespace-object":
				initFragments.push(
					this.getReexportFragment(
						module,
						"reexport module object",
						moduleGraph.getExportsInfo(module).getUsedName(mode.name, runtime),
						importVar,
						"",
						runtimeRequirements
					)
				);
				break;

			case "normal-reexport":
				for (const { name, ids, checked, hidden } of mode.items) {
					if (hidden) continue;
					if (checked) {
						initFragments.push(
							new InitFragment(
								"/* harmony reexport (checked) */ " +
									this.getConditionalReexportStatement(
										module,
										name,
										importVar,
										ids,
										runtimeRequirements
									),
								InitFragment.STAGE_HARMONY_IMPORTS,
								dep.sourceOrder
							)
						);
					} else {
						initFragments.push(
							this.getReexportFragment(
								module,
								"reexport safe",
								moduleGraph.getExportsInfo(module).getUsedName(name, runtime),
								importVar,
								moduleGraph
									.getExportsInfo(importedModule)
									.getUsedName(ids, runtime),
								runtimeRequirements
							)
						);
					}
				}
				break;

			case "dynamic-reexport": {
				const ignored = mode.hidden
					? combine(mode.ignored, mode.hidden)
					: mode.ignored;
				const modern =
					runtimeTemplate.supportsConst() &&
					runtimeTemplate.supportsArrowFunction();
				let content =
					"/* harmony reexport (unknown) */ var __WEBPACK_REEXPORT_OBJECT__ = {};\n" +
					`/* harmony reexport (unknown) */ for(${
						modern ? "const" : "var"
					} __WEBPACK_IMPORT_KEY__ in ${importVar}) `;

				// Filter out exports which are defined by other exports
				// and filter out default export because it cannot be reexported with *
				if (ignored.size > 1) {
					content +=
						"if(" +
						JSON.stringify(Array.from(ignored)) +
						".indexOf(__WEBPACK_IMPORT_KEY__) < 0) ";
				} else if (ignored.size === 1) {
					content += `if(__WEBPACK_IMPORT_KEY__ !== ${JSON.stringify(
						first(ignored)
					)}) `;
				}

				content += `__WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = `;
				if (modern) {
					content += `() => ${importVar}[__WEBPACK_IMPORT_KEY__]`;
				} else {
					content += `function(key) { return ${importVar}[key]; }.bind(0, __WEBPACK_IMPORT_KEY__)`;
				}

				runtimeRequirements.add(RuntimeGlobals.exports);
				runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);

				const exportsName = module.exportsArgument;
				initFragments.push(
					new InitFragment(
						`${content}\n/* harmony reexport (unknown) */ ${RuntimeGlobals.definePropertyGetters}(${exportsName}, __WEBPACK_REEXPORT_OBJECT__);\n`,
						InitFragment.STAGE_HARMONY_IMPORTS,
						dep.sourceOrder
					)
				);
				break;
			}

			default:
				throw new Error(`Unknown mode ${mode.type}`);
		}
	}

	getReexportFragment(
		module,
		comment,
		key,
		name,
		valueKey,
		runtimeRequirements
	) {
		const returnValue = this.getReturnValue(name, valueKey);

		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);

		const map = new Map();
		map.set(key, `/* ${comment} */ ${returnValue}`);

		return new HarmonyExportInitFragment(module.exportsArgument, map);
	}

	getReexportFakeNamespaceObjectFragments(
		module,
		key,
		name,
		fakeType,
		runtimeRequirements
	) {
		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
		runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);

		const map = new Map();
		map.set(
			key,
			`/* reexport fake namespace object from non-harmony */ ${name}_namespace_cache || (${name}_namespace_cache = ${
				RuntimeGlobals.createFakeNamespaceObject
			}(${name}${fakeType ? `, ${fakeType}` : ""}))`
		);

		return [
			new InitFragment(
				`var ${name}_namespace_cache;\n`,
				InitFragment.STAGE_CONSTANTS,
				-1,
				`${name}_namespace_cache`
			),
			new HarmonyExportInitFragment(module.exportsArgument, map)
		];
	}

	getConditionalReexportStatement(
		module,
		key,
		name,
		valueKey,
		runtimeRequirements
	) {
		if (valueKey === false) {
			return "/* unused export */\n";
		}

		const exportsName = module.exportsArgument;
		const returnValue = this.getReturnValue(name, valueKey);

		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
		runtimeRequirements.add(RuntimeGlobals.hasOwnProperty);

		return `if(${RuntimeGlobals.hasOwnProperty}(${name}, ${JSON.stringify(
			valueKey[0]
		)})) ${
			RuntimeGlobals.definePropertyGetters
		}(${exportsName}, { ${JSON.stringify(
			key
		)}: function() { return ${returnValue}; } });\n`;
	}

	getReturnValue(name, valueKey) {
		if (valueKey === null) {
			return `${name}_default.a`;
		}

		if (valueKey === "") {
			return name;
		}

		if (valueKey === false) {
			return "/* unused export */ undefined";
		}

		return `${name}${propertyAccess(valueKey)}`;
	}
};

class HarmonyStarExportsList {
	constructor() {
		/** @type {HarmonyExportImportedSpecifierDependency[]} */
		this.dependencies = [];
	}

	/**
	 * @param {HarmonyExportImportedSpecifierDependency} dep dependency
	 * @returns {void}
	 */
	push(dep) {
		this.dependencies.push(dep);
	}

	slice() {
		return this.dependencies.slice();
	}

	serialize({ write, setCircularReference }) {
		setCircularReference(this);
		write(this.dependencies);
	}

	deserialize({ read, setCircularReference }) {
		setCircularReference(this);
		this.dependencies = read();
	}
}

makeSerializable(
	HarmonyStarExportsList,
	"webpack/lib/dependencies/HarmonyExportImportedSpecifierDependency",
	"HarmonyStarExportsList"
);

module.exports.HarmonyStarExportsList = HarmonyStarExportsList;
