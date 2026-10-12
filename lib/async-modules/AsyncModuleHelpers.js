/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const isDependencyKind = require("../graph/isDependencyKind");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const InitFragment = require("../template/InitFragment");
const memoize = require("../util/memoize");
const isGeneratorLowered = require("./isGeneratorLowered");

/** @import ModuleGraph from "../graph/ModuleGraph" */
/** @import Module, { BuildMeta } from "../module/Module" */
/** @import { GenerateContext } from "../module/Generator" */
/** @import ChunkGraph, { ModuleId } from "../graph/ChunkGraph" */
/** @import { DependencyTemplateContext } from "../template/DependencyTemplate" */
/** @import { JavascriptModuleBuildInfo } from "../javascript/JavascriptModule" */

/** @typedef {Set<Module>} Modules */

/**
 * Gets outgoing async modules.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Module} module module
 * @returns {Modules} set of modules
 */
const getOutgoingAsyncModules = (moduleGraph, module) => {
	/** @type {Modules} */
	const set = new Set();
	/** @type {Modules} */
	const seen = new Set();
	(function g(module) {
		if (!moduleGraph.isAsync(module) || seen.has(module)) return;
		seen.add(module);
		if (module.buildMeta && module.buildMeta.async) {
			set.add(module);
		} else {
			const outgoingConnectionMap =
				moduleGraph.getOutgoingConnectionsByModule(module);
			if (outgoingConnectionMap) {
				// Walk the imports in source order: the spec gathers these from
				// `[[RequestedModules]]`, and their evaluation order is observable.
				for (const dependency of module.dependencies) {
					if (
						!isDependencyKind(dependency, "esm-import") &&
						!isDependencyKind(dependency, "provided")
					) {
						continue;
					}
					const referenced = moduleGraph.getModule(dependency);
					if (!referenced || seen.has(referenced)) continue;
					const connections = outgoingConnectionMap.get(referenced);
					if (
						connections &&
						connections.some(
							(c) =>
								c.dependency !== null &&
								(isDependencyKind(c.dependency, "esm-import") ||
									isDependencyKind(c.dependency, "provided")) &&
								c.isTargetActive(undefined)
						)
					) {
						g(referenced);
					}
				}
			}
		}
	})(module);
	return set;
};

module.exports.getOutgoingAsyncModules = getOutgoingAsyncModules;

// The deferred-namespace runtime imports dependency templates, so load it on demand.
const getDeferredCycleHelpers = memoize(() =>
	require("../runtime/MakeDeferredNamespaceObjectRuntime")
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

/**
 * Wraps a module body so its imports can suspend evaluation.
 * @param {DependencyTemplateContext} templateContext template context
 * @param {boolean=} useModuleExports whether the body can replace CommonJS exports
 * @returns {InitFragment<GenerateContext>} async module boundary
 */
const createAsyncModuleInitFragment = (
	templateContext,
	useModuleExports = false
) => {
	const {
		module,
		moduleGraph,
		chunkGraph,
		runtimeTemplate,
		runtimeRequirements
	} = templateContext;
	runtimeRequirements.add(RuntimeGlobals.module);
	runtimeRequirements.add(RuntimeGlobals.asyncModule);
	// Only strict error handling retains the shared evaluation error of a cycle.
	const cycleGroupId = runtimeTemplate.outputOptions.strictModuleErrorHandling
		? getAsyncCycleGroupId(moduleGraph, chunkGraph, module)
		: null;
	if (cycleGroupId !== null) runtimeRequirements.add(RuntimeGlobals.moduleId);
	const isAsyncBody = /** @type {BuildMeta} */ (module.buildMeta).async;
	const argumentsSuffix = useModuleExports
		? `, ${isAsyncBody ? 1 : 0}, ${cycleGroupId === null ? "undefined" : JSON.stringify(cycleGroupId)}, 1`
		: cycleGroupId === null
			? isAsyncBody
				? ", 1"
				: ""
			: `, ${isAsyncBody ? 1 : 0}, ${JSON.stringify(cycleGroupId)}`;
	// Disposal must finish before dependents can resume evaluation.
	const usesTopLevelUsingDeclaration =
		/** @type {JavascriptModuleBuildInfo} */ (module.buildInfo)
			.usesTopLevelUsingDeclaration;
	const blockStart = usesTopLevelUsingDeclaration ? " {" : "";
	const blockEnd = usesTopLevelUsingDeclaration ? "\n}" : "";
	const parameters = `__webpack_handle_async_dependencies__, __webpack_async_result__${useModuleExports ? ", __webpack_async_module__" : ""}`;
	const moduleAssignment = useModuleExports
		? `${module.moduleArgument} = __webpack_async_module__;\n`
		: "";
	const bindThis = useModuleExports ? ".bind(this)" : "";
	if (isGeneratorLowered(module, moduleGraph, runtimeTemplate)) {
		runtimeRequirements.add(RuntimeGlobals.asyncModuleGenerator);
		return new InitFragment(
			`${RuntimeGlobals.asyncModule}(${module.moduleArgument}, ${RuntimeGlobals.asyncModuleGenerator}(function* (${parameters}) { try {${blockStart}\n${moduleAssignment}`,
			InitFragment.STAGE_ASYNC_BOUNDARY,
			0,
			"async-module",
			`${blockEnd}\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } }${bindThis})${argumentsSuffix});`
		);
	}
	return new InitFragment(
		(runtimeTemplate.supportsArrowFunction()
			? `${RuntimeGlobals.asyncModule}(${module.moduleArgument}, async (${parameters}) => { try {${blockStart}\n`
			: `${RuntimeGlobals.asyncModule}(${module.moduleArgument}, async function (${parameters}) { try {${blockStart}\n`) +
			moduleAssignment,
		InitFragment.STAGE_ASYNC_BOUNDARY,
		0,
		"async-module",
		`${blockEnd}\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } }${runtimeTemplate.supportsArrowFunction() ? "" : bindThis}${argumentsSuffix});`
	);
};

module.exports.createAsyncModuleInitFragment = createAsyncModuleInitFragment;
