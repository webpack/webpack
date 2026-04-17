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

module.exports.webpackCommentRegExp = new RegExp(
	/(^|\W)webpack[A-Z][A-Za-z]+:/
);
