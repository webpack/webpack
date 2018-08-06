/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyLinkingError = require("../HarmonyLinkingError");
const InitFragment = require("../InitFragment");
const Template = require("../Template");
const DependencyReference = require("./DependencyReference");
const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
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

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} importedModule the imported module
 * @returns {string} content
 */
const getHashValue = (moduleGraph, importedModule) => {
	if (!importedModule) {
		return "";
	}

	const used = importedModule.getUsed(moduleGraph);
	const stringifiedUsed = JSON.stringify(used);
	const usedExports = importedModule.getUsedExports(moduleGraph);
	const stringifiedUsedExports = JSON.stringify(usedExports);
	const stringifiedProvidedExports = JSON.stringify(
		importedModule.buildMeta.providedExports
	);
	return stringifiedUsed + stringifiedUsedExports + stringifiedProvidedExports;
};

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
		originModule,
		sourceOrder,
		parserScope,
		id,
		name,
		activeExports,
		otherStarExports,
		strictExportPresence
	) {
		super(request, originModule, sourceOrder, parserScope);
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
		const used = this.originModule.isUsed(moduleGraph, name);
		const usedExports = this.originModule.getUsedExports(moduleGraph);
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

		const strictHarmonyModule = this.originModule.buildMeta.strictHarmonyModule;
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

		// export *
		if (usedExports && usedExports !== true) {
			// reexport * with known used exports
			const providedExports = importedModule.buildMeta.providedExports;
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

		if (Array.isArray(importedModule.buildMeta.providedExports)) {
			const map = new Map(
				importedModule.buildMeta.providedExports
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
		if (!this.otherStarExports) return new Set();
		const result = new Set();
		// try to learn impossible exports from other star exports with provided exports
		for (const otherStarExport of this.otherStarExports) {
			const otherImportedModule = moduleGraph.getModule(otherStarExport);
			if (
				otherImportedModule &&
				Array.isArray(otherImportedModule.buildMeta.providedExports)
			) {
				for (const exportName of otherImportedModule.buildMeta
					.providedExports) {
					result.add(exportName);
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

		if (Array.isArray(importedModule.buildMeta.providedExports)) {
			return {
				exports: importedModule.buildMeta.providedExports.filter(
					id => id !== "default"
				),
				dependencies: [importedModule]
			};
		}

		if (importedModule.buildMeta.providedExports) {
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
			this.originModule.buildMeta.strictHarmonyModule
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
			this.originModule.buildMeta.strictHarmonyModule
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
				this.originModule.buildMeta.strictHarmonyModule &&
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

		if (importedModule.isProvided(this.id) !== false) {
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
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {void}
	 */
	updateHash(hash, moduleGraph) {
		super.updateHash(hash, moduleGraph);
		const hashValue = getHashValue(moduleGraph, moduleGraph.getModule(this));
		hash.update(hashValue);
	}
}

module.exports = HarmonyExportImportedSpecifierDependency;

HarmonyExportImportedSpecifierDependency.Template = class HarmonyExportImportedSpecifierDependencyTemplate extends HarmonyImportDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {DependencyTemplateContext} templateContext the template context
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, templateContext) {
		const dep = /** @type {HarmonyExportImportedSpecifierDependency} */ (dependency);
		if (this.isUsed(dep, templateContext)) {
			const importFragments = super.getInitFragments(dep, templateContext);
			const exportFragment = new InitFragment(
				this.getContent(dep, templateContext.moduleGraph),
				InitFragment.STAGE_HARMONY_IMPORTS,
				dep.sourceOrder
			);
			return importFragments
				? importFragments.concat(exportFragment)
				: [exportFragment];
		} else {
			return null;
		}
	}

	/**
	 * @param {HarmonyExportImportedSpecifierDependency} dep the dependency
	 * @param {DependencyTemplateContext} templateContext the template context
	 * @returns {Boolean} true, if (any) export is used
	 */
	isUsed(dep, templateContext) {
		const moduleGraph = templateContext.moduleGraph;
		if (dep.name) {
			return !!dep.originModule.isUsed(moduleGraph, dep.name);
		} else {
			const importedModule = templateContext.moduleGraph.getModule(dep);
			const activeFromOtherStarExports = dep._discoverActiveExportsFromOtherStartExports(
				templateContext.moduleGraph
			);
			const usedExports = dep.originModule.getUsedExports(moduleGraph);

			if (usedExports && usedExports !== true) {
				// we know which exports are used
				for (const id of usedExports) {
					if (id === "default") continue;
					if (dep.activeExports.has(id)) continue;
					if (importedModule.isProvided(id) === false) continue;
					if (activeFromOtherStarExports.has(id)) continue;
					return true;
				}
				return false;
			} else if (
				usedExports &&
				importedModule &&
				Array.isArray(importedModule.buildMeta.providedExports)
			) {
				// not sure which exports are used, but we know which are provided
				const unused = importedModule.buildMeta.providedExports.every(id => {
					if (id === "default") return true;
					if (dep.activeExports.has(id)) return true;
					if (activeFromOtherStarExports.has(id)) return true;
					return false;
				});
				return !unused;
			}
			return true;
		}
	}

	/**
	 * @param {HarmonyExportImportedSpecifierDependency} dep dependency
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {string} the generated code
	 */
	getContent(dep, moduleGraph) {
		const mode = dep.getMode(moduleGraph, false);
		const module = dep.originModule;
		const importedModule = moduleGraph.getModule(dep);
		const importVar = dep.getImportVar(moduleGraph);

		switch (mode.type) {
			case "missing":
				return `throw new Error(${JSON.stringify(
					`Cannot find module '${mode.userRequest}'`
				)});\n`;

			case "unused":
				return `${Template.toNormalComment(
					`unused harmony reexport ${mode.name}`
				)}\n`;

			case "reexport-non-harmony-default":
				return (
					"/* harmony reexport (default from non-harmony) */ " +
					this.getReexportStatement(
						module,
						module.isUsed(moduleGraph, mode.name),
						importVar,
						null
					)
				);

			case "reexport-named-default":
				return (
					"/* harmony reexport (default from named exports) */ " +
					this.getReexportStatement(
						module,
						module.isUsed(moduleGraph, mode.name),
						importVar,
						""
					)
				);

			case "reexport-fake-namespace-object":
				return (
					"/* harmony reexport (fake namespace object from non-harmony) */ " +
					this.getReexportFakeNamespaceObjectStatement(
						module,
						module.isUsed(moduleGraph, mode.name),
						importVar
					)
				);

			case "rexport-non-harmony-undefined":
				return (
					"/* harmony reexport (non default export from non-harmony) */ " +
					this.getReexportStatement(
						module,
						module.isUsed(moduleGraph, mode.name),
						"undefined",
						""
					)
				);

			case "reexport-non-harmony-default-strict":
				return (
					"/* harmony reexport (default from non-harmony) */ " +
					this.getReexportStatement(
						module,
						module.isUsed(moduleGraph, mode.name),
						importVar,
						""
					)
				);

			case "reexport-namespace-object":
				return (
					"/* harmony reexport (module object) */ " +
					this.getReexportStatement(
						module,
						module.isUsed(moduleGraph, mode.name),
						importVar,
						""
					)
				);

			case "empty-star":
				return "/* empty/unused harmony star reexport */";

			case "safe-reexport":
				return Array.from(mode.map.entries())
					.map(item => {
						return (
							"/* harmony reexport (safe) */ " +
							this.getReexportStatement(
								module,
								module.isUsed(moduleGraph, item[0]),
								importVar,
								importedModule.isUsed(moduleGraph, item[1])
							)
						);
					})
					.join("");

			case "checked-reexport":
				return Array.from(mode.map.entries())
					.map(item => {
						return (
							"/* harmony reexport (checked) */ " +
							this.getConditionalReexportStatement(
								module,
								item[0],
								importVar,
								item[1]
							) +
							"\n"
						);
					})
					.join("");

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
				const exportsName = dep.originModule.exportsArgument;
				return (
					content +
					`(function(key) { __webpack_require__.d(${exportsName}, key, function() { return ${importVar}[key]; }) }(__WEBPACK_IMPORT_KEY__));\n`
				);
			}

			default:
				throw new Error(`Unknown mode ${mode.type}`);
		}
	}

	getReexportStatement(module, key, name, valueKey) {
		const exportsName = module.exportsArgument;
		const returnValue = this.getReturnValue(name, valueKey);
		return `__webpack_require__.d(${exportsName}, ${JSON.stringify(
			key
		)}, function() { return ${returnValue}; });\n`;
	}

	getReexportFakeNamespaceObjectStatement(module, key, name) {
		const exportsName = module.exportsArgument;
		return `__webpack_require__.d(${exportsName}, ${JSON.stringify(
			key
		)}, function() { return __webpack_require__.t(${name}); });\n`;
	}

	getConditionalReexportStatement(module, key, name, valueKey) {
		if (valueKey === false) {
			return "/* unused export */\n";
		}
		const exportsName = module.exportsArgument;
		const returnValue = this.getReturnValue(name, valueKey);
		return `if(__webpack_require__.o(${name}, ${JSON.stringify(
			valueKey
		)})) __webpack_require__.d(${exportsName}, ${JSON.stringify(
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
