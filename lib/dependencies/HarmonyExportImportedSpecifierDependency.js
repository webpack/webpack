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
const makeSerializable = require("../util/makeSerializable");
const propertyAccess = require("../util/propertyAccess");
const HarmonyExportInitFragment = require("./HarmonyExportInitFragment");
const HarmonyImportDependency = require("./HarmonyImportDependency");
const processExportInfo = require("./processExportInfo");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ExportsInfo")} ExportsInfo */
/** @typedef {import("../ExportsInfo").ExportInfo} ExportInfo */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
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
	 * @param {ExportInfo=} exportInfo export info from other module
	 * @param {boolean=} checked true, if it should be checked at runtime if this export exists
	 */
	constructor(name, ids, exportInfo, checked) {
		this.name = name;
		this.ids = ids;
		this.exportInfo = exportInfo;
		this.checked = checked;
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

		// for "missing":
		/** @type {string | null} */
		this.userRequest = null;

		// for "reexport-fake-namespace-object":
		/** @type {number} */
		this.fakeType = 0;
	}
}

class HarmonyExportImportedSpecifierDependency extends HarmonyImportDependency {
	/**
	 * @param {string} request the request string
	 * @param {number} sourceOrder the order in the original source file
	 * @param {string[]} ids the requested export name of the imported module
	 * @param {string | null} name the export name of for this module
	 * @param {Set<string>} activeExports other named exports in the module
	 * @param {Iterable<HarmonyExportImportedSpecifierDependency>} otherStarExports other star exports in the module
	 * @param {boolean} strictExportPresence when true, missing exports in the imported module lead to errors instead of warnings
	 */
	constructor(
		request,
		sourceOrder,
		ids,
		name,
		activeExports,
		otherStarExports,
		strictExportPresence
	) {
		super(request, sourceOrder);

		this.ids = ids;
		this.name = name;
		this.activeExports = activeExports;
		this.otherStarExports = otherStarExports;
		this.strictExportPresence = strictExportPresence;
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
						mode.items = [new NormalReexportItem(name, ids, exportInfo, false)];
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
						mode = new ExportMode("reexport-fake-namespace-object");
						mode.name = name;
						mode.partialNamespaceExportInfo = exportInfo;
						mode.fakeType = 6;
						break;
					default:
						mode = new ExportMode("reexport-namespace-object");
						mode.name = name;
						mode.partialNamespaceExportInfo = exportInfo;
				}
			}

			return mode;
		}

		// Star reexporting

		const { ignoredExports, exports, checked } = this.getStarReexports(
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

			return mode;
		}

		if (exports.size === 0) {
			const mode = new ExportMode("empty-star");

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
					checked.has(exportName)
				)
		);

		return mode;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {ExportsInfo} exportsInfo exports info about the current module (optional)
	 * @param {Module} importedModule the imported module (optional)
	 * @returns {{exports?: Set<string>, checked?: Set<string>, ignoredExports: Set<string>}} information
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

		const ignoredExports = new Set([
			"default",
			...this.activeExports,
			...this._discoverActiveExportsFromOtherStarExports(moduleGraph).keys()
		]);

		if (!noExtraExports && !noExtraImports) {
			return {
				ignoredExports
			};
		}

		/** @type {Set<string>} */
		const exports = new Set();
		/** @type {Set<string>} */
		const checked = new Set();

		if (noExtraImports) {
			for (const exportInfo of exportsInfo.orderedExports) {
				const name = exportInfo.name;
				if (ignoredExports.has(name)) continue;
				if (exportInfo.getUsed(runtime) === UsageState.Unused) continue;
				const importedExportInfo = importedExportsInfo.getReadOnlyExportInfo(
					name
				);
				if (importedExportInfo.provided === false) continue;
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
				exports.add(name);
				if (importedExportInfo.provided === true) continue;
				checked.add(name);
			}
		}

		return { ignoredExports, exports, checked };
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {function(ModuleGraphConnection, RuntimeSpec): boolean} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return (connection, runtime) => {
			const mode = this.getMode(moduleGraph, runtime);
			return mode.type !== "unused" && mode.type !== "empty-star";
		};
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
				for (const { ids, exportInfo } of mode.items) {
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
	 * @returns {Map<string, HarmonyExportImportedSpecifierDependency>} exported names and their origin dependency
	 */
	_discoverActiveExportsFromOtherStarExports(moduleGraph) {
		if (!this.otherStarExports) {
			return new Map();
		}

		const result = new Map();
		// try to learn impossible exports from other star exports with provided exports
		for (const otherStarExport of this.otherStarExports) {
			const otherImportedModule = moduleGraph.getModule(otherStarExport);
			if (otherImportedModule) {
				const exportsInfo = moduleGraph.getExportsInfo(otherImportedModule);
				for (const exportInfo of exportsInfo.exports) {
					if (exportInfo.provided === true && !result.has(exportInfo.name)) {
						result.set(exportInfo.name, otherStarExport);
					}
				}
			}
		}

		return result;
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
					excludeExports: mode.ignored,
					dependencies: [from.module]
				};
			}
			case "empty-star":
				return {
					exports: [],
					dependencies: [moduleGraph.getModule(this)]
				};
			case "normal-reexport": {
				const from = moduleGraph.getConnection(this);
				return {
					exports: Array.from(mode.items, item => ({
						name: item.name,
						from,
						export: item.ids
					})),
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
			const potentialConflicts = this._discoverActiveExportsFromOtherStarExports(
				moduleGraph
			);
			if (potentialConflicts.size > 0) {
				const importedModule = moduleGraph.getModule(this);
				if (importedModule) {
					const exportsInfo = moduleGraph.getExportsInfo(importedModule);
					const conflicts = new Map();
					for (const exportInfo of exportsInfo.orderedExports) {
						if (exportInfo.provided !== true) continue;
						if (exportInfo.name === "default") continue;
						if (this.activeExports.has(exportInfo.name)) continue;
						const conflictingDependency = potentialConflicts.get(
							exportInfo.name
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
						const conflictingTarget = conflictingExportInfo.getTerminalBinding(
							moduleGraph
						);
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

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		const { chunkGraph, runtime } = context;
		super.updateHash(hash, context);

		const mode = this.getMode(chunkGraph.moduleGraph, runtime);

		hash.update(mode.type);
		if (mode.items) {
			for (const item of mode.items) {
				hash.update(item.name);
				hash.update(item.ids.join());
				if (item.checked) hash.update("checked");
			}
		}
		if (mode.ignored) {
			hash.update("ignored");
			for (const k of mode.ignored) {
				hash.update(k);
			}
		}
		hash.update(mode.name || "");
	}

	serialize(context) {
		const { write } = context;

		write(this.ids);
		write(this.name);
		write(this.activeExports);
		write(this.otherStarExports);
		write(this.strictExportPresence);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.ids = read();
		this.name = read();
		this.activeExports = read();
		this.otherStarExports = read();
		this.strictExportPresence = read();

		super.deserialize(context);
	}
}

makeSerializable(
	HarmonyExportImportedSpecifierDependency,
	"webpack/lib/dependencies/HarmonyExportImportedSpecifierDependency"
);

module.exports = HarmonyExportImportedSpecifierDependency;

HarmonyExportImportedSpecifierDependency.Template = class HarmonyExportImportedSpecifierDependencyTemplate extends HarmonyImportDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { moduleGraph, runtime, concatenationScope } = templateContext;

		const dep = /** @type {HarmonyExportImportedSpecifierDependency} */ (dependency);

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
				for (const { name, ids, checked } of mode.items) {
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
				const ignored = mode.ignored;
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
						ignored.values().next().value
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
