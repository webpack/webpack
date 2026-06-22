/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { UsageState } = require("../ExportsInfo");

/** @typedef {import("../Dependency").RawReferencedExports} RawReferencedExports */
/** @typedef {import("../ExportsInfo").ExportInfo} ExportInfo */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * Process export info.
 * @param {RuntimeSpec} runtime the runtime
 * @param {RawReferencedExports} referencedExports list of referenced exports, will be added to
 * @param {string[]} prefix export prefix
 * @param {ExportInfo=} exportInfo the export info
 * @param {boolean} defaultPointsToSelf when true, using default will reference itself
 * @param {Set<ExportInfo>=} alreadyVisited already visited export info (to handle circular reexports)
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
	// Only the recursive path needs the visited set; allocate it lazily
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
	visited.delete(exportInfo);
};

module.exports = processExportInfo;
