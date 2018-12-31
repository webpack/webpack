/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyLinkingError = require("../HarmonyLinkingError");
const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
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
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/createHash").Hash} Hash */

/** @typedef {"missing"|"unused"|"empty-star"|"reexport-non-harmony-default"|"reexport-named-default"|"reexport-namespace-object"|"reexport-non-harmony-default-strict"|"reexport-fake-namespace-object"|"rexport-non-harmony-undefined"|"safe-reexport"|"checked-reexport"|"dynamic-reexport"} ExportModeType */

/** @type {Map<string, string>} */
const EMPTY_MAP = new Map();

class ExportMode {
	/**
	 * @param {ExportModeType} type type of the mode
	 */
	constructor(type) {
		/** @type {ExportModeType} */
		this.type = type;
		/** @type {string|null} */
		this.name = null;
		/** @type {Map<string, string>} */
		this.map = EMPTY_MAP;
		/** @type {null | function(): Module} */
		this.getModule = null;
		/** @type {string|null} */
		this.userRequest = null;
	}
}

const EMPTY_STAR_MODE = new ExportMode("empty-star");

class HarmonyExportImportedSpecifierDependency extends HarmonyImportDependency {
	constructor(
		request,
		sourceOrder,
		id,
		name,
		activeExports,
		otherStarExports,
		strictExportPresence
	) {
		super(request, sourceOrder);

		this.id = id;
		this.name = name;
		this.activeExports = activeExports;
		this.otherStarExports = otherStarExports;
		this.strictExportPresence = strictExportPresence;
	}

	get type() {
		return "harmony export imported specifier";
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {boolean=} ignoreUnused ignore the fact that exports are unused
	 * @returns {ExportMode} the export mode
	 */
	getMode(moduleGraph, ignoreUnused) {
		const name = this.name;
		const id = this.id;
		const parentModule = moduleGraph.getParentModule(this);
		const used = parentModule.getUsedName(moduleGraph, name);
		const usedExports = moduleGraph.getUsedExports(parentModule);
		const importedModule = moduleGraph.getModule(this);

		if (!importedModule) {
			const mode = new ExportMode("missing");

			mode.userRequest = this.userRequest;

			return mode;
		}

		if (!ignoreUnused && (name ? !used : usedExports === false)) {
			const mode = new ExportMode("unused");

			mode.name = name || "*";

			return mode;
		}

		const strictHarmonyModule = parentModule.buildMeta.strictHarmonyModule;

		if (name && id === "default" && importedModule.buildMeta) {
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

		if (name) {
			let mode;

			if (id) {
				// export { name as name }
				if (isNotAHarmonyModule && strictHarmonyModule) {
					mode = new ExportMode("rexport-non-harmony-undefined");
					mode.name = name;
				} else {
					mode = new ExportMode("safe-reexport");
					mode.map = new Map([[name, id]]);
				}
			} else {
				// export { * as name }
				if (isNotAHarmonyModule && strictHarmonyModule) {
					mode = new ExportMode("reexport-fake-namespace-object");
					mode.name = name;
				} else {
					mode = new ExportMode("reexport-namespace-object");
					mode.name = name;
				}
			}

			mode.getModule = () => moduleGraph.getModule(this);

			return mode;
		}

		const activeFromOtherStarExports = this._discoverActiveExportsFromOtherStartExports(
			moduleGraph
		);

		const providedExports = moduleGraph.getProvidedExports(importedModule);

		// export *
		if (usedExports && usedExports !== true) {
			// reexport * with known used exports
			if (Array.isArray(providedExports)) {
				const map = new Map(
					Array.from(usedExports)
						.filter(id => {
							if (id === "default") return false;
							if (this.activeExports.has(id)) return false;
							if (activeFromOtherStarExports.has(id)) return false;
							if (!providedExports.includes(id)) return false;

							return true;
						})
						.map(item => {
							/** @type {[string, string]} */
							const tuple = [item, item];

							return tuple;
						})
				);

				if (map.size === 0) {
					return EMPTY_STAR_MODE;
				}

				const mode = new ExportMode("safe-reexport");

				mode.getModule = () => moduleGraph.getModule(this);
				mode.map = map;

				return mode;
			}

			const map = new Map(
				Array.from(usedExports)
					.filter(id => {
						if (id === "default") return false;
						if (this.activeExports.has(id)) return false;
						if (activeFromOtherStarExports.has(id)) return false;

						return true;
					})
					.map(item => {
						/** @type {[string, string]} */
						const tuple = [item, item];

						return tuple;
					})
			);

			if (map.size === 0) {
				return EMPTY_STAR_MODE;
			}

			const mode = new ExportMode("checked-reexport");

			mode.getModule = () => moduleGraph.getModule(this);
			mode.map = map;

			return mode;
		}

		if (Array.isArray(providedExports)) {
			const map = new Map(
				providedExports
					.filter(id => {
						if (id === "default") return false;
						if (this.activeExports.has(id)) return false;
						if (activeFromOtherStarExports.has(id)) return false;

						return true;
					})
					.map(item => {
						/** @type {[string, string]} */
						const tuple = [item, item];
						return tuple;
					})
			);

			if (map.size === 0) {
				return EMPTY_STAR_MODE;
			}

			const mode = new ExportMode("safe-reexport");

			mode.getModule = () => moduleGraph.getModule(this);
			mode.map = map;

			return mode;
		}

		const mode = new ExportMode("dynamic-reexport");

		mode.getModule = () => moduleGraph.getModule(this);

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
					["default"],
					false,
					this.sourceOrder
				);

			case "reexport-namespace-object":
			case "reexport-non-harmony-default-strict":
			case "reexport-fake-namespace-object":
			case "rexport-non-harmony-undefined":
				return new DependencyReference(
					mode.getModule,
					true,
					false,
					this.sourceOrder
				);

			case "safe-reexport":
			case "checked-reexport":
				return new DependencyReference(
					mode.getModule,
					Array.from(mode.map.values()),
					false,
					this.sourceOrder
				);

			case "dynamic-reexport":
				return new DependencyReference(
					mode.getModule,
					true,
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
	_discoverActiveExportsFromOtherStartExports(moduleGraph) {
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
		if (this.name) {
			return {
				exports: [this.name],
				dependencies: undefined
			};
		}

		const importedModule = moduleGraph.getModule(this);

		if (!importedModule) {
			// no imported module available
			return undefined;
		}

		const providedExports = moduleGraph.getProvidedExports(importedModule);

		if (Array.isArray(providedExports)) {
			return {
				exports: providedExports.filter(id => id !== "default"),
				dependencies: [importedModule]
			};
		}

		if (providedExports) {
			return {
				exports: true,
				dependencies: undefined
			};
		}

		return {
			exports: null,
			dependencies: [importedModule]
		};
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

		if (!importedModule.buildMeta || !importedModule.buildMeta.exportsType) {
			// It's not an harmony module
			if (
				moduleGraph.getParentModule(this).buildMeta.strictHarmonyModule &&
				this.id !== "default"
			) {
				// In strict harmony modules we only support the default export
				const exportName = this.id
					? `the named export '${this.id}'`
					: "the namespace object";

				return [
					new HarmonyLinkingError(
						`Can't reexport ${exportName} from non EcmaScript module (only default export is available)`
					)
				];
			}

			return;
		}

		if (!this.id) {
			return;
		}

		if (moduleGraph.isExportProvided(importedModule, this.id) !== false) {
			// It's provided or we are not sure
			return;
		}

		// We are sure that it's not provided
		const idIsNotNameMessage =
			this.id !== this.name ? ` (reexported as '${this.name}')` : "";
		const errorMessage = `"export '${
			this.id
		}'${idIsNotNameMessage} was not found in '${this.userRequest}'`;

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

		const moduleGraph = chunkGraph.moduleGraph;
		const importedModule = moduleGraph.getModule(this);

		if (importedModule) {
			const usedExports = moduleGraph.getUsedExports(importedModule);
			const providedExports = moduleGraph.getProvidedExports(importedModule);
			const stringifiedUsedExports = JSON.stringify(usedExports);
			const stringifiedProvidedExports = JSON.stringify(providedExports);

			hash.update(stringifiedUsedExports + stringifiedProvidedExports);
		}
	}

	serialize(context) {
		const { write } = context;

		write(this.id);
		write(this.name);
		write(this.activeExports);
		write(this.otherStarExports);
		write(this.strictExportPresence);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.id = read();
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

		if (this.isUsed(dep, templateContext)) {
			super.apply(dependency, source, templateContext);

			const exportFragment = this._getExportFragment(
				dep,
				templateContext.module,
				templateContext.moduleGraph,
				templateContext.runtimeRequirements
			);
			templateContext.initFragments.push(exportFragment);
		}
	}

	/**
	 * @param {HarmonyExportImportedSpecifierDependency} dep the dependency
	 * @param {DependencyTemplateContext} templateContext the template context
	 * @returns {Boolean} true, if (any) export is used
	 */
	isUsed(dep, { moduleGraph, module }) {
		if (dep.name) {
			return module.isExportUsed(moduleGraph, dep.name);
		} else {
			const importedModule = moduleGraph.getModule(dep);
			const activeFromOtherStarExports = dep._discoverActiveExportsFromOtherStartExports(
				moduleGraph
			);
			const usedExports = moduleGraph.getUsedExports(module);

			if (usedExports && usedExports !== true) {
				// we know which exports are used
				for (const id of usedExports) {
					if (id === "default") continue;
					if (dep.activeExports.has(id)) continue;
					if (moduleGraph.isExportProvided(importedModule, id) === false)
						continue;
					if (activeFromOtherStarExports.has(id)) continue;

					return true;
				}

				return false;
			} else if (usedExports && importedModule) {
				const providedExports = moduleGraph.getProvidedExports(importedModule);
				if (Array.isArray(providedExports)) {
					// not sure which exports are used, but we know which are provided
					const unused = providedExports.every(id => {
						if (id === "default") return true;
						if (dep.activeExports.has(id)) return true;
						if (activeFromOtherStarExports.has(id)) return true;

						return false;
					});

					return !unused;
				}
			}

			return true;
		}
	}

	/**
	 * @param {HarmonyExportImportedSpecifierDependency} dep dependency
	 * @param {Module} module the current module
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {Set<string>} runtimeRequirements runtime requirements
	 * @returns {InitFragment} the generated init fragment
	 */
	_getExportFragment(dep, module, moduleGraph, runtimeRequirements) {
		const mode = dep.getMode(moduleGraph, false);
		const importedModule = moduleGraph.getModule(dep);
		const importVar = dep.getImportVar(moduleGraph);

		switch (mode.type) {
			case "missing":
				return new InitFragment(
					"/* empty/unused harmony star reexport */\n",
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "unused":
				return new InitFragment(
					`${Template.toNormalComment(
						`unused harmony reexport ${mode.name}`
					)}\n`,
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "reexport-non-harmony-default":
				return new InitFragment(
					"/* harmony reexport (default from non-harmony) */ " +
						this.getReexportStatement(
							module,
							module.getUsedName(moduleGraph, mode.name),
							importVar,
							null,
							runtimeRequirements
						),
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "reexport-named-default":
				return new InitFragment(
					"/* harmony reexport (default from named exports) */ " +
						this.getReexportStatement(
							module,
							module.getUsedName(moduleGraph, mode.name),
							importVar,
							"",
							runtimeRequirements
						),
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "reexport-fake-namespace-object":
				return new InitFragment(
					"/* harmony reexport (fake namespace object from non-harmony) */ " +
						this.getReexportFakeNamespaceObjectStatement(
							module,
							module.getUsedName(moduleGraph, mode.name),
							importVar,
							runtimeRequirements
						),
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "rexport-non-harmony-undefined":
				return new InitFragment(
					"/* harmony reexport (non default export from non-harmony) */ " +
						this.getReexportStatement(
							module,
							module.getUsedName(moduleGraph, mode.name),
							"undefined",
							"",
							runtimeRequirements
						),
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "reexport-non-harmony-default-strict":
				return new InitFragment(
					"/* harmony reexport (default from non-harmony) */ " +
						this.getReexportStatement(
							module,
							module.getUsedName(moduleGraph, mode.name),
							importVar,
							"",
							runtimeRequirements
						),
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "reexport-namespace-object":
				return new InitFragment(
					"/* harmony reexport (module object) */ " +
						this.getReexportStatement(
							module,
							module.getUsedName(moduleGraph, mode.name),
							importVar,
							"",
							runtimeRequirements
						),
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "empty-star":
				return new InitFragment(
					"/* empty/unused harmony star reexport */",
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "safe-reexport":
				return new InitFragment(
					Array.from(mode.map.entries())
						.map(item => {
							return (
								"/* harmony reexport (safe) */ " +
								this.getReexportStatement(
									module,
									module.getUsedName(moduleGraph, item[0]),
									importVar,
									importedModule.getUsedName(moduleGraph, item[1]),
									runtimeRequirements
								)
							);
						})
						.join(""),
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				);

			case "checked-reexport":
				return new InitFragment(
					Array.from(mode.map.entries())
						.map(item => {
							return (
								"/* harmony reexport (checked) */ " +
								this.getConditionalReexportStatement(
									module,
									item[0],
									importVar,
									item[1],
									runtimeRequirements
								) +
								"\n"
							);
						})
						.join(""),
					InitFragment.STAGE_HARMONY_IMPORTS,
					dep.sourceOrder
				);

			case "dynamic-reexport": {
				const activeExports = new Set([
					...dep.activeExports,
					...dep._discoverActiveExportsFromOtherStartExports(moduleGraph)
				]);
				let content =
					"/* harmony reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in " +
					importVar +
					") ";

				// Filter out exports which are defined by other exports
				// and filter out default export because it cannot be reexported with *
				if (activeExports.size > 0) {
					content +=
						"if(" +
						JSON.stringify(Array.from(activeExports).concat("default")) +
						".indexOf(__WEBPACK_IMPORT_KEY__) < 0) ";
				} else {
					content += "if(__WEBPACK_IMPORT_KEY__ !== 'default') ";
				}

				runtimeRequirements.add(RuntimeGlobals.exports);
				runtimeRequirements.add(RuntimeGlobals.definePropertyGetter);

				const exportsName = module.exportsArgument;
				return new InitFragment(
					content +
						`(function(key) { ${
							RuntimeGlobals.definePropertyGetter
						}(${exportsName}, key, function() { return ${importVar}[key]; }) }(__WEBPACK_IMPORT_KEY__));\n`,
					InitFragment.STAGE_HARMONY_IMPORTS,
					dep.sourceOrder
				);
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
