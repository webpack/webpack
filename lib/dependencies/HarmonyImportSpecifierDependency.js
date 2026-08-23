/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const InitFragment = require("../InitFragment");
const Template = require("../Template");
const {
	InlinedUsedName,
	isExportInlined,
	isInlineEnabled,
	isInlineExportsEnabled
} = require("../optimize/InlineExports");
const {
	getDependencyUsedByExportsCondition
} = require("../optimize/InnerGraph");
const { getTrimmedIdsAndRange } = require("../util/chainedImports");
const makeSerializable = require("../util/makeSerializable");
const { propertyAccess } = require("../util/property");
const traverseDestructuringAssignmentProperties = require("../util/traverseDestructuringAssignmentProperties");
const HarmonyImportDependency = require("./HarmonyImportDependency");
const HarmonyImportGuard = require("./HarmonyImportGuard");
const { ImportPhaseUtils } = require("./ImportPhase");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import { GetConditionFn, ReferencedExports } from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import Module, { BuildMeta } from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/**
 * @import ModuleGraphConnection, {
 * 	ConnectionState
 * } from "../ModuleGraphConnection"
 */
/** @import WebpackError from "../errors/WebpackError" */
/**
 * @import {
 * 	DestructuringAssignmentProperties,
 * 	ImportAttributes,
 * 	Range
 * } from "../javascript/JavascriptParser"
 */
/** @import { UsedByExports } from "../optimize/InnerGraph" */
/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../serialization/ObjectMiddleware"
 */
/** @import { RuntimeSpec } from "../util/runtime" */
/** @import { IdRanges } from "../util/chainedImports" */
/** @import { ExportPresenceMode } from "./HarmonyImportDependency" */
/** @typedef {HarmonyImportDependency.Ids} Ids */
/** @import { ImportPhaseType } from "./ImportPhase" */
/** @import { DependencyGuard } from "./HarmonyImportGuard" */
/**
 * @import {
 * 	JavascriptModuleBuildMeta
 * } from "../javascript/JavascriptModule"
 */

const idsSymbol = /** @type {symbol} */ (
	Symbol("HarmonyImportSpecifierDependency.ids")
);

const { ExportPresenceModes } = HarmonyImportDependency;

/**
 * One condition closure per module graph and variant rather than per dependency.
 * The dependency the condition was built for is always the one on the connection
 * it is called with, since `ModuleGraph#setResolvedModule` is the only caller of
 * `getCondition` and pairs the two. Indexed by
 * `(usedByExports ? 1 : 0) | (inlineEnabled ? 2 : 0)`.
 * @type {WeakMap<ModuleGraph, (GetConditionFn | undefined)[]>}
 */
const conditionsByModuleGraph = new WeakMap();

class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
	// read by `HarmonyImportGuard` in place of `instanceof`, which would cycle
	get isHarmonyImportSpecifier() {
		return true;
	}

	/**
	 * Creates an instance of HarmonyImportSpecifierDependency.
	 * @param {string} request request
	 * @param {number} sourceOrder source order
	 * @param {Ids} ids ids
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {ExportPresenceMode} exportPresenceMode export presence mode
	 * @param {ImportPhaseType} phase import phase
	 * @param {ImportAttributes | undefined} attributes import attributes
	 * @param {IdRanges | undefined} idRanges ranges for members of ids; the two arrays are right-aligned
	 */
	constructor(
		request,
		sourceOrder,
		ids,
		name,
		range,
		exportPresenceMode,
		phase,
		attributes,
		idRanges // TODO webpack 6 make this non-optional. It must always be set to properly trim ids.
	) {
		super(request, sourceOrder, phase, attributes);
		/** @type {Ids} */
		this.ids = ids;
		/** @type {string} */
		this.name = name;
		this.range = range;
		/** @type {IdRanges | undefined} */
		this.idRanges = idRanges;
		/** @type {ExportPresenceMode} */
		this.exportPresenceMode = exportPresenceMode;
		/** @type {undefined | boolean} */
		this.namespaceObjectAsContext = false;
		/** @type {undefined | boolean} */
		this.call = undefined;
		/** @type {undefined | boolean} */
		this.directImport = undefined;
		/** @type {undefined | boolean | string} */
		this.shorthand = undefined;
		/** @type {undefined | boolean} */
		this.asiSafe = undefined;
		/** @type {UsedByExports | undefined} */
		this.usedByExports = undefined;
		/** @type {DestructuringAssignmentProperties | undefined} */
		this.referencedPropertiesInDestructuring = undefined;
		/** @type {DependencyGuard[] | undefined} */
		this.branchGuards = undefined;
	}

	// TODO webpack 6 remove
	/**
	 * Returns id.
	 * @deprecated
	 */
	get id() {
		throw new Error("id was renamed to ids and type changed to string[]");
	}

	// TODO webpack 6 remove
	/**
	 * Returns id.
	 * @deprecated
	 */
	getId() {
		throw new Error("id was renamed to ids and type changed to string[]");
	}

	// TODO webpack 6 remove
	/**
	 * Updates id.
	 * @deprecated
	 */
	setId() {
		throw new Error("id was renamed to ids and type changed to string[]");
	}

	get type() {
		return "harmony import specifier";
	}

	/**
	 * Returns the export name this dependency requests from its target module (lazy barrel optimization).
	 * @returns {string | true | null} export name, true for all exports, null for none
	 */
	getForwardId() {
		return this.ids.length > 0 ? this.ids[0] : true;
	}

	/**
	 * Returns the imported ids.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {Ids} the imported ids
	 */
	getIds(moduleGraph) {
		const meta = moduleGraph.getMetaIfExisting(this);
		if (meta === undefined) return this.ids;
		const ids = meta[idsSymbol];
		return ids !== undefined ? ids : this.ids;
	}

	/**
	 * Updates ids using the provided module graph.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {Ids} ids the imported ids
	 * @returns {void}
	 */
	setIds(moduleGraph, ids) {
		moduleGraph.getMeta(this)[idsSymbol] = ids;
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		const usedByExportsCondition = getDependencyUsedByExportsCondition(
			this,
			moduleGraph
		);
		if (usedByExportsCondition === false) return false;
		const inlineEnabled = isInlineExportsEnabled(moduleGraph);
		// Keep the connection unconditional (fast path) when nothing can deactivate it
		if (
			usedByExportsCondition === null &&
			this.branchGuards === undefined &&
			!inlineEnabled
		) {
			return null;
		}
		// Everything the condition still needs is either per module graph or on
		// the connection it is called with, so one closure per variant serves the
		// whole graph instead of one per dependency.
		const slot =
			(usedByExportsCondition === null ? 0 : 1) | (inlineEnabled ? 2 : 0);
		let variants = conditionsByModuleGraph.get(moduleGraph);
		if (variants === undefined) {
			variants = [undefined, undefined, undefined, undefined];
			conditionsByModuleGraph.set(moduleGraph, variants);
		}
		const cached = variants[slot];
		if (cached !== undefined) return cached;
		/** @type {GetConditionFn} */
		const condition = (connection, runtime) => {
			const dep = /** @type {HarmonyImportSpecifierDependency} */ (
				connection.dependency
			);
			if (usedByExportsCondition !== null) {
				const result = usedByExportsCondition(connection, runtime);
				if (result === false) return false;
			}
			// `isInlineEnabled` is the cheap module-level precondition of
			// `isExportInlined`; checking it here keeps the id lookup off the hot
			// path for the common target module that has no inlined exports
			if (inlineEnabled && isInlineEnabled(connection.module)) {
				const ids = dep.getIds(moduleGraph);
				if (
					ids.length > 0 &&
					isExportInlined(moduleGraph, connection.module, ids, runtime)
				) {
					return false;
				}
			}
			const guards = dep.branchGuards;
			if (
				guards !== undefined &&
				HarmonyImportGuard.isDeadByGuards(guards, moduleGraph, runtime)
			) {
				return false;
			}
			return true;
		};
		variants[slot] = condition;
		return condition;
	}

	/**
	 * Gets module evaluation side effects state.
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
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		let ids = this.getIds(moduleGraph);
		if (ids.length === 0) {
			const refs = this._getReferencedExportsInDestructuring();
			// The whole namespace object is used as a value (no destructuring): it
			// can be rendered as a decoupled namespace object, keeping the module's
			// exports mangleable. Deferred imports keep their special namespace.
			return refs === Dependency.EXPORTS_OBJECT_REFERENCED &&
				!ImportPhaseUtils.isDefer(this.phase)
				? Dependency.EXPORTS_OBJECT_REFERENCED_MANGLEABLE
				: refs;
		}
		let namespaceObjectAsContext = this.namespaceObjectAsContext;
		if (ids[0] === "default") {
			const selfModule =
				/** @type {Module} */
				(moduleGraph.getParentModule(this));
			const importedModule =
				/** @type {Module} */
				(moduleGraph.getModule(this));
			switch (
				importedModule.getExportsType(
					moduleGraph,
					/** @type {BuildMeta} */
					(selfModule.buildMeta).strictHarmonyModule
				)
			) {
				case "default-only":
				case "default-with-named":
					if (ids.length === 1) {
						return this._getReferencedExportsInDestructuring();
					}
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
	 * Get referenced exports in destructuring.
	 * @param {Ids=} ids ids
	 * @returns {ReferencedExports} referenced exports
	 */
	_getReferencedExportsInDestructuring(ids) {
		if (this.referencedPropertiesInDestructuring) {
			/** @type {ReferencedExports} */
			const refs = [];
			traverseDestructuringAssignmentProperties(
				this.referencedPropertiesInDestructuring,
				(stack) => {
					const idsInDestructuring = stack.map((p) => p.id);
					// Destructuring consumer can't accept an inlined literal
					refs.push({
						name: ids ? [...ids, ...idsInDestructuring] : idsInDestructuring,
						canInline: false
					});
				}
			);
			return refs;
		}
		return ids
			? [
					{
						name: ids,
						canMangle: true,
						// Need access the export value to trigger side effects for deferred module
						canInline: !ImportPhaseUtils.isDefer(this.phase)
					}
				]
			: Dependency.EXPORTS_OBJECT_REFERENCED;
	}

	/**
	 * Get effective export presence level.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportPresenceMode} effective mode
	 */
	_getEffectiveExportPresenceLevel(moduleGraph) {
		if (this.exportPresenceMode !== ExportPresenceModes.AUTO) {
			return this.exportPresenceMode;
		}
		const buildMeta =
			/** @type {JavascriptModuleBuildMeta} */
			(
				/** @type {Module} */
				(moduleGraph.getParentModule(this)).buildMeta
			);
		return buildMeta.strictHarmonyModule
			? ExportPresenceModes.ERROR
			: ExportPresenceModes.WARN;
	}

	/**
	 * Returns warnings.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		const exportsPresence = this._getEffectiveExportPresenceLevel(moduleGraph);
		if (exportsPresence === ExportPresenceModes.WARN) {
			return this._getErrors(moduleGraph);
		}
		return null;
	}

	/**
	 * Returns errors.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} errors
	 */
	getErrors(moduleGraph) {
		const exportsPresence = this._getEffectiveExportPresenceLevel(moduleGraph);
		if (exportsPresence === ExportPresenceModes.ERROR) {
			return this._getErrors(moduleGraph);
		}
		return null;
	}

	/**
	 * Returns errors.
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
	 * Serializes this instance into the provided serializer context.
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
		write(this.branchGuards);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
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
		this.branchGuards = read();
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
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyImportSpecifierDependency} */ (dependency);
		const { moduleGraph, runtime, initFragments } = templateContext;
		const connection = moduleGraph.getConnection(dep);
		const ids = dep.getIds(moduleGraph);

		if (
			connection &&
			!connection.isTargetActive(runtime) &&
			!isExportInlined(moduleGraph, connection.module, ids, runtime)
		) {
			initFragments.push(
				new InitFragment(
					`/* unused harmony import specifier */ var ${dep.name};\n`,
					InitFragment.STAGE_HARMONY_IMPORTS,
					0,
					`unused import specifier ${dep.name}`
				)
			);

			return;
		}

		const {
			trimmedRange: [trimmedRangeStart, trimmedRangeEnd],
			trimmedIds
		} = getTrimmedIdsAndRange(ids, dep.range, dep.idRanges, moduleGraph, dep);

		const exportExpr = this._getCodeForIds(
			dep,
			source,
			templateContext,
			trimmedIds,
			connection
		);
		if (dep.shorthand) {
			source.insert(trimmedRangeEnd, `: ${exportExpr}`);
		} else {
			source.replace(trimmedRangeStart, trimmedRangeEnd - 1, exportExpr);
		}

		if (dep.referencedPropertiesInDestructuring) {
			let prefixedIds = ids;

			if (ids[0] === "default") {
				const selfModule =
					/** @type {Module} */
					(moduleGraph.getParentModule(dep));
				const importedModule =
					/** @type {Module} */
					(moduleGraph.getModule(dep));
				const exportsType = importedModule.getExportsType(
					moduleGraph,
					/** @type {BuildMeta} */
					(selfModule.buildMeta).strictHarmonyModule
				);
				if (
					(exportsType === "default-only" ||
						exportsType === "default-with-named") &&
					ids.length >= 1
				) {
					prefixedIds = ids.slice(1);
				}
			}

			/** @type {{ ids: Ids, range: Range, shorthand: boolean | string }[]} */
			const replacementsInDestructuring = [];
			traverseDestructuringAssignmentProperties(
				dep.referencedPropertiesInDestructuring,
				undefined,
				(stack) => {
					const property = stack[stack.length - 1];
					replacementsInDestructuring.push({
						ids: stack.map((p) => p.id),
						range: property.range,
						shorthand: property.shorthand
					});
				}
			);
			// loop-invariant: resolve the imported module's exports info once
			const destructuredExportsInfo = moduleGraph.getExportsInfo(
				/** @type {Module} */ (moduleGraph.getModule(dep))
			);
			for (const { ids, shorthand, range } of replacementsInDestructuring) {
				/** @type {Ids} */
				const concatedIds = [...prefixedIds, ...ids];
				const used = destructuredExportsInfo.getUsedName(concatedIds, runtime);
				if (!used) {
					return;
				} else if (used instanceof InlinedUsedName) {
					throw new Error(
						`Should not inline for destructuring name ${concatedIds.join(".")}`
					);
				}
				// Destructuring can't consume an inlined literal — should be unreachable
				// because the consumer-side canInline=false suppresses inlining there.
				if (!Array.isArray(used)) continue;
				const newName = used[used.length - 1];
				const name = concatedIds[concatedIds.length - 1];
				if (newName === name) continue;

				const comment = `${Template.toNormalComment(name)} `;
				const key = comment + JSON.stringify(newName);
				source.replace(
					range[0],
					range[1] - 1,
					shorthand ? `${key}: ${name}` : `${key}`
				);
			}
		}
	}

	/**
	 * Returns generated code.
	 * @param {HarmonyImportSpecifierDependency} dep dependency
	 * @param {ReplaceSource} source source
	 * @param {DependencyTemplateContext} templateContext context
	 * @param {Ids} ids ids
	 * @param {ModuleGraphConnection | undefined} connection the resolved connection for dep
	 * @returns {string} generated code
	 */
	_getCodeForIds(dep, source, templateContext, ids, connection) {
		const { moduleGraph, module, runtime, concatenationScope } =
			templateContext;
		/** @type {string} */
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
						asiSafe: dep.asiSafe,
						deferredImport: ImportPhaseUtils.isDefer(dep.phase),
						// A bare namespace value that isn't destructured may escape, so
						// allow a decoupled namespace object that keeps the original names.
						// Deferred imports keep their special namespace object.
						mangleableNamespace:
							!dep.referencedPropertiesInDestructuring &&
							!ImportPhaseUtils.isDefer(dep.phase)
					}
				);
			} else if (dep.namespaceObjectAsContext && ids.length === 1) {
				exportExpr =
					concatenationScope.createModuleReference(connection.module, {
						asiSafe: dep.asiSafe,
						deferredImport: ImportPhaseUtils.isDefer(dep.phase)
					}) + propertyAccess(ids);
			} else {
				exportExpr = concatenationScope.createModuleReference(
					connection.module,
					{
						ids,
						call: dep.call,
						directImport: dep.directImport,
						asiSafe: dep.asiSafe,
						deferredImport: ImportPhaseUtils.isDefer(dep.phase)
					}
				);
			}
		} else {
			super.apply(dep, source, templateContext);

			const { runtimeTemplate, initFragments, runtimeRequirements } =
				templateContext;

			exportExpr = runtimeTemplate.exportFromImport({
				moduleGraph,
				module: /** @type {Module} */ (moduleGraph.getModule(dep)),
				chunkGraph: templateContext.chunkGraph,
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
				runtimeRequirements,
				dependency: dep,
				// A bare namespace value that isn't destructured may escape, so allow a
				// decoupled namespace object that keeps the original export names.
				// Deferred imports keep their special namespace object.
				mangleableNamespace:
					ids.length === 0 &&
					!dep.referencedPropertiesInDestructuring &&
					!ImportPhaseUtils.isDefer(dep.phase)
			});
		}
		return exportExpr;
	}
};

HarmonyImportSpecifierDependency.idsSymbol = idsSymbol;

module.exports = HarmonyImportSpecifierDependency;
