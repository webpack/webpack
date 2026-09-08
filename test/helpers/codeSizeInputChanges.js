"use strict";

/** @typedef {{ modules: number, bytes: number }} Input */

/**
 * Which cases the two runs built from different source, and by how much it
 * moved. An asset that grew because its case gained source is not webpack
 * generating more code, and this is what tells the two apart.
 * @param {Record<string, Input>} before baseline input per case
 * @param {Record<string, Input>} after current input per case
 * @returns {{ cases: Set<string>, bytes: number, modules: number }} the cases
 * present in both runs whose input moved, and the totals they moved by
 */
const codeSizeInputChanges = (before, after) => {
	/** @type {Set<string>} */
	const cases = new Set();
	let bytes = 0;
	let modules = 0;
	for (const name of Object.keys(after)) {
		// A case only one run builds has no input delta — its whole output is
		// reported as new or gone rather than as a change.
		if (!(name in before)) continue;
		const from = before[name];
		const to = after[name];
		if (from.bytes === to.bytes && from.modules === to.modules) continue;
		cases.add(name);
		bytes += to.bytes - from.bytes;
		modules += to.modules - from.modules;
	}
	return { cases, bytes, modules };
};

module.exports = codeSizeInputChanges;
