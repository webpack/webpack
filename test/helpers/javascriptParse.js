"use strict";

/** @typedef {import("../../lib/javascript/syntax-parser").CollectedComment} CollectedComment */
/** @typedef {import("../../lib/javascript/syntax-parser").ParserOptions} ParserOptions */
/** @typedef {{ ast: import("estree").Program, comments: CollectedComment[] }} ParseResult */

const { parse: webpackParse } = require("../../lib/javascript/syntax").parser;

/**
 * Parse with the options a build hands the parser: ranges alone become lazy
 * offsets, and comments are collected lazily or eagerly to match.
 * @param {string} code source
 * @param {object=} options extra parse options, plus `comments` to collect them
 * @returns {ParseResult} result
 */
const parse = (code, options) => {
	const { comments: collectComments, ...rest } =
		/** @type {ParserOptions & { comments?: boolean }} */ ({
			sourceType: "script",
			ecmaVersion: "latest",
			comments: true,
			ranges: true,
			allowHashBang: true,
			...options
		});
	/** @type {CollectedComment[]} */
	const comments = [];
	const lazyNodes = rest.ranges === true && rest.locations !== true;
	/** @type {ParserOptions} */
	const parserOptions = {
		allowReturnOutsideFunction: rest.sourceType === "script",
		...rest,
		ranges: lazyNodes ? false : rest.ranges,
		lazyNodes,
		estree: true
	};
	if (collectComments === true) {
		if (lazyNodes) parserOptions.lazyComments = comments;
		else parserOptions.onComment = comments;
	}
	return { ast: webpackParse(code, parserOptions), comments };
};

/**
 * A tree, token, comment or error as plain data, so acorn's and ours compare by value.
 * @param {unknown} value what to convert
 * @returns {unknown} the plain data
 */
const plain = (value) =>
	JSON.parse(
		JSON.stringify(value, (key, v) => {
			if (typeof v === "bigint") return `${v}n`;
			if (v instanceof RegExp) return { regexp: v.source, flags: v.flags };
			if (key === "type" && v && typeof v === "object" && "label" in v) {
				return { label: v.label };
			}
			return v;
		})
	);

module.exports = { parse, plain };
