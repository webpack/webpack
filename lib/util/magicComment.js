/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const binarySearchBounds = require("./binarySearchBounds");
const memoize = require("./memoize");

const getVm = memoize(() => require("vm"));

const CompilerHintNotationRegExp = Object.freeze({
	Pure: /^\s*(?:#|@)__PURE__\s*$/,
	NoSideEffects: /^\s*[#@]__NO_SIDE_EFFECTS__\s*$/
});

// Whole-comment `webpackXxx: <bool|number|null>` pair — parsed without `vm`.
const MAGIC_COMMENT_FAST_PATH =
	/^\s*(webpack[A-Z][A-Za-z]+)\s*:\s*(true|false|null|-?\d+(?:\.\d+)?)\s*$/;

const webpackCommentRegExp = new RegExp(/(^|\W)webpack[A-Z][A-Za-z]+:/);

/** @type {Readonly<{ options: null, errors: null }>} */
const EMPTY_COMMENT_OPTIONS = Object.freeze({
	options: null,
	errors: null
});

/**
 * @returns {import("vm").Context} magic comment context
 */
const createMagicCommentContext = () =>
	getVm().createContext(undefined, {
		name: "Webpack Magic Comment Parser",
		codeGeneration: { strings: false, wasm: false }
	});

/**
 * Parse one magic comment's text and merge into `options`. Values are detached
 * from the vm context (RegExps recreated, other objects JSON-cloned). Throws
 * when the comment body fails to evaluate.
 * @param {Record<string, EXPECTED_ANY>} options target to merge into
 * @param {string} value comment text (should already match `webpackCommentRegExp`)
 * @param {import("vm").Context} context context from `createMagicCommentContext`
 * @returns {void}
 */
const assignMagicCommentOptions = (options, value, context) => {
	const fast = MAGIC_COMMENT_FAST_PATH.exec(value);
	if (fast !== null) {
		const raw = fast[2];
		options[fast[1]] =
			raw === "true"
				? true
				: raw === "false"
					? false
					: raw === "null"
						? null
						: Number(raw);
		return;
	}
	for (let [key, val] of Object.entries(
		getVm().runInContext(`(function(){return {${value}};})()`, context)
	)) {
		if (typeof val === "object" && val !== null) {
			val =
				val.constructor.name === "RegExp"
					? new RegExp(val)
					: JSON.parse(JSON.stringify(val));
		}
		options[key] = val;
	}
};

/**
 * Parse one magic comment's text into its options object.
 * @param {string} value comment text (should already match `webpackCommentRegExp`)
 * @param {import("vm").Context} context context from `createMagicCommentContext`
 * @returns {Record<string, EXPECTED_ANY>} parsed options
 */
const parseMagicComment = (value, context) => {
	/** @type {Record<string, EXPECTED_ANY>} */
	const options = {};
	assignMagicCommentOptions(options, value, context);
	return options;
};

/**
 * `binarySearchBounds` comparator for `getCommentsInRange`.
 * @param {{ range: [number, number] }} comment comment
 * @param {number} needle needle (byte offset)
 * @returns {number} comparison
 */
const compareCommentStart = (comment, needle) => comment.range[0] - needle;

/**
 * Comments fully inside `range`, via binary search over source-ordered `comments`.
 * @template {object} TComment
 * @param {(TComment & { range: [number, number] })[]} comments source-ordered comments
 * @param {[number, number]} range range
 * @returns {TComment[]} comments in the range
 */
const getCommentsInRange = (comments, range) => {
	if (comments.length === 0) return [];
	const [start, end] = range;
	let idx = binarySearchBounds.ge(comments, start, compareCommentStart);
	/** @type {TComment[]} */
	const commentsInRange = [];
	while (comments[idx] && comments[idx].range[1] <= end) {
		commentsInRange.push(comments[idx]);
		idx++;
	}
	return commentsInRange;
};

/**
 * Merge webpack magic-comment options from `comments` in source order.
 * @template {object} TComment
 * @param {(TComment & { value: string })[]} comments comments fully inside the range
 * @param {import("vm").Context} context context from `createMagicCommentContext`
 * @returns {{ options: Record<string, EXPECTED_ANY> | null, errors: (Error & { comment: TComment })[] | null }} result
 */
const parseMagicCommentOptions = (comments, context) => {
	if (comments.length === 0) {
		return /** @type {{ options: Record<string, EXPECTED_ANY> | null, errors: (Error & { comment: TComment })[] | null }} */ (
			EMPTY_COMMENT_OPTIONS
		);
	}
	/** @type {Record<string, EXPECTED_ANY>} */
	const options = {};
	/** @type {(Error & { comment: TComment })[]} */
	const errors = [];
	for (const comment of comments) {
		const { value } = comment;
		if (value && webpackCommentRegExp.test(value)) {
			try {
				assignMagicCommentOptions(options, value, context);
			} catch (err) {
				const newErr = new Error(String(/** @type {Error} */ (err).message));
				newErr.stack = String(/** @type {Error} */ (err).stack);
				Object.assign(newErr, { comment });
				errors.push(/** @type {Error & { comment: TComment }} */ (newErr));
			}
		}
	}
	return { options, errors };
};

/**
 * Merge webpack magic-comment options from comments inside `range`.
 * @template {object} TComment
 * @param {(TComment & { range: [number, number], value: string })[]} comments source-ordered comments
 * @param {[number, number]} range range
 * @param {import("vm").Context} context context from `createMagicCommentContext`
 * @returns {{ options: Record<string, EXPECTED_ANY> | null, errors: (Error & { comment: TComment })[] | null }} result
 */
const parseCommentOptionsInRange = (comments, range, context) =>
	parseMagicCommentOptions(getCommentsInRange(comments, range), context);

module.exports = {
	CompilerHintNotationRegExp,
	createMagicCommentContext,
	getCommentsInRange,
	parseCommentOptionsInRange,
	parseMagicComment,
	webpackCommentRegExp
};
