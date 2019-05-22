/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyLinkingError = require("../HarmonyLinkingError");
const InitFragment = require("../InitFragment");
const { UsageState } = require("../ModuleGraph");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { intersect } = require("../util/SetHelpers");
const makeSerializable = require("../util/makeSerializable");
const DependencyReference = require("./DependencyReference");
const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraph").ExportsInfo} ExportsInfo */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/createHash").Hash} Hash */

/** @typedef {"missing"|"unused"|"empty-star"|"reexport-non-harmony-default"|"reexport-named-default"|"reexport-namespace-object"|"reexport-partial-namespace-object"|"reexport-non-harmony-default-strict"|"reexport-fake-namespace-object"|"reexport-non-harmony-undefined"|"normal-reexport"|"dynamic-reexport"} ExportModeType */

const idsSymbol = Symbol("HarmonyExportImportedSpecifierDependency.ids");

/** @type {Map<string, string[]>} */
const EMPTY_MAP = new Map();

/** @type {Set<string>} */
const EMPTY_SET = new Set();

class ExportMode {
	/**
	 * @param {ExportModeType} type type of the mode
	 */
	constructor(type) {
		/** @type {ExportModeType} */
		this.type = type;
		/** @type {string|null} */
		this.name = null;
		/** @type {Map<string, string[]>} */
		this.map = EMPTY_MAP;
		/** @type {ExportsInfo} */
		this.partialNamespaceExportsInfo = undefined;
		/** @type {Set<string>|null} */
		this.ignored = null;
		/** @type {Set<string>|null} */
		this.checked = null;
		/** @type {null | function(): Module} */
		this.getModule = null;
		/** @type {string|null} */
		this.userRequest = null;
	}
}

class HarmonyExportImportedSpecifierDependency extends HarmonyImportDependency {
	/**
	 * @param {string} request the request string
	 * @param {number} sourceOrder the order in the original source file
	 * @param {string[]} ids the requested export name of the imported module
	 * @param {string | null} name the export name of for this module
	 * @param {Set<string>} activeExports other named exports in the module
	 * @param {Iterable<Dependency>} otherStarExports other star exports in the module
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
	 * @param {boolean=} ignoreUnused ignore the fact that exports are unused
	 * @returns {ExportMode} the export mode
	 */
	getMode(moduleGraph, ignoreUnused) {
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
			!ignoreUnused &&
			(name
				? exportsInfo.isExportUsed(name) === UsageState.Unused
				: exportsInfo.isUsed() === false)
		) {
			const mode = new ExportMode("unused");

			mode.name = name || "*";

			return mode;
		}

		const strictHarmonyModule = parentModule.buildMeta.strictHarmonyModule;

		// Special handling for reexporting the default export
		// from non-harmony modules
		if (
			name &&
			ids.length > 0 &&
			ids[0] === "default" &&
			importedModule.buildMeta
		) {
			if (!importedModule.buildMeta.exportsType) {
				const mode = new ExportMode(
					strictHarmonyModule
						? "reexport-non-harmony-default-strict"
						: "reexport-non-harmony-default"
				);

				mode.name = name;
				mode.getModule = () => moduleGraph.getModule(this);

				return mode;
			} else if (importedModule.buildMeta.exportsType === "named") {
				const mode = new ExportMode("reexport-named-default");

				mode.name = name;
				mode.getModule = () => moduleGraph.getModule(this);

				return mode;
			}
		}

		const isNotAHarmonyModule =
			importedModule.buildMeta && !importedModule.buildMeta.exportsType;

		// reexporting with a fixed name
		if (name) {
			let mode;
			const exportInfo = exportsInfo.getReadOnlyExportInfo(name);

			if (ids.length > 0) {
				// export { name as name }
				if (isNotAHarmonyModule && strictHarmonyModule) {
					mode = new ExportMode("reexport-non-harmony-undefined");
					mode.name = name;
				} else {
					mode = new ExportMode("normal-reexport");
					mode.map = new Map([[name, ids]]);
					mode.checked = EMPTY_SET;
				}
			} else {
				// export { * as name }
				if (isNotAHarmonyModule && strictHarmonyModule) {
					mode = new ExportMode("reexport-fake-namespace-object");
					mode.name = name;
				} else if (
					exportInfo.used === UsageState.OnlyPropertiesUsed &&
					exportInfo.exportsInfo &&
					exportInfo.exportsInfo.otherExportsInfo.used === UsageState.Unused
				) {
					mode = new ExportMode("reexport-partial-namespace-object");
					mode.name = name;
					mode.partialNamespaceExportsInfo = exportInfo.exportsInfo;
				} else {
					mode = new ExportMode("reexport-namespace-object");
					mode.name = name;
				}
			}

			mode.getModule = () => moduleGraph.getModule(this);

			return mode;
		}

		// Star reexporting

		const importedExportsInfo = moduleGraph.getExportsInfo(importedModule);

		const noExtraExports =
			importedExportsInfo.otherExportsInfo.provided === false;
		const noExtraImports =
			exportsInfo.otherExportsInfo.used === UsageState.Unused;

		const ignoredExports = new Set([
			"default",
			...this.activeExports,
			...this._discoverActiveExportsFromOtherStarExports(moduleGraph)
		]);

		if (!noExtraExports && !noExtraImports) {
			// We have to few info about the modules
			// Delegate the logic to the runtime code

			const mode = new ExportMode("dynamic-reexport");
			mode.ignored = ignoredExports;

			mode.getModule = () => moduleGraph.getModule(this);

			return mode;
		}

		/** @type {Set<string>|false} */
		const exports = noExtraExports && new Set();
		/** @type {Set<string>|false} */
		const imports = noExtraImports && new Set();
		/** @type {Set<string>} */
		let checked;

		if (noExtraImports) {
			for (const exportInfo of exportsInfo.exports) {
				if (ignoredExports.has(exportInfo.name)) continue;
				if (exportInfo.used !== UsageState.Unused) {
					imports.add(exportInfo.name);
				}
			}
		}

		if (noExtraExports) {
			checked = new Set();
			for (const exportInfo of importedExportsInfo.exports) {
				if (ignoredExports.has(exportInfo.name)) continue;
				switch (exportInfo.provided) {
					case true:
						exports.add(exportInfo.name);
						break;
					case false:
						break;
					default: {
						const name = exportInfo.name;
						checked.add(name);
						exports.add(name);
						break;
					}
				}
			}
		} else {
			checked = imports;
		}

		const merged =
			exports && imports ? intersect([exports, imports]) : exports || imports;

		if (merged.size === 0) {
			const mode = new ExportMode("empty-star");

			mode.getModule = () => moduleGraph.getModule(this);

			return mode;
		}

		/** @type {Map<string, string[]>} */
		const map = new Map();
		for (const exportName of merged) {
			map.set(exportName, [exportName]);
		}

		const mode = new ExportMode("normal-reexport");

		mode.getModule = () => moduleGraph.getModule(this);
		mode.map = map;
		mode.checked = checked;

		return mode;
	}

	/**
	 * Returns the referenced module and export
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {DependencyReference} reference
	 */
	getReference(moduleGraph) {
		const mode = this.getMode(moduleGraph, false);

		switch (mode.type) {
			case "missing":
			case "unused":
			case "empty-star":
				return null;

			case "reexport-non-harmony-default":
			case "reexport-named-default":
				return new DependencyReference(
					mode.getModule,
					[["default"]],
					false,
					this.sourceOrder
				);

			case "reexport-partial-namespace-object": {
				/** @type {string[][]} */
				const importedNames = [];
				const processExportsInfo = (prefix, exportsInfo) => {
					for (const exportInfo of exportsInfo.orderedExports) {
						if (
							exportInfo.used === UsageState.OnlyPropertiesUsed &&
							exportInfo.exportsInfo &&
							exportInfo.exportsInfo.otherExportsInfo.used === UsageState.Unused
						) {
							processExportsInfo(
								prefix.concat(exportInfo.name),
								exportInfo.exportsInfo
							);
						} else if (exportInfo.used !== UsageState.Unused) {
							importedNames.push(prefix.concat(exportInfo.name));
						}
					}
				};
				processExportsInfo([], mode.partialNamespaceExportsInfo);
				return new DependencyReference(
					mode.getModule,
					importedNames,
					false,
					this.sourceOrder
				);
			}

			case "reexport-namespace-object":
			case "reexport-non-harmony-default-strict":
			case "reexport-fake-namespace-object":
			case "reexport-non-harmony-undefined":
				return new DependencyReference(
					mode.getModule,
					DependencyReference.NS_OBJECT_IMPORTED,
					false,
					this.sourceOrder
				);

			case "normal-reexport":
				return new DependencyReference(
					mode.getModule,
					Array.from(mode.map.values()),
					false,
					this.sourceOrder
				);

			case "dynamic-reexport":
				return new DependencyReference(
					mode.getModule,
					DependencyReference.NS_OBJECT_IMPORTED,
					false,
					this.sourceOrder
				);

			default:
				throw new Error(`Unknown mode ${mode.type}`);
		}
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {Set<string>} exported names
	 */
	_discoverActiveExportsFromOtherStarExports(moduleGraph) {
		if (!this.otherStarExports) {
			return new Set();
		}

		const result = new Set();
		// try to learn impossible exports from other star exports with provided exports
		for (const otherStarExport of this.otherStarExports) {
			const otherImportedModule = moduleGraph.getModule(otherStarExport);
			if (otherImportedModule) {
				const providedExports = moduleGraph.getProvidedExports(
					otherImportedModule
				);

				if (Array.isArray(providedExports)) {
					for (const exportName of providedExports) {
						result.add(exportName);
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
		const mode = this.getMode(moduleGraph, true);

		switch (mode.type) {
			case "missing":
				return undefined;
			case "dynamic-reexport":
				return {
					exports: true,
					// TODO: consider passing `ignored` from `dynamic-reexport`
					dependencies: [mode.getModule()]
				};
			case "empty-star":
				return {
					exports: [],
					dependencies: [mode.getModule()]
				};
			case "normal-reexport":
				return {
					exports: Array.from(mode.map.keys()).map(name => ({
						name,
						from: mode.getModule(),
						export: mode.map.get(name)
					})),
					dependencies: [mode.getModule()]
				};
			case "reexport-fake-namespace-object":
			case "reexport-non-harmony-default":
			case "reexport-non-harmony-default-strict":
			case "reexport-non-harmony-undefined":
			case "reexport-named-default":
				return {
					exports: [mode.name],
					dependencies: [mode.getModule()]
				};
			case "reexport-namespace-object":
			case "reexport-partial-namespace-object":
				return {
					exports: [
						{
							name: mode.name,
							from: mode.getModule(),
							export: null
						}
					],
					dependencies: [mode.getModule()]
				};
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

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | undefined} errors
	 */
	_getErrors(moduleGraph) {
		const importedModule = moduleGraph.getModule(this);

		if (!importedModule) {
			return;
		}

		const ids = this.getIds(moduleGraph);

		if (!importedModule.buildMeta || !importedModule.buildMeta.exportsType) {
			// It's not an harmony module
			if (
				moduleGraph.getParentModule(this).buildMeta.strictHarmonyModule &&
				(ids.length === 0 || ids[0] !== "default")
			) {
				// In strict harmony modules we only support the default export
				const exportName =
					ids.length > 0
						? `the named export ${ids.map(id => `'${id}'`).join(".")}`
						: "the namespace object";

				return [
					new HarmonyLinkingError(
						`Can't reexport ${exportName} from non EcmaScript module (only default export is available)`
					)
				];
			}

			return;
		}

		if (ids.length === 0) {
			return;
		}

		if (moduleGraph.isExportProvided(importedModule, ids) !== false) {
			// It's provided or we are not sure
			return;
		}

		// We are sure that it's not provided
		const idIsNotNameMessage =
			ids.join(".") !== this.name ? ` (reexported as '${this.name}')` : "";
		const errorMessage = `"export ${this.ids
			.map(id => `'${id}'`)
			.join(".")}${idIsNotNameMessage} was not found in '${this.userRequest}'`;

		return [new HarmonyLinkingError(errorMessage)];
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		super.updateHash(hash, chunkGraph);

		const mode = this.getMode(chunkGraph.moduleGraph);

		hash.update(mode.type);
		for (const [k, v] of mode.map) {
			hash.update(k);
			hash.update(v.join());
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
		const dep = /** @type {HarmonyExportImportedSpecifierDependency} */ (dependency);

		const mode = dep.getMode(templateContext.moduleGraph, false);

		if (mode.type !== "unused" && mode.type !== "empty-star") {
			super.apply(dependency, source, templateContext);

			this._addExportFragments(
				templateContext.initFragments,
				dep,
				mode,
				templateContext.module,
				templateContext.moduleGraph,
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
	 * @param {Set<string>} runtimeRequirements runtime requirements
	 * @returns {void}
	 */
	_addExportFragments(
		initFragments,
		dep,
		mode,
		module,
		moduleGraph,
		runtimeRequirements
	) {
		const importedModule = moduleGraph.getModule(dep);
		const importVar = dep.getImportVar(moduleGraph);

		const stage =
			module.buildMeta.exportsType === "async"
				? InitFragment.STAGE_ASYNC_HARMONY_EXPORTS
				: InitFragment.STAGE_HARMONY_EXPORTS;

		switch (mode.type) {
			case "missing":
				initFragments.push(
					new InitFragment(
						"/* empty/unused harmony star reexport */\n",
						stage,
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
						stage,
						1
					)
				);
				break;

			case "empty-star":
				initFragments.push(
					new InitFragment(
						"/* empty/unused harmony star reexport */\n",
						stage,
						1
					)
				);
				break;

			case "reexport-non-harmony-default":
				initFragments.push(
					new InitFragment(
						"/* harmony reexport (default from non-harmony) */ " +
							this.getReexportStatement(
								module,
								module.getUsedName(moduleGraph, mode.name),
								importVar,
								null,
								runtimeRequirements
							),
						stage,
						1
					)
				);
				break;

			case "reexport-named-default":
				initFragments.push(
					new InitFragment(
						"/* harmony reexport (default from named exports) */ " +
							this.getReexportStatement(
								module,
								module.getUsedName(moduleGraph, mode.name),
								importVar,
								"",
								runtimeRequirements
							),
						stage,
						1
					)
				);
				break;

			case "reexport-fake-namespace-object":
				initFragments.push(
					new InitFragment(
						"/* harmony reexport (fake namespace object from non-harmony) */ " +
							this.getReexportFakeNamespaceObjectStatement(
								module,
								module.getUsedName(moduleGraph, mode.name),
								importVar,
								runtimeRequirements
							),
						stage,
						1
					)
				);
				break;

			case "reexport-non-harmony-undefined":
				initFragments.push(
					new InitFragment(
						"/* harmony reexport (non default export from non-harmony) */ " +
							this.getReexportStatement(
								module,
								module.getUsedName(moduleGraph, mode.name),
								"undefined",
								"",
								runtimeRequirements
							),
						stage,
						1
					)
				);
				break;

			case "reexport-non-harmony-default-strict":
				initFragments.push(
					new InitFragment(
						"/* harmony reexport (default from non-harmony) */ " +
							this.getReexportStatement(
								module,
								module.getUsedName(moduleGraph, mode.name),
								importVar,
								"",
								runtimeRequirements
							),
						stage,
						1
					)
				);
				break;

			case "reexport-namespace-object":
			case "reexport-partial-namespace-object":
				initFragments.push(
					new InitFragment(
						"/* harmony reexport (module object) */ " +
							this.getReexportStatement(
								module,
								module.getUsedName(moduleGraph, mode.name),
								importVar,
								"",
								runtimeRequirements
							),
						stage,
						1
					)
				);
				break;

			case "normal-reexport":
				for (const [key, id] of mode.map) {
					if (mode.checked.has(key)) {
						initFragments.push(
							new InitFragment(
								"/* harmony reexport (checked) */ " +
									this.getConditionalReexportStatement(
										module,
										key,
										importVar,
										id,
										runtimeRequirements
									),
								InitFragment.STAGE_HARMONY_IMPORTS,
								dep.sourceOrder
							)
						);
					} else {
						initFragments.push(
							new InitFragment(
								"/* harmony reexport (safe) */ " +
									this.getReexportStatement(
										module,
										module.getUsedName(moduleGraph, key),
										importVar,
										importedModule.getUsedName(moduleGraph, id),
										runtimeRequirements
									),
								stage,
								1
							)
						);
					}
				}
				break;

			case "dynamic-reexport": {
				const ignored = mode.ignored;
				let content =
					"/* harmony reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in " +
					importVar +
					") ";

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

				runtimeRequirements.add(RuntimeGlobals.exports);
				runtimeRequirements.add(RuntimeGlobals.definePropertyGetter);

				const exportsName = module.exportsArgument;
				initFragments.push(
					new InitFragment(
						content +
							`${
								RuntimeGlobals.definePropertyGetter
							}(${exportsName}, __WEBPACK_IMPORT_KEY__, function(key) { return ${importVar}[key]; }.bind(0, __WEBPACK_IMPORT_KEY__));\n`,
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

	getReexportStatement(module, key, name, valueKey, runtimeRequirements) {
		const exportsName = module.exportsArgument;
		const returnValue = this.getReturnValue(name, valueKey);

		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetter);

		return `${
			RuntimeGlobals.definePropertyGetter
		}(${exportsName}, ${JSON.stringify(
			key
		)}, function() { return ${returnValue}; });\n`;
	}

	getReexportFakeNamespaceObjectStatement(
		module,
		key,
		name,
		runtimeRequirements
	) {
		const exportsName = module.exportsArgument;

		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetter);
		runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);

		return `${
			RuntimeGlobals.definePropertyGetter
		}(${exportsName}, ${JSON.stringify(key)}, function() { return ${
			RuntimeGlobals.createFakeNamespaceObject
		}(${name}); });\n`;
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
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetter);

		return `if(Object.prototype.hasOwnProperty.call(${name}, ${JSON.stringify(
			valueKey
		)})) ${
			RuntimeGlobals.definePropertyGetter
		}(${exportsName}, ${JSON.stringify(
			key
		)}, function() { return ${returnValue}; });\n`;
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

		return `${name}[${JSON.stringify(valueKey)}]`;
	}
};
