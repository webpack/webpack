/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import { Inheritance } from "./CssModule" */
/** @import { OutputNormalized } from "../../declarations/WebpackOptions" */
/** @typedef {Pick<OutputNormalized, "hashFunction" | "hashDigest" | "hashSalt">} HashOptions */

/**
 * Splits a media list at its top level, normalizing its identifiers and comments.
 * @param {string} list the list
 * @returns {string[]} the items
 */
const splitList = (list) => {
	const { readToken, TokenType, unescapeIdentifier, escapeIdentifier } =
		require("./syntax").parser;

	const token = {
		type: 0,
		start: 0,
		end: 0,
		isId: false,
		contentStart: 0,
		contentEnd: 0,
		unitStart: 0
	};
	/** @type {string[]} */
	const items = [];
	let depth = 0;
	let pos = 0;
	let query = "";
	while (readToken(list, pos, token) !== undefined) {
		pos = token.end;
		const { type } = token;
		const text = list.slice(token.start, token.end);
		if (depth === 0) {
			if (type === TokenType.Comma) {
				items.push(query.replace(/^[ \t\n\f\r]+|[ \t\n\f\r]+$/g, ""));
				query = "";
				continue;
			}
			if (type === TokenType.Comment) {
				// A comment separates tokens even without surrounding whitespace.
				query += " ";
				continue;
			}
			if (type === TokenType.Ident) {
				query += escapeIdentifier(unescapeIdentifier(text));
				continue;
			}
		}
		if (
			type === TokenType.LeftParenthesis ||
			type === TokenType.Function ||
			type === TokenType.LeftSquareBracket ||
			type === TokenType.LeftCurlyBracket
		) {
			depth++;
		} else if (
			depth > 0 &&
			(type === TokenType.RightParenthesis ||
				type === TokenType.RightSquareBracket ||
				type === TokenType.RightCurlyBracket)
		) {
			depth--;
		}
		query += text;
	}
	items.push(query.replace(/^[ \t\n\f\r]+|[ \t\n\f\r]+$/g, ""));
	return items;
};

const MEDIA_TYPE =
	/^(?:(only|not)[ \t\n\f\r]+)?([a-z][\w-]*)(?:[ \t\n\f\r]+and[ \t\n\f\r]+([^]*))?$/i;
// the media types that still match a device; the others match nothing
const MEDIA_TYPES = ["screen", "print"];

/**
 * Whether a media condition has to be parenthesized to be joined with `and`.
 * @param {string} condition the condition
 * @returns {boolean} true, when it holds a top-level `or` or starts with `not`
 */
const needsGroup = (condition) => {
	if (/^not[ \t\n\f\r]/i.test(condition)) return true;
	let depth = 0;
	for (let i = 0; i < condition.length; i++) {
		const char = condition.charCodeAt(i);
		if (char === 40 /* ( */) {
			depth++;
		} else if (char === 41 /* ) */) {
			depth--;
		} else if (
			depth === 0 &&
			/[ \t\n\f\r]/.test(condition[i]) &&
			/^or[ \t\n\f\r]/i.test(condition.slice(i + 1))
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
 * @param {string=} identity the import's url and place in its stylesheet, which name its own anonymous layer apart from another's
 * @param {HashOptions=} hashOptions `output.hashFunction`, `hashDigest` and `hashSalt`, which name an anonymous layer
 * @returns {{ layer: string | undefined, supports: string | undefined, media: string | undefined }} the merged conditions
 */
const mergeImportConditions = (
	layer,
	supports,
	media,
	inheritance,
	identity,
	hashOptions = {}
) => {
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
	/** @type {number[]} */
	const anonymous = [];
	for (const [index, [itemLayer, itemSupports, itemMedia]] of chain.entries()) {
		if (itemLayer !== undefined && itemLayer !== null) {
			anyLayer = true;
			if (!itemLayer) anonymous.push(index);
			layers.push(itemLayer);
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
					const query = outer ? andMediaQuery(outer, inner) : inner;
					// a query that matches nothing adds nothing to the list
					if (query !== "not all") combined.push(query);
				}
			}
			mediaList = combined;
		}
		mergedMedia = mediaList.length > 0 ? mediaList.join(", ") : "not all";
	}

	if (anonymous.length > 0 && layers.length > 1) {
		// `layer(a.<anonymous>)` has no spelling, so such a layer gets a name of its
		// own, the same in every build: a named layer the page could address too
		const createHash = require("../util/createHash");
		const { escapeIdentifier } = require("./syntax").parser;

		const { hashFunction = "md4", hashDigest = "hex", hashSalt } = hashOptions;

		let position = 0;
		for (let i = 0; i < layers.length; i++) {
			if (layers[i]) continue;
			const index = anonymous[position++];
			const hash = createHash(hashFunction);
			if (hashSalt) hash.update(hashSalt);
			hash.update(JSON.stringify(chain.slice(0, index + 1)));
			if (index === chain.length - 1 && identity) hash.update(identity);
			const digest = /** @type {string} */ (hash.digest(hashDigest));
			layers[i] = escapeIdentifier(`webpack-anonymous-${digest.slice(0, 8)}`);
		}
	} else if (anonymous.length > 0) {
		// a lone anonymous layer is written as `layer`
		layers.length = 0;
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
