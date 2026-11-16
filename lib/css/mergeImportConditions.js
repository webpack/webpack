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
// the media types that still match a device; the others match nothing
const MEDIA_TYPES = ["screen", "print"];

/**
 * Whether a media condition has to be parenthesized to be joined with `and`.
 * @param {string} condition the condition
 * @returns {boolean} true, when it holds a top-level `or` or starts with `not`
 */
const needsGroup = (condition) => {
	if (/^not\s/i.test(condition)) return true;
	let depth = 0;
	for (let i = 0; i < condition.length; i++) {
		const char = condition.charCodeAt(i);
		if (char === 40 /* ( */) {
			depth++;
		} else if (char === 41 /* ) */) {
			depth--;
		} else if (
			depth === 0 &&
			/\s/.test(condition[i]) &&
			/^or\s/i.test(condition.slice(i + 1))
		) {
			return true;
		}
	}
	return false;
};

/**
 * @param {string} condition the condition
 * @returns {string} the condition, ready to be joined with `and`
 */
const group = (condition) =>
	needsGroup(condition) ? `(${condition})` : condition;

/**
 * Rewrites a media query without `not`, as the list of queries it matches.
 * `not T and C` matches where T does not or C does not.
 * @param {string} query the media query
 * @returns {string[]} equivalent queries, none negated
 */
const positiveQueries = (query) => {
	const match = MEDIA_TYPE.exec(query);
	if (!match || match[1] === undefined || match[1].toLowerCase() !== "not") {
		return [query];
	}
	const type = match[2].toLowerCase();
	const queries = MEDIA_TYPES.filter(
		(other) => type !== "all" && other !== type
	);
	if (match[3]) queries.push(`not (${match[3]})`);
	return queries;
};

/**
 * Both media queries at once.
 * @param {string} outer the query of the outer rule, without `not`
 * @param {string} inner the query of the inner rule, without `not`
 * @returns {string} the query matching where both do
 */
const andMediaQuery = (outer, inner) => {
	const a = MEDIA_TYPE.exec(outer);
	const b = MEDIA_TYPE.exec(inner);
	if (!a && !b) return `${group(outer)} and ${group(inner)}`;
	if (a && !b) {
		return [outer, group(inner)].join(" and ");
	}
	if (b && !a) {
		return [inner, group(outer)].join(" and ");
	}
	const typeA = /** @type {RegExpExecArray} */ (a)[2].toLowerCase();
	const typeB = /** @type {RegExpExecArray} */ (b)[2].toLowerCase();
	if (typeA !== typeB && typeA !== "all" && typeB !== "all") return "not all";
	const restA = /** @type {RegExpExecArray} */ (a)[3];
	const restB = /** @type {RegExpExecArray} */ (b)[3];
	const type = typeA === "all" ? typeB : typeA;
	const only =
		/** @type {RegExpExecArray} */ (a)[1] ||
		/** @type {RegExpExecArray} */ (b)[1];
	return [
		only ? `${only} ${type}` : type,
		restA && group(restA),
		restB && group(restB)
	]
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
 * @param {Inheritance=} inheritance the importers' chain, innermost first
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
	/** @type {string[]} */
	const mediaLists = [];
	for (const [itemLayer, itemSupports, itemMedia] of chain) {
		if (itemLayer !== undefined && itemLayer !== null) {
			anyLayer = true;
			// an anonymous layer has no name to nest under
			if (itemLayer) layers.push(itemLayer);
		}
		if (itemSupports) supportsList.push(itemSupports);
		if (itemMedia) mediaLists.push(itemMedia);
	}
	/** @type {string | undefined} */
	let mergedMedia = mediaLists.length === 1 ? mediaLists[0] : undefined;
	if (mediaLists.length > 1) {
		/** @type {string[]} */
		let mediaList = [""];
		for (const itemMedia of mediaLists) {
			/** @type {string[]} */
			const queries = [];
			for (const query of splitList(itemMedia)) {
				queries.push(...positiveQueries(query));
			}
			/** @type {string[]} */
			const combined = [];
			for (const outer of mediaList) {
				for (const inner of queries) {
					combined.push(outer ? andMediaQuery(outer, inner) : inner);
				}
			}
			mediaList = combined;
		}
		mergedMedia = mediaList.length > 0 ? mediaList.join(", ") : "not all";
	}
	return {
		layer: anyLayer ? layers.join(".") : undefined,
		supports:
			supportsList.length === 0
				? undefined
				: supportsList.length === 1
					? supportsList[0]
					: supportsList.map((item) => `(${item})`).join(" and "),
		media: mergedMedia
	};
};

module.exports = mergeImportConditions;
