/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/** @import Module, { BuildInfo, OptimizationBailoutRecord } from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */

/**
 * @param {BuildInfo} buildInfo the build info of the module being parsed
 * @param {string} reason the bailout as reported
 * @returns {OptimizationBailoutRecord} the record, for the typed detail a hint reads beside the reason
 */
const recordOptimizationBailout = (buildInfo, reason) => {
	let record = buildInfo.optimizationBailout;
	if (record === undefined) {
		record = buildInfo.optimizationBailout = {
			reasons: [],
			sideEffect: undefined
		};
	}
	record.reasons.push(reason);
	return record;
};

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the built or still valid module
 * @returns {void}
 */
const addRecordedOptimizationBailouts = (moduleGraph, module) => {
	const buildInfo = module.buildInfo;
	if (buildInfo === undefined) return;
	const recorded = buildInfo.optimizationBailout;
	if (recorded === undefined) return;
	const bailouts = moduleGraph.getOptimizationBailout(module);
	for (const reason of recorded.reasons) bailouts.push(reason);
};

module.exports = { addRecordedOptimizationBailouts, recordOptimizationBailout };
