/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Dependency from "../Dependency.js";
import { JAVASCRIPT_TYPE } from "../ModuleSourceTypeConstants.js";
import makeSerializable from "../util/makeSerializable.js";
import HarmonyImportDependency from "./HarmonyImportDependency.js";
/** @typedef {import("../Module.js").default} Module */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency.js").GetConditionFn} GetConditionFn */
/** @typedef {import("../Dependency.js").LazyUntil} LazyUntil */
/** @typedef {import("../DependencyTemplate.js").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection.js").ConnectionState} ConnectionState */
/** @typedef {import("../javascript/JavascriptParser.js").ImportAttributes} ImportAttributes */
/** @typedef {import("./ImportPhase.js").ImportPhaseType} ImportPhaseType */

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
		const { moduleGraph, concatenationScope } = templateContext;

		const module = /** @type {Module} */ (moduleGraph.getModule(dependency));

		if (module && !module.getSourceBasicTypes().has(JAVASCRIPT_TYPE)) {
			// no need to render import
			return;
		}

		if (concatenationScope && concatenationScope.isModuleInScope(module)) {
			return;
		}
		super.apply(dependency, source, templateContext);
	}
};

export default HarmonyImportSideEffectDependency;

export { HarmonyImportSideEffectDependency as "module.exports" };
