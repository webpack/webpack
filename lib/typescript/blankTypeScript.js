/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { ReplaceSource } = require("webpack-sources");
const {
	TSX_RESOURCE_REGEXP,
	TYPESCRIPT_RESOURCE_REGEXP,
	parseResource
} = require("../util/identifier");

/** @import { Source } from "webpack-sources" */
/** @import Module from "../module/Module" */

/** @typedef {[number, number, string]} Blank a range of the source and the text it is replaced with */

/**
 * The path a module's resource names, query and fragment cut off; a `data:`
 * URI is its own path.
 * @param {Module} module the module
 * @returns {string | null} its path, null without a resource
 */
const resourcePathOf = (module) => {
	const resource = module.nameForCondition();
	if (!resource) return null;
	return resource.startsWith("data:") ? resource : parseResource(resource).path;
};

/**
 * Whether a module is TypeScript by its resource: a `.ts`, `.mts` or `.cts`
 * file, or a TypeScript `data:` URI; a `.tsx` file throws, as JSX is not read.
 * @param {Module} module the module
 * @returns {boolean} whether its source is read as TypeScript
 */
const isTypeScriptModule = (module) => {
	const path = resourcePathOf(module);
	if (path === null || !TYPESCRIPT_RESOURCE_REGEXP.test(path)) return false;
	if (TSX_RESOURCE_REGEXP.test(path)) {
		throw new Error(
			"experiments.typescript does not support .tsx/JSX. Use a TSX-capable loader (e.g. swc-loader, esbuild-loader, ts-loader) for .tsx files."
		);
	}
	return true;
};

/**
 * The replacements blanking `ranges` in `source`, overlapping and adjacent
 * ranges joined, in source order. Every character turns into a space but line
 * terminators, so every offset, line and column stays, and a range's `;` or
 * `)` is written where the blanked text would otherwise read differently.
 * @param {string} source the module's source
 * @param {number[]} ranges the parser's `typeRanges`: start, end and the character to write at the start (0 for none), for each range
 * @returns {Blank[]} each replaced range and its text
 */
const typeScriptBlanks = (source, ranges) => {
	/** @type {number[]} */
	const order = [];
	for (let i = 0; i < ranges.length; i += 3) order.push(i);
	// a moved `)` is recorded after the return type it lands in
	order.sort((a, b) => ranges[a] - ranges[b] || ranges[a + 1] - ranges[b + 1]);
	/** @type {Blank[]} */
	const result = [];
	let index = 0;
	while (index < order.length) {
		const start = ranges[order[index]];
		let end = ranges[order[index] + 1];
		let next = index + 1;
		while (next < order.length && ranges[order[next]] <= end) {
			end = Math.max(end, ranges[order[next] + 1]);
			next++;
		}
		/** @type {string[]} */
		const chars = [];
		for (let i = start; i < end; i++) {
			const ch = source.charCodeAt(i);
			chars.push(
				ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029
					? source[i]
					: " "
			);
		}
		for (let i = index; i < next; i++) {
			const write = ranges[order[i] + 2];
			if (write !== 0) {
				chars[ranges[order[i]] - start] = String.fromCharCode(write);
			}
		}
		result.push([start, end, chars.join("")]);
		index = next;
	}
	return result;
};

/**
 * @param {string} source the TypeScript source
 * @param {number[]} ranges what its parse with `typescript: true` skipped
 * @returns {string} the source with those ranges blanked, offset for offset
 */
const blankTypeScript = (source, ranges) => {
	let blanked = "";
	let at = 0;
	for (const [start, end, text] of typeScriptBlanks(source, ranges)) {
		blanked += source.slice(at, start) + text;
		at = end;
	}
	return blanked + source.slice(at);
};

/**
 * A module's source with its types blanked, as a layer of its own beneath the
 * dependencies' replacements, so one replacing code types sit in (a dead
 * branch) composes with the blanking instead of overlapping it.
 * @param {Source} source the module's original source
 * @param {number[]} ranges what its parse with `typescript: true` skipped
 * @returns {Source} the source with those ranges blanked
 */
const blankTypeScriptSource = (source, ranges) => {
	const blanked = new ReplaceSource(source);
	for (const [start, end, text] of typeScriptBlanks(
		/** @type {string} */ (source.source()),
		ranges
	)) {
		blanked.replace(start, end - 1, text);
	}
	return blanked;
};

module.exports.blankTypeScript = blankTypeScript;
module.exports.blankTypeScriptSource = blankTypeScriptSource;
module.exports.isTypeScriptModule = isTypeScriptModule;
module.exports.typeScriptBlanks = typeScriptBlanks;
