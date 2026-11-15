/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { UsageState } = require("../../graph/ExportsInfo");

/** @import { RawReferencedExports } from "../../graph/Dependency" */
/** @import { ExportInfo } from "../../graph/ExportsInfo" */
/** @import { RuntimeSpec } from "../../util/runtime" */

/**
 * Process export info.
 * @param {RuntimeSpec} runtime the runtime
 * @param {RawReferencedExports} referencedExports list of referenced exports, will be added to
 * @param {string[]} prefix export prefix
 * @param {InstanceType<ExportInfo>=} exportInfo the export info
 * @param {boolean} defaultPointsToSelf when true, using default will reference itself
 * @param {Set<InstanceType<ExportInfo>>=} alreadyVisited export info already expanded in this walk (circular and shared reexports)
 */
const processExportInfo = (
	runtime,
	referencedExports,
	prefix,
	exportInfo,
	defaultPointsToSelf = false,
	alreadyVisited = undefined
) => {
	if (!exportInfo) {
		referencedExports.push(prefix);
		return;
	}
	const used = exportInfo.getUsed(runtime);
	if (used === UsageState.Unused) return;
	if (alreadyVisited !== undefined && alreadyVisited.has(exportInfo)) {
		referencedExports.push(prefix);
		return;
	}
	// Terminal case: not recursing, so no need to track visited here
	if (
		used !== UsageState.OnlyPropertiesUsed ||
		!exportInfo.exportsInfo ||
		exportInfo.exportsInfo.otherExportsInfo.getUsed(runtime) !==
			UsageState.Unused
	) {
		referencedExports.push(prefix);
		return;
	}
	// Walk-wide set: a namespace reached along many paths is expanded once,
	// later paths reference it as a whole instead of walking it again
	/** @type {Set<InstanceType<ExportInfo>>} */
	const visited = alreadyVisited !== undefined ? alreadyVisited : new Set();
	visited.add(exportInfo);
	const exportsInfo = exportInfo.exportsInfo;
	for (const childExportInfo of exportsInfo.orderedExports) {
		processExportInfo(
			runtime,
			referencedExports,
			defaultPointsToSelf && childExportInfo.name === "default"
				? prefix
				: [...prefix, childExportInfo.name],
			childExportInfo,
			false,
			visited
		);
	}
};

module.exports = processExportInfo;
