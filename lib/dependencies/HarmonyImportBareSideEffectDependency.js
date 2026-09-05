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

/**
 * Whether a module is emitted as a file of its own, asked of the module so a
 * plugin emitting the same way is treated alike. `buildInfo.filename` cannot
 * serve here: generation sets it long after a connection has to know whether
 * it is active.
 * @param {Module} module the module to look up
 * @returns {boolean} true when it emits a file
 */
const emitsOwnFile = (module) => module.getSourceTypes().has(ASSET_TYPE);

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
}

makeSerializable(
	HarmonyImportBareSideEffectDependency,
	"webpack/lib/dependencies/HarmonyImportBareSideEffectDependency"
);

HarmonyImportBareSideEffectDependency.Template =
	HarmonyImportSideEffectDependency.Template;

module.exports = HarmonyImportBareSideEffectDependency;
