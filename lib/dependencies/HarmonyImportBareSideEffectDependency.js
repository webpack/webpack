/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { ASSET_TYPE } = require("../ModuleSourceTypeConstants");
const makeSerializable = require("../util/makeSerializable");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");

/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { GetConditionFn } from "../Dependency" */
/** @import { ConnectionState } from "../ModuleGraphConnection" */
/** @import { AssetModuleBuildInfo } from "../asset/AssetModule" */

/**
 * Whether a module is emitted as a file of its own, which a bare import is
 * written to obtain. Asked of the module, so a plugin emitting the same way is
 * treated the same; `buildInfo.filename` cannot serve, as generation sets it
 * long after a connection has to know whether it is active.
 * @param {Module} module the module to look up
 * @returns {boolean} true when it emits a file
 */
const emitsOwnFile = (module) => {
	if (!module.getSourceTypes().has(ASSET_TYPE)) return false;

	// An inlined one is a data url in the importer, so there is no file to keep.
	const buildInfo = /** @type {AssetModuleBuildInfo} */ (module.buildInfo);

	return buildInfo === undefined || !buildInfo.dataUrl;
};

/**
 * An `import "..."` that declares no binding. It is a separate class rather
 * than a flag so it costs nothing per instance, and the bound form — much the
 * more common one — keeps the base class and its inline caches untouched.
 */
class HarmonyImportBareSideEffectDependency extends HarmonyImportSideEffectDependency {
	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return (connection) => {
			const refModule = connection.resolvedModule;

			if (!refModule) return true;
			// Nothing reads the module, so emitting its file is the only thing the
			// import can have been written for.
			if (emitsOwnFile(refModule)) return true;

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
		if (emitsOwnFile(refModule)) return true;

		return refModule.getSideEffectsConnectionState(moduleGraph);
	}
}

makeSerializable(
	HarmonyImportBareSideEffectDependency,
	"webpack/lib/dependencies/HarmonyImportBareSideEffectDependency"
);

HarmonyImportBareSideEffectDependency.Template =
	HarmonyImportSideEffectDependency.Template;

module.exports = HarmonyImportBareSideEffectDependency;
