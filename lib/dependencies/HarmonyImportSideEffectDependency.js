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

/** @import { ReplaceSource } from "webpack-sources" */
/** @import { GetConditionFn, LazyUntil } from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { ConnectionState } from "../ModuleGraphConnection" */
/** @import { ImportAttributes } from "../javascript/JavascriptParser" */
/** @import { ImportPhaseType } from "./ImportPhase" */

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
	}

	get type() {
		return "harmony side effect evaluation";
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
