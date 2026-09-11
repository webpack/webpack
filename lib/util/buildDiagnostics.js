/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/** @import Module, { BuildDiagnostics, BuildInfo } from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */

/**
 * The diagnostics record of a build info, created on first use so a module nothing reports about carries none.
 * @param {BuildInfo} buildInfo the build info of the module
 * @returns {BuildDiagnostics} the record
 */
const getBuildDiagnostics = (buildInfo) => {
	let diagnostics = buildInfo.diagnostics;
	if (diagnostics === undefined) {
		diagnostics = buildInfo.diagnostics = {
			optimizationBailouts: undefined,
			sideEffectStatement: undefined,
			ineffectivePureAnnotations: undefined,
			topLevelThis: undefined,
			usesEval: undefined,
			notCacheableReasons: undefined
		};
	}
	return diagnostics;
};

/**
 * Records a bailout a parser plugin found, where a module restored from the cache still has it for the module graph to report.
 * @param {BuildInfo} buildInfo the build info of the module being parsed
 * @param {string} reason the bailout as reported
 * @returns {void}
 */
const recordOptimizationBailout = (buildInfo, reason) => {
	const diagnostics = getBuildDiagnostics(buildInfo);
	const bailouts =
		diagnostics.optimizationBailouts || (diagnostics.optimizationBailouts = []);
	bailouts.push(reason);
};

/**
 * Replays the bailouts parser plugins recorded for a module into the module graph,
 * which a module reused from the cache never parses into.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the built or still valid module
 * @returns {void}
 */
const replayOptimizationBailouts = (moduleGraph, module) => {
	const buildInfo = module.buildInfo;
	if (buildInfo === undefined) return;
	const diagnostics = buildInfo.diagnostics;
	if (
		diagnostics === undefined ||
		diagnostics.optimizationBailouts === undefined
	) {
		return;
	}
	const bailouts = moduleGraph.getOptimizationBailout(module);
	for (const reason of diagnostics.optimizationBailouts) bailouts.push(reason);
};

module.exports = {
	getBuildDiagnostics,
	recordOptimizationBailout,
	replayOptimizationBailouts
};
