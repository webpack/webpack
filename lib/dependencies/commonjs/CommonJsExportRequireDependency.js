/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../../graph/Dependency");
const { UsageState } = require("../../graph/ExportsInfo");
const Template = require("../../template/Template");
const { equals } = require("../../util/ArrayHelpers");
const makeSerializable = require("../../util/makeSerializable");
const { propertyAccess } = require("../../util/property");
const ModuleDependency = require("../core/ModuleDependency");
const processExportInfo = require("../helpers/processExportInfo");
const {
	ESM_MODULE_EXPORTS_NAME,
	getRequireEsmModuleExportsAccess,
	handleDependencyBase,
	isRequireEsmModuleExportsModule
} = require("./CommonJsDependencyHelpers");

/** @import { ReplaceSource } from "webpack-sources" */
/**
 * @import {
 * 	ExportsSpec,
 * 	GetConditionFn,
 * 	RawReferencedExports,
 * 	ReferencedExports,
 * 	TRANSITIVE,
 * 	ExportInfoName
 * } from "../../graph/Dependency"
 */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import ExportsInfo, { ExportInfo } from "../../graph/ExportsInfo" */
/** @import Module from "../../module/Module" */
/** @import ModuleGraph from "../../graph/ModuleGraph" */
/** @import ModuleGraphConnection from "../../graph/ModuleGraphConnection" */
/** @import { Range } from "../../javascript/JavascriptParser" */
/** @import { RuntimeSpec } from "../../util/runtime" */
/** @import CommonJsRequireDependency from "./CommonJsRequireDependency" */
/**
 * @import {
 * 	CommonJSDependencyBaseKeywords
 * } from "./CommonJsDependencyHelpers"
 */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[undefined | boolean, Range, Range | null, CommonJSDependencyBaseKeywords, ExportInfoName[], ExportInfoName[], boolean, boolean, number | null, Range | null, CommonJsRequireDependency | null]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[undefined | boolean, Range, Range | null, CommonJSDependencyBaseKeywords, ExportInfoName[], ExportInfoName[], boolean, boolean, number | null, Range | null, CommonJsRequireDependency | null]>} ObjectSerializerContext */

const idsSymbol = /** @type {symbol} */ (
	Symbol("CommonJsExportRequireDependency.ids")
);

const EMPTY_OBJECT = {};

/** @typedef {Set<string>} Exports */
/** @typedef {Set<string>} Checked */

class CommonJsExportRequireDependency extends ModuleDependency {
	/**
	 * Creates an instance of CommonJsExportRequireDependency.
	 * @param {Range} range range
	 * @param {Range | null} valueRange value range
	 * @param {CommonJSDependencyBaseKeywords} base base
	 * @param {ExportInfoName[]} names names
	 * @param {string} request request
	 * @param {ExportInfoName[]} ids ids
	 * @param {boolean} resultUsed true, when the result is used
	 */
	constructor(range, valueRange, base, names, request, ids, resultUsed) {
		super(request);
		this.range = range;
		this.valueRange = valueRange;
		/** @type {CommonJSDependencyBaseKeywords} */
		this.base = base;
		/** @type {string[]} */
		this.names = names;
		/** @type {string[]} */
		this.ids = ids;
		/** @type {boolean} */
		this.resultUsed = resultUsed;
		/** @type {undefined | boolean} */
		this.asiSafe = undefined;
		// true when the reexport is a lazy `{ get: () => require(...) }` accessor
		// (as produced by `Object.defineProperty`) rather than an eager value.
		/** @type {boolean} */
		this.getter = false;
		// start of the `Object.defineProperty` descriptor, kept verbatim but for its value
		/** @type {number | null} */
		this.descriptorStart = null;
		// the `const` binding of the same `require()` the value reads, and its dependency
		/** @type {Range | null} */
		this.bindingRange = null;
		/** @type {CommonJsRequireDependency | null} */
		this.bindingDependency = null;
	}

	get type() {
		return "cjs export require";
	}

	get category() {
		return "commonjs";
	}

	/**
	 * Could affect referencing module.
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		return Dependency.TRANSITIVE;
	}

	/**
	 * Returns true if this dependency can be concatenated
	 * @param {boolean} concatenateCommonJsModules whether optimization.concatenateModules.commonjs is enabled
	 * @returns {boolean} true if this dependency can be concatenated
	 */
	canConcatenate(concatenateCommonJsModules) {
		return concatenateCommonJsModules;
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		// Conservative: keep `module.exports = require(...)` (names empty) active even
		// when the parent is evaluation-only and the target is side-effect-free.
		if (this.resultUsed || this.names.length === 0) return null;
		const names = this.names;
		const getter = this.getter;
		return (connection, runtime) => {
			const parentModule = moduleGraph.getParentModule(this);
			if (!parentModule) return true;
			const used = moduleGraph
				.getExportsInfo(parentModule)
				.getUsedName(names, runtime);
			if (used !== false) return true;
			if (getter) return false;
			const refModule = connection.resolvedModule;
			if (!refModule) return true;
			return refModule.getSideEffectsConnectionState(moduleGraph);
		};
	}

	/**
	 * Returns the imported id.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ExportInfoName[]} the imported id
	 */
	getIds(moduleGraph) {
		return moduleGraph.getMeta(this)[idsSymbol] || this.ids;
	}

	/**
	 * Updates ids using the provided module graph.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {ExportInfoName[]} ids the imported ids
	 * @returns {void}
	 */
	setIds(moduleGraph, ids) {
		moduleGraph.getMeta(this)[idsSymbol] = ids;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		const ids = this.getIds(moduleGraph);
		const importedModule = moduleGraph.getModule(this);
		if (
			importedModule &&
			isRequireEsmModuleExportsModule(importedModule, moduleGraph)
		) {
			// `require(esm)` unwraps the "module.exports" named export; any
			// further property access lands on that value (which webpack does
			// not model), so only the "module.exports" export is observable.
			return [{ name: [ESM_MODULE_EXPORTS_NAME], canInline: false }];
		}
		const getFullResult = () => {
			if (ids.length === 0) {
				return Dependency.EXPORTS_OBJECT_REFERENCED;
			}
			return [
				{
					name: ids,
					canMangle: false,
					canInline: false
				}
			];
		};
		if (this.resultUsed) return getFullResult();
		/** @type {ExportsInfo | undefined} */
		let exportsInfo = moduleGraph.getExportsInfo(
			/** @type {Module} */ (moduleGraph.getParentModule(this))
		);
		for (const name of this.names) {
			const exportInfo =
				/** @type {InstanceType<ExportInfo>} */
				(exportsInfo.getReadOnlyExportInfo(name));
			const used = exportInfo.getUsed(runtime);
			if (used === UsageState.Unused) return Dependency.NO_EXPORTS_REFERENCED;
			if (used !== UsageState.OnlyPropertiesUsed) return getFullResult();
			exportsInfo = exportInfo.exportsInfo;
			if (!exportsInfo) return getFullResult();
		}
		if (exportsInfo.otherExportsInfo.getUsed(runtime) !== UsageState.Unused) {
			return getFullResult();
		}
		/** @type {RawReferencedExports} */
		const referencedExports = [];
		for (const exportInfo of exportsInfo.orderedExports) {
			processExportInfo(
				runtime,
				referencedExports,
				[...ids, exportInfo.name],
				exportInfo,
				false
			);
		}
		return referencedExports.map((name) => ({
			name,
			canMangle: false,
			canInline: false
		}));
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const importedModule = moduleGraph.getModule(this);
		const esmUnwrap =
			importedModule &&
			isRequireEsmModuleExportsModule(importedModule, moduleGraph);
		if (this.names.length === 1) {
			const ids = this.getIds(moduleGraph);
			const name = this.names[0];
			const from = moduleGraph.getConnection(this);
			if (!from) return;
			const exportChain = esmUnwrap
				? [ESM_MODULE_EXPORTS_NAME, ...ids]
				: ids.length === 0
					? null
					: ids;

			// `require()` of a namespace module returns an object carrying `__esModule`
			let namespaceMarker = false;
			if (
				!esmUnwrap &&
				ids.length === 0 &&
				importedModule &&
				importedModule.getExportsType(moduleGraph, false) === "namespace"
			) {
				const importedExportsInfo = moduleGraph.getExportsInfo(importedModule);
				namespaceMarker = !(
					importedExportsInfo.otherExportsInfo.provided === false &&
					importedExportsInfo.ownedExports[Symbol.iterator]().next().done
				);
			}
			return {
				exports: [
					{
						name,
						from,
						export: exportChain,
						exports: namespaceMarker ? ["__esModule"] : undefined,
						// we can't mangle names that are in an empty object
						// because one could access the prototype property
						// when export isn't set yet
						canMangle: !(name in EMPTY_OBJECT) && false
					}
				],
				dependencies: [from.module]
			};
		} else if (this.names.length > 0) {
			const name = this.names[0];
			return {
				exports: [
					{
						name,
						// we can't mangle names that are in an empty object
						// because one could access the prototype property
						// when export isn't set yet
						canMangle: !(name in EMPTY_OBJECT) && false
					}
				],
				dependencies: undefined
			};
		}
		const from = moduleGraph.getConnection(this);
		if (!from) return;
		if (esmUnwrap) {
			// In `module.exports = require("./esm")` of a module carrying a
			// `"module.exports"` export, this module's own exports become the
			// unwrapped value, whose properties cannot be enumerated statically.
			return {
				exports: true,
				canMangle: false,
				dependencies: [from.module]
			};
		}
		// WHY: the imported namespace ESM has not been flagged by
		// FlagDependencyExportsPlugin yet, so its `"module.exports"` unwrap
		// eligibility is still unknown. Star-reexporting now would add `__esModule`,
		// and names, that the monotonic merge cannot retract once the module turns
		// out to unwrap, making the result order-dependent across runtimes. Deferring
		// is safe: the `from.module` dependency re-queues this once its exports —
		// owned names, or a dynamic `other` — become known.
		if (
			importedModule &&
			importedModule.getExportsType(moduleGraph, false) === "namespace"
		) {
			const importedExportsInfo = moduleGraph.getExportsInfo(importedModule);
			if (
				importedExportsInfo.otherExportsInfo.provided === false &&
				importedExportsInfo.ownedExports[Symbol.iterator]().next().done
			) {
				return { exports: [], dependencies: [from.module] };
			}
		}
		const reexportInfo = this.getStarReexports(
			moduleGraph,
			undefined,
			from.module
		);
		const ids = this.getIds(moduleGraph);
		if (reexportInfo) {
			return {
				exports: Array.from(
					/** @type {Exports} */
					(reexportInfo.exports),
					(name) => ({
						name,
						from,
						export: [...ids, name],
						canMangle: !(name in EMPTY_OBJECT) && false
					})
				),
				dependencies: [from.module]
			};
		}
		return {
			exports: true,
			from: ids.length === 0 ? from : undefined,
			canMangle: false,
			dependencies: [from.module]
		};
	}

	/**
	 * Gets star reexports.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {Module} importedModule the imported module (optional)
	 * @returns {{ exports?: Exports, checked?: Checked } | undefined} information
	 */
	getStarReexports(
		moduleGraph,
		runtime,
		importedModule = /** @type {Module} */ (moduleGraph.getModule(this))
	) {
		/** @type {ExportsInfo | undefined} */
		let importedExportsInfo = moduleGraph.getExportsInfo(importedModule);
		const ids = this.getIds(moduleGraph);
		if (ids.length > 0) {
			importedExportsInfo = importedExportsInfo.getNestedExportsInfo(ids);
		}
		/** @type {ExportsInfo | undefined} */
		let exportsInfo = moduleGraph.getExportsInfo(
			/** @type {Module} */ (moduleGraph.getParentModule(this))
		);
		if (this.names.length > 0) {
			exportsInfo = exportsInfo.getNestedExportsInfo(this.names);
		}

		const noExtraExports =
			importedExportsInfo &&
			importedExportsInfo.otherExportsInfo.provided === false;
		const noExtraImports =
			exportsInfo &&
			exportsInfo.otherExportsInfo.getUsed(runtime) === UsageState.Unused;

		if (!noExtraExports && !noExtraImports) {
			return;
		}

		const isNamespaceImport =
			importedModule.getExportsType(moduleGraph, false) === "namespace";

		/** @type {Exports} */
		const exports = new Set();
		/** @type {Checked} */
		const checked = new Set();

		if (noExtraImports) {
			for (const exportInfo of /** @type {ExportsInfo} */ (exportsInfo)
				.orderedExports) {
				const name = exportInfo.name;
				if (exportInfo.getUsed(runtime) === UsageState.Unused) continue;
				if (name === "__esModule" && isNamespaceImport) {
					exports.add(name);
				} else if (importedExportsInfo) {
					const importedExportInfo =
						importedExportsInfo.getReadOnlyExportInfo(name);
					if (importedExportInfo.provided === false) continue;
					exports.add(name);
					if (importedExportInfo.provided === true) continue;
					checked.add(name);
				} else {
					exports.add(name);
					checked.add(name);
				}
			}
		} else if (noExtraExports) {
			for (const importedExportInfo of /** @type {ExportsInfo} */ (
				importedExportsInfo
			).orderedExports) {
				const name = importedExportInfo.name;
				if (importedExportInfo.provided === false) continue;
				if (exportsInfo) {
					const exportInfo = exportsInfo.getReadOnlyExportInfo(name);
					if (exportInfo.getUsed(runtime) === UsageState.Unused) continue;
				}
				exports.add(name);
				if (importedExportInfo.provided === true) continue;
				checked.add(name);
			}
			if (isNamespaceImport) {
				exports.add("__esModule");
				checked.delete("__esModule");
			}
		}

		return { exports, checked };
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.asiSafe)
			.write(this.range)
			.write(this.valueRange)
			.write(this.base)
			.write(this.names)
			.write(this.ids)
			.write(this.resultUsed)
			.write(this.getter)
			.write(this.descriptorStart)
			.write(this.bindingRange)
			.write(this.bindingDependency);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.asiSafe = context.read();
		const c1 = context.rest;
		this.range = c1.read();
		const c2 = c1.rest;
		this.valueRange = c2.read();
		const c3 = c2.rest;
		this.base = c3.read();
		const c4 = c3.rest;
		this.names = c4.read();
		const c5 = c4.rest;
		this.ids = c5.read();
		const c6 = c5.rest;
		this.resultUsed = c6.read();
		const c7 = c6.rest;
		this.getter = c7.read();
		const c8 = c7.rest;
		this.descriptorStart = c8.read();
		const c9 = c8.rest;
		this.bindingRange = c9.read();
		const c10 = c9.rest;
		this.bindingDependency = c10.read();
		super.deserialize(c10.rest);
	}
}

makeSerializable(CommonJsExportRequireDependency, [
	"webpack/lib/dependencies/commonjs/CommonJsExportRequireDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/CommonJsExportRequireDependency"
]);

/**
 * Reads the re-exported value off the `const` binding already holding the same exports.
 * Only when that binding renders the module, which it doesn't when its own require is inactive.
 * @param {CommonJsExportRequireDependency} dep the dependency
 * @param {Module | null} importedModule the re-exported module
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {RuntimeSpec} runtime the runtime
 * @returns {string | undefined} the access to append to the binding, undefined when it can't be read
 */
const getBindingAccess = (dep, importedModule, moduleGraph, runtime) => {
	if (!dep.bindingRange || !dep.bindingDependency || !importedModule) return;
	const connection = moduleGraph.getConnection(dep.bindingDependency);
	if (
		!connection ||
		connection.module !== importedModule ||
		!connection.isTargetActive(runtime)
	) {
		return;
	}
	const ids = dep.getIds(moduleGraph);
	if (ids.length === 0) return "";
	// the binding holds the unwrapped value, whose properties aren't tracked
	if (isRequireEsmModuleExportsModule(importedModule, moduleGraph)) return;
	const usedImported = /** @type {string | string[] | false} */ (
		moduleGraph.getExportsInfo(importedModule).getUsedName(ids, runtime)
	);
	if (!usedImported) return;
	return propertyAccess(/** @type {string[]} */ (usedImported));
};

/**
 * Replaces what follows the binding up to `end` (its member chain, a closing `})`).
 * @param {ReplaceSource} source the source
 * @param {Range} bindingRange range of the binding identifier
 * @param {number} end end of the replaced code
 * @param {string} content replacement
 */
const replaceAfterBinding = (source, bindingRange, end, content) => {
	if (end > bindingRange[1]) {
		source.replace(bindingRange[1], end - 1, content);
	} else if (content) {
		source.insert(bindingRange[1], content);
	}
};

CommonJsExportRequireDependency.Template = class CommonJsExportRequireDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{
			module,
			runtimeTemplate,
			chunkGraph,
			moduleGraph,
			runtimeRequirements,
			runtime,
			concatenationScope
		}
	) {
		const dep = /** @type {CommonJsExportRequireDependency} */ (dependency);
		// CJS exports are never inlined
		const used = /** @type {string | string[] | false} */ (
			moduleGraph.getExportsInfo(module).getUsedName(dep.names, runtime)
		);

		const connection = /** @type {ModuleGraphConnection | undefined} */ (
			moduleGraph.getConnection(dep)
		);
		// Inactive unused reexport: no module id; drop to a no-op.
		// Missing connection (e.g. IgnorePlugin) must keep the require so it throws.
		if (!used && connection && !connection.isTargetActive(runtime)) {
			source.replace(dep.range[0], dep.range[1] - 1, "/* unused reexport */ 0");
			return;
		}

		const [type, base] = handleDependencyBase(
			dep.base,
			module,
			runtimeRequirements
		);

		const importedModule = moduleGraph.getModule(dep);
		const bindingAccess = getBindingAccess(
			dep,
			importedModule,
			moduleGraph,
			runtime
		);
		if (bindingAccess !== undefined) {
			const bindingRange = /** @type {Range} */ (dep.bindingRange);
			if (!used) {
				source.replace(
					dep.range[0],
					bindingRange[0] - 1,
					"/* unused reexport */ "
				);
				replaceAfterBinding(source, bindingRange, dep.range[1], bindingAccess);
				return;
			}
			if (type === "expression") {
				source.replace(
					dep.range[0],
					bindingRange[0] - 1,
					`${base}${propertyAccess(/** @type {string[]} */ (used))} = `
				);
			} else {
				source.replace(
					dep.range[0],
					/** @type {number} */ (dep.descriptorStart) - 1,
					`Object.defineProperty(${base}${propertyAccess(
						/** @type {string[]} */ (used).slice(0, -1)
					)}, ${JSON.stringify(used[used.length - 1])}, `
				);
			}
			const valueEnd =
				type === "expression"
					? dep.range[1]
					: /** @type {Range} */ (dep.valueRange)[1];
			replaceAfterBinding(source, bindingRange, valueEnd, bindingAccess);
			return;
		}
		/** @type {string} */
		let requireExpr;
		if (
			concatenationScope &&
			importedModule &&
			concatenationScope.isModuleInScope(importedModule)
		) {
			// The alias reads the target's exports value, so it binds like `require()`
			// rather than an ESM import: no interop.
			const ids = dep.getIds(moduleGraph);
			const requestedIds = isRequireEsmModuleExportsModule(
				importedModule,
				moduleGraph
			)
				? [ESM_MODULE_EXPORTS_NAME, ...ids]
				: ids;
			requireExpr = concatenationScope.createModuleReference(importedModule, {
				ids: requestedIds.length > 0 ? requestedIds : undefined,
				// a used reexport keeps its assignment, so only an unused one is
				// left standing where the original statement began
				asiSafe: used ? true : dep.asiSafe,
				moduleExportsAccess: true
			});
		} else {
			requireExpr = runtimeTemplate.moduleExports({
				module: importedModule,
				chunkGraph,
				request: dep.request,
				weak: dep.weak,
				runtimeRequirements
			});
			if (importedModule) {
				const ids = dep.getIds(moduleGraph);
				const esmRequireAccess = getRequireEsmModuleExportsAccess(
					importedModule,
					moduleGraph,
					runtime
				);
				if (esmRequireAccess !== null) {
					requireExpr += `${esmRequireAccess}${propertyAccess(ids)}`;
				} else {
					// CJS exports are never inlined
					const usedImported = /** @type {string | string[] | false} */ (
						moduleGraph.getExportsInfo(importedModule).getUsedName(ids, runtime)
					);
					if (usedImported) {
						const comment = equals(usedImported, ids)
							? ""
							: `${Template.toNormalComment(propertyAccess(ids))} `;
						requireExpr += `${comment}${propertyAccess(/** @type {string[]} */ (usedImported))}`;
					}
				}
			}
		}

		switch (type) {
			case "expression":
				source.replace(
					dep.range[0],
					dep.range[1] - 1,
					used
						? `${base}${propertyAccess(/** @type {string[]} */ (used))} = ${requireExpr}`
						: `/* unused reexport */ ${requireExpr}`
				);
				return;
			case "Object.defineProperty": {
				// `Object.defineProperty(exports, "name", { value: require("...") })`
				// or the lazy getter form `{ get: () => require("...") }` used by
				// barrel files (e.g. webpack's own `lib/index.js`).
				const valueRange = /** @type {Range} */ (dep.valueRange);
				if (!used) {
					// Active unused eager reexport: keep side effects. Unused getters
					// are inactive and already replaced with `0` above.
					source.replace(
						dep.range[0],
						dep.range[1] - 1,
						`/* unused reexport */ ${requireExpr}`
					);
					return;
				}
				// Only the target and the value change, so the descriptor keeps its
				// attributes and the getter its own function.
				source.replace(
					dep.range[0],
					/** @type {number} */ (dep.descriptorStart) - 1,
					`Object.defineProperty(${base}${propertyAccess(
						/** @type {string[]} */ (used).slice(0, -1)
					)}, ${JSON.stringify(used[used.length - 1])}, `
				);
				source.replace(valueRange[0], valueRange[1] - 1, `(${requireExpr})`);
				return;
			}
			default:
				throw new Error("Unexpected type");
		}
	}
};

CommonJsExportRequireDependency.idsSymbol = idsSymbol;

module.exports = CommonJsExportRequireDependency;
