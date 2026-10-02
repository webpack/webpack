/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/**
 * A condition in the minimizer plugin's `extractComments`. A function's arguments
 * are each minimizer's own, so these minifiers hand it what `MinimizeExtractCommentsCondition` names.
 * @typedef {boolean | string | RegExp | ((...args: EXPECTED_ANY[]) => boolean)} PluginExtractCommentsCondition
 */
/**
 * The minimizer plugin's `extractComments`, as far as these minifiers read it: a
 * condition, or an object holding one.
 * @typedef {PluginExtractCommentsCondition | { condition?: PluginExtractCommentsCondition }} PluginExtractComments
 */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationMinimizeExtractComments} MinimizeExtractComments */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationMinimizeExtractCommentsCondition} MinimizeExtractCommentsCondition */
/** @typedef {boolean | string | RegExp | ((comment: string) => boolean)} CommentsOption */
/** @typedef {(comment: string, line: number, column: number) => boolean} CommentPredicate */

/**
 * How one language writes a comment, and which it keeps where nothing is extracted.
 * @typedef {object} CommentSyntax
 * @property {string} open what opens a comment, e.g. `/*`
 * @property {string} close what closes it
 * @property {(comment: string) => boolean} some what the `comments: "some"` level keeps
 * @property {(comment: string) => boolean} unstated what is kept when `comments` is unset
 */

/**
 * A `comments` value as the predicate over a comment's text it stands for.
 * @param {CommentsOption} comments as configured
 * @param {(comment: string) => boolean} some what `"some"` keeps
 * @returns {(comment: string) => boolean} whether a comment is kept
 */
const keepCondition = (comments, some) => {
	if (typeof comments === "function") return comments;
	if (comments === true || comments === "all") return () => true;
	if (comments === false) return () => false;
	if (comments === "some") return some;
	const pattern = comments instanceof RegExp ? comments : new RegExp(comments);
	return (comment) => pattern.test(comment);
};

/**
 * Which comments `extractComments` takes out, read as terser-webpack-plugin
 * reads it: `true`, `"some"` or an object without a condition is terser's `some`
 * bar IE's `@cc_on`, which marks conditional compilation rather than a license.
 * @param {PluginExtractComments | MinimizeExtractComments | undefined} option as configured
 * @returns {CommentPredicate | undefined} the condition, or undefined when nothing is extracted
 */
const extractCondition = (option) => {
	if (option === undefined || option === false) return undefined;
	/** @type {EXPECTED_ANY} */
	let condition = option;
	if (typeof option === "object" && !(option instanceof RegExp)) {
		// Extracting with a condition nothing meets still drops what is not kept.
		condition = option.condition === undefined ? true : option.condition;
		if (condition === false) return () => false;
	}
	if (condition === true || condition === "some") {
		return (comment) => /@preserve|@lic|^\**!/i.test(comment);
	}
	if (typeof condition === "function") {
		// No node to hand it, nor a second kind of comment: the predicate is asked
		// about the comment alone, its text and place.
		const predicate = /** @type {MinimizeExtractCommentsCondition} */ (
			condition
		);
		return (comment, line, col) =>
			predicate({ value: comment, line, col }) === true;
	}
	const keep = keepCondition(condition, () => false);
	return (comment) => keep(comment);
};

/**
 * The `comments` predicate a print takes to extract comments, and the list
 * they are collected into, deduplicated and written with their delimiters.
 * @param {PluginExtractComments | MinimizeExtractComments | undefined} option `extractComments` as configured
 * @param {CommentsOption | undefined} comments the language's `comments` option
 * @param {CommentSyntax} syntax how the language writes and keeps comments
 * @returns {{ comments: CommentPredicate, extracted: string[] } | undefined} undefined when nothing is extracted
 */
const extractComments = (option, comments, syntax) => {
	const extract = extractCondition(option);
	if (extract === undefined) return undefined;
	// As terser does: where the comments kept are not stated, extracting leaves
	// only what the language must keep.
	const keep =
		comments === undefined
			? syntax.unstated
			: keepCondition(comments, syntax.some);
	/** @type {string[]} */
	const extracted = [];
	const seen = new Set();
	return {
		comments: (comment, line, column) => {
			if (!extract(comment, line, column)) return keep(comment);
			const text = `${syntax.open}${comment}${syntax.close}`;
			if (!seen.has(text)) {
				seen.add(text);
				extracted.push(text);
			}
			return false;
		},
		extracted
	};
};

module.exports.extractComments = extractComments;
module.exports.keepCondition = keepCondition;
