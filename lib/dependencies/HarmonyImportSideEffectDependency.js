/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const InitFragment = require("../InitFragment");
const Module = require("../Module");
const { JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const makeSerializable = require("../util/makeSerializable");
const HarmonyImportDependency = require("./HarmonyImportDependency");
const { ImportPhaseUtils } = require("./ImportPhase");

const { ExportPresenceModes } = HarmonyImportDependency;

/** @import { ReplaceSource } from "webpack-sources" */
/** @import { GetConditionFn, LazyUntil } from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { ConnectionState } from "../ModuleGraphConnection" */
/** @import { ImportAttributes } from "../javascript/JavascriptParser" */
/** @import { ImportPhaseType } from "./ImportPhase" */
/** @import { Ids, ExportPresenceMode } from "./HarmonyImportDependency" */
/** @import { JavascriptModuleBuildMeta } from "../javascript/JavascriptModule" */
/** @import WebpackError from "../errors/WebpackError" */
/** @import { ObjectSerializerContext, ObjectDeserializerContext } from "../serialization/ObjectMiddleware" */

/**
 * Specifiers the module declares but never reads, with the presence level to
 * report them at. Allocated only for a module that has one, so the common
 * import pays a single empty slot.
 * @typedef {object} UnusedSpecifiers
 * @property {ExportPresenceMode} exportPresenceMode
 * @property {[Ids, string][]} specifiers
 */

class HarmonyImportSideEffectDependency extends HarmonyImportDependency {
	/**
	 * Creates an instance of HarmonyImportSideEffectDependency.
	 * @param {string} request the request string
	 * @param {number} sourceOrder source order
	 * @param {ImportPhaseType} phase import phase
	 * @param {ImportAttributes=} attributes import attributes
	 */
	constructor(request, sourceOrder, phase, attributes) {
		super(request, sourceOrder, phase, attributes);
		/** @type {UnusedSpecifiers | undefined} */
		this.unusedSpecifiers = undefined;
	}

	get type() {
		return "harmony side effect evaluation";
	}

	/**
	 * Returns warnings.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		if (
			this._getEffectiveExportPresenceLevel(moduleGraph) !==
			ExportPresenceModes.WARN
		) {
			return null;
		}
		return this._getUnusedSpecifierErrors(moduleGraph);
	}

	/**
	 * Get effective export presence level.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportPresenceMode} effective mode
	 */
	_getEffectiveExportPresenceLevel(moduleGraph) {
		if (this.unusedSpecifiers === undefined) return ExportPresenceModes.NONE;
		const mode = this.unusedSpecifiers.exportPresenceMode;
		if (mode !== ExportPresenceModes.AUTO) return mode;
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
	 * Returns errors.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} errors
	 */
	getErrors(moduleGraph) {
		if (
			this._getEffectiveExportPresenceLevel(moduleGraph) !==
			ExportPresenceModes.ERROR
		) {
			return null;
		}
		return this._getUnusedSpecifierErrors(moduleGraph);
	}

	/**
	 * Linking errors for specifiers the module declares but never references.
	 * The spec resolves every import entry, so a name that does not exist is a
	 * link error whether or not the binding is read.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | undefined} errors
	 */
	_getUnusedSpecifierErrors(moduleGraph) {
		// Both callers resolve the presence level first, which is NONE without
		// specifiers, so this only runs when there are some.
		const { specifiers } = /** @type {UnusedSpecifiers} */ (
			this.unusedSpecifiers
		);
		/** @type {WebpackError[] | undefined} */
		let errors;
		for (const [ids, name] of specifiers) {
			const linkingErrors = this.getLinkingErrors(
				moduleGraph,
				ids,
				`(imported as '${name}')`
			);
			if (linkingErrors) {
				if (errors === undefined) errors = linkingErrors;
				else errors.push(...linkingErrors);
			}
		}
		return errors;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.unusedSpecifiers);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.unusedSpecifiers = context.read();
		super.deserialize(context);
	}

	/**
	 * Returns the export name this dependency requests from its target module (lazy barrel optimization).
	 * @returns {string | true | null} export name, true for all exports, null for none
	 */
	getForwardId() {
		return null;
	}

	/**
	 * Returns how this dependency may be deferred when its parent module is side-effect-free (lazy barrel optimization).
	 * @returns {LazyUntil | null} lazy classification, null when it must be processed eagerly
	 */
	getLazyUntil() {
		return Dependency.LAZY_UNTIL_REQUEST;
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return (connection) => {
			const refModule = connection.resolvedModule;
			if (!refModule) return true;
			return refModule.getSideEffectsConnectionState(moduleGraph);
		};
	}

	/**
	 * Gets module evaluation side effects state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this dependency connects the module to referencing modules
	 */
	getModuleEvaluationSideEffectsState(moduleGraph) {
		const refModule = moduleGraph.getModule(this);
		if (!refModule) return true;
		return refModule.getSideEffectsConnectionState(moduleGraph);
	}
}

makeSerializable(
	HarmonyImportSideEffectDependency,
	"webpack/lib/dependencies/HarmonyImportSideEffectDependency"
);

HarmonyImportSideEffectDependency.Template = class HarmonyImportSideEffectDependencyTemplate extends (
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
		const { moduleGraph, concatenationScope, runtime, initFragments } =
			templateContext;

		const module = /** @type {Module} */ (moduleGraph.getModule(dependency));

		if (module && !Module.getSourceBasicTypes(module).has(JAVASCRIPT_TYPE)) {
			// no need to render import
			return;
		}

		if (concatenationScope && concatenationScope.isModuleInScope(module)) {
			if (concatenationScope.isModuleWrapped(module)) {
				const dep = /** @type {HarmonyImportSideEffectDependency} */ (
					dependency
				);
				if (ImportPhaseUtils.isDefer(dep.phase)) return;
				const connection = moduleGraph.getConnection(dep);
				if (!connection || !connection.isTargetActive(runtime)) return;
				// A hoisted body cannot be deferred, so its imports evaluate at their
				// own slots; calling from here would run them after everything hoisted
				// in between. Eagerness stops at one level: a module is generated
				// before its importers, so it never learns whether it is itself eager.
				if (concatenationScope.isWrapped()) {
					initFragments.push(
						new InitFragment(
							`${concatenationScope.createModuleReference(module, {
								moduleExportsAccess: true,
								asiSafe: true
							})};\n`,
							InitFragment.STAGE_HARMONY_IMPORTS,
							/** @type {number} */ (dep.sourceOrder),
							`cjs eager init ${module.identifier()}`
						)
					);
				} else {
					concatenationScope.registerEagerModule(module);
				}
			}
			return;
		}
		super.apply(dependency, source, templateContext);
	}
};

module.exports = HarmonyImportSideEffectDependency;
