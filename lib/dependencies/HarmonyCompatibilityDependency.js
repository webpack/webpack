/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { UsageState } = require("../ExportsInfo");
const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");
const isGeneratorLowered = require("../async-modules/isGeneratorLowered");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const NullDependency = require("./NullDependency");

// Required here rather than at the top: the plugin reaches back into the dependencies.
const getJavascriptModulesPlugin = memoize(() =>
	require("../javascript/JavascriptModulesPlugin")
);
// Same reason: the deferred-namespace runtime imports dependencies from here.
const getDeferredCycleHelpers = memoize(() =>
	require("../runtime/MakeDeferredNamespaceObjectRuntime")
);

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import { BuildMeta } from "../Module" */
/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import ChunkGraph, { ModuleId } from "../ChunkGraph" */
/**
 * @import {
 * 	JavascriptModuleBuildInfo
 * } from "../javascript/JavascriptModule"
 */

class HarmonyCompatibilityDependency extends NullDependency {
	get type() {
		return "harmony export header";
	}
}

makeSerializable(
	HarmonyCompatibilityDependency,
	"webpack/lib/dependencies/HarmonyCompatibilityDependency"
);

/**
 * Key shared by the async modules of one strongly-connected component. The spec
 * records one `[[EvaluationError]]` per component, so a member that already
 * fulfilled still has to report the root's error afterwards.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Module} module the async module
 * @returns {ModuleId | null} the group key, or null when it is not in an async cycle
 */
const getAsyncCycleGroupId = (moduleGraph, chunkGraph, module) => {
	const { getDeferredCycleModules } = getDeferredCycleHelpers();
	const peers = getDeferredCycleModules(moduleGraph, module);
	if (peers === null) return null;
	// The component's smallest async member id names the group, so every member
	// emits the same key and none has to carry the whole peer list.
	let groupId = null;
	let asyncPeerCount = 0;
	for (const peer of peers) {
		if (!moduleGraph.isAsync(peer)) continue;
		asyncPeerCount++;
		const id = chunkGraph.getModuleId(peer);
		if (id !== null && (groupId === null || `${id}` < `${groupId}`)) {
			groupId = id;
		}
	}
	if (asyncPeerCount === 0) return null;
	const ownId = chunkGraph.getModuleId(module);
	if (ownId !== null && (groupId === null || `${ownId}` < `${groupId}`)) {
		groupId = ownId;
	}
	return groupId;
};

HarmonyCompatibilityDependency.Template = class HarmonyExportDependencyTemplate extends (
	NullDependency.Template
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
			moduleGraph,
			chunkGraph,
			initFragments,
			runtimeRequirements,
			runtime,
			concatenationScope
		}
	) {
		// a wrapped module has a real exports object that still needs `__esModule`
		if (concatenationScope && !concatenationScope.isWrapped()) return;
		const exportsInfo = moduleGraph.getExportsInfo(module);
		if (
			exportsInfo.getReadOnlyExportInfo("__esModule").getUsed(runtime) !==
			UsageState.Unused
		) {
			const content = runtimeTemplate.defineEsModuleFlagStatement({
				exportsArgument: module.exportsArgument,
				runtimeRequirements
			});
			// A library exporting the same bindings natively never reads the marker back
			// off the exports object, so it takes the call over and emits it where wrapped.
			const hooks = getJavascriptModulesPlugin().getCompilationHooks(
				runtimeTemplate.compilation
			);
			const takenOver =
				hooks.onDemandExportsGeneration.isUsed() &&
				hooks.onDemandExportsGeneration.call(
					module,
					runtime,
					content,
					false
				) === true;
			if (!takenOver) {
				initFragments.push(
					new InitFragment(
						content,
						InitFragment.STAGE_HARMONY_EXPORTS,
						0,
						"harmony compatibility"
					)
				);
			}
		}
		if (moduleGraph.isAsync(module)) {
			runtimeRequirements.add(RuntimeGlobals.module);
			// Only `strictModuleErrorHandling` keeps a recorded error for later
			// requires, so the component's peers are worth naming only then.
			const cycleGroupId = runtimeTemplate.outputOptions
				.strictModuleErrorHandling
				? getAsyncCycleGroupId(moduleGraph, chunkGraph, module)
				: null;
			const isAsyncBody = /** @type {BuildMeta} */ (module.buildMeta).async;
			const hasAwait =
				cycleGroupId === null
					? isAsyncBody
						? ", 1"
						: ""
					: `, ${isAsyncBody ? 1 : 0}, ${JSON.stringify(cycleGroupId)}`;
			// A module-scope `await using` is disposed when its scope ends, so the body
			// needs a block that closes before the module reports completion —
			// otherwise dependents run before disposal is awaited.
			const usesTopLevelUsingDeclaration =
				/** @type {JavascriptModuleBuildInfo} */
				(module.buildInfo).usesTopLevelUsingDeclaration;
			const blockStart = usesTopLevelUsingDeclaration ? " {" : "";
			const blockEnd = usesTopLevelUsingDeclaration ? "\n}" : "";
			// Target has no `async`/`await` but has generators: drive the body as a
			// generator so `await` becomes `yield`, keeping the module in a single
			// scope (unlike a `.then` callback) without transpiling to a state machine.
			if (isGeneratorLowered(module, moduleGraph, runtimeTemplate)) {
				runtimeRequirements.add(RuntimeGlobals.asyncModuleGenerator);
				initFragments.push(
					new InitFragment(
						`${RuntimeGlobals.asyncModule}(${module.moduleArgument}, ${RuntimeGlobals.asyncModuleGenerator}(function* (__webpack_handle_async_dependencies__, __webpack_async_result__) { try {${blockStart}\n`,
						InitFragment.STAGE_ASYNC_BOUNDARY,
						0,
						undefined,
						`${blockEnd}\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } })${hasAwait});`
					)
				);
			} else {
				runtimeRequirements.add(RuntimeGlobals.asyncModule);
				initFragments.push(
					new InitFragment(
						runtimeTemplate.supportsArrowFunction()
							? `${RuntimeGlobals.asyncModule}(${module.moduleArgument}, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {${blockStart}\n`
							: `${RuntimeGlobals.asyncModule}(${module.moduleArgument}, async function (__webpack_handle_async_dependencies__, __webpack_async_result__) { try {${blockStart}\n`,
						InitFragment.STAGE_ASYNC_BOUNDARY,
						0,
						undefined,
						`${blockEnd}\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } }${hasAwait});`
					)
				);
			}
		}
	}
};

module.exports = HarmonyCompatibilityDependency;
