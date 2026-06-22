/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const memoize = require("./memoize");

const getVm = memoize(() => require("vm"));

module.exports.CompilerHintNotationRegExp = Object.freeze({
	Pure: /^\s*(?:#|@)__PURE__\s*$/,
	NoSideEffects: /^\s*[#@]__NO_SIDE_EFFECTS__\s*$/
});

/**
 * regexp to match at least one "magic comment"
 * @returns {import("vm").Context} magic comment context
 */
module.exports.createMagicCommentContext = () =>
	getVm().createContext(undefined, {
		name: "Webpack Magic Comment Parser",
		codeGeneration: { strings: false, wasm: false }
	});

// Whole-comment `webpackXxx: <bool|number|null>` pair — parsed without `vm`.
const MAGIC_COMMENT_FAST_PATH =
	/^\s*(webpack[A-Z][A-Za-z]+)\s*:\s*(true|false|null|-?\d+(?:\.\d+)?)\s*$/;

/**
 * Parse one magic comment's text into its options object. Values are detached
 * from the vm context (RegExps recreated, other objects JSON-cloned). Throws
 * when the comment body fails to evaluate.
 * @param {string} value comment text (should already match `webpackCommentRegExp`)
 * @param {import("vm").Context} context context from `createMagicCommentContext`
 * @returns {Record<string, EXPECTED_ANY>} parsed options
 */
module.exports.parseMagicComment = (value, context) => {
	const fast = MAGIC_COMMENT_FAST_PATH.exec(value);
	if (fast !== null) {
		const raw = fast[2];
		return {
			[fast[1]]:
				raw === "true"
					? true
					: raw === "false"
						? false
						: raw === "null"
							? null
							: Number(raw)
		};
	}
	/** @type {Record<string, EXPECTED_ANY>} */
	const options = {};
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
	return options;
};
module.exports.webpackCommentRegExp = new RegExp(
	/(^|\W)webpack[A-Z][A-Za-z]+:/
);
