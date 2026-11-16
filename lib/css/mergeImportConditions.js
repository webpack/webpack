/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import { Inheritance } from "./CssModule" */

/**
 * Splits a comma separated list at its top level, keeping commas in parentheses.
 * @param {string} list the list
 * @returns {string[]} the items
 */
const splitList = (list) => {
	/** @type {string[]} */
	const items = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < list.length; i++) {
		const char = list.charCodeAt(i);
		if (char === 40 /* ( */) {
			depth++;
		} else if (char === 41 /* ) */) {
			depth--;
		} else if (char === 44 /* , */ && depth === 0) {
			items.push(list.slice(start, i).trim());
			start = i + 1;
		}
	}
	items.push(list.slice(start).trim());
	return items;
};

const MEDIA_TYPE = /^(?:(only|not)\s+)?([a-z][\w-]*)(?:\s+and\s+([^]*))?$/i;

/**
 * Both media queries at once.
 * @param {string} outer the query of the outer rule
 * @param {string} inner the query of the inner rule
 * @returns {string} the query matching where both do
 */
const andMediaQuery = (outer, inner) => {
	const a = MEDIA_TYPE.exec(outer);
	const b = MEDIA_TYPE.exec(inner);
	if (!a && !b) return `${outer} and ${inner}`;
	// `not` negates its whole query, so nothing can be added to it; the
	// condition closest to the stylesheet is kept
	if ((a && a[1] === "not") || (b && b[1] === "not")) return inner;
	if (a && !b) return `${outer} and ${inner}`;
	if (b && !a) return `${inner} and ${outer}`;
	const typeA = /** @type {RegExpExecArray} */ (a)[2].toLowerCase();
	const typeB = /** @type {RegExpExecArray} */ (b)[2].toLowerCase();
	if (typeA !== typeB && typeA !== "all" && typeB !== "all") return "not all";
	const restA = /** @type {RegExpExecArray} */ (a)[3];
	const restB = /** @type {RegExpExecArray} */ (b)[3];
	const type = typeA === "all" ? typeB : typeA;
	const only =
		/** @type {RegExpExecArray} */ (a)[1] ||
		/** @type {RegExpExecArray} */ (b)[1];
	return [only ? `${only} ${type}` : type, restA, restB]
		.filter(Boolean)
		.join(" and ");
};

/**
 * Merges the conditions of an `@import` with the layers, supports and media
 * the importing stylesheets are wrapped in, for an `@import` that is kept as
 * is and so cannot be wrapped in blocks.
 * @param {string | undefined} layer the import's own layer
 * @param {string | undefined} supports the import's own supports condition
 * @param {string | undefined} media the import's own media query list
 * @param {Inheritance | undefined} inheritance the importers' chain, innermost first
 * @returns {{ layer: string | undefined, supports: string | undefined, media: string | undefined, inline?: boolean }} the merged conditions
 */
const mergeImportConditions = (layer, supports, media, inheritance) => {
	if (!inheritance || inheritance.length === 0) {
		return { layer, supports, media };
	}
	const chain = [[layer, supports, media], ...inheritance].reverse();
	/** @type {string[]} */
	const layers = [];
	let anyLayer = false;
	/** @type {string[]} */
	const supportsList = [];
	/** @type {string[] | undefined} */
	let mediaList;
	for (const [itemLayer, itemSupports, itemMedia] of chain) {
		if (itemLayer !== undefined && itemLayer !== null) {
			anyLayer = true;
			// an anonymous layer has no name to nest under
			if (itemLayer) layers.push(itemLayer);
		}
		if (itemSupports) supportsList.push(itemSupports);
		if (itemMedia) {
			const queries = splitList(itemMedia);
			if (mediaList === undefined) {
				mediaList = queries;
			} else {
				/** @type {string[]} */
				const combined = [];
				for (const outer of mediaList) {
					for (const inner of queries) {
						combined.push(andMediaQuery(outer, inner));
					}
				}
				mediaList = combined;
			}
		}
	}
	return {
		layer: anyLayer ? layers.join(".") : undefined,
		supports:
			supportsList.length === 0
				? undefined
				: supportsList.length === 1
					? supportsList[0]
					: supportsList.map((item) => `(${item})`).join(" and "),
		media: mediaList && mediaList.join(", ")
	};
};

module.exports = mergeImportConditions;
