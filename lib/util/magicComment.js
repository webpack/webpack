/*
	MIT License https://www.opensource.org/licenses/mit-license.php
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

// Whole-comment `webpackXxx: <bool|number|null>` pair - parsed without `vm`.
const MAGIC_COMMENT_FAST_PATH =
	/^\s*(webpack[A-Z][A-Za-z]+)\s*:\s*(true|false|null|-?\d+(?:\.\d+)?)\s*$/;

const webpackCommentRegExp = new RegExp(/(^|\W)webpack[A-Z][A-Za-z]+:/);

/** @import { JsonValue } from "../fs/fs" */

/**
 * What a magic comment's value evaluates to, once detached from the vm context:
 * a primitive, a function, a recreated `RegExp`, or the JSON clone of any other object.
 * @typedef {string | number | bigint | boolean | symbol | null | undefined | RegExp | JsonValue | ((...args: never[]) => void)} MagicCommentValue
 */

/**
 * Magic comment options by name; each value is what the user's comment evaluates to.
 * @typedef {Record<string, MagicCommentValue>} MagicCommentOptions
 */

/** @type {Readonly<{ options: null, errors: null }>} */
const EMPTY_COMMENT_OPTIONS = Object.freeze({
	options: null,
	errors: null
});

/** @typedef {LiteralValue[]} LiteralArray */
/** @typedef {{ [Key in string]?: LiteralValue }} LiteralObject */
/** @typedef {string | number | bigint | boolean | null | undefined | RegExp | LiteralArray | LiteralObject} LiteralValue */

/** Thrown inside the reader when the text is no plain literal list. */
const NOT_LITERAL = Symbol("not a literal");

const WHITESPACE = /[\s\uFEFF]/;
const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[\w$]/;
const DECIMAL_NUMBER = /^(?:(?:0|[1-9]\d*)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const PREFIXED_NUMBER = /^0(?:[xX][\da-fA-F]+|[oO][0-7]+|[bB][01]+)/;
const BIGINT_NUMBER =
	/^(?:0|[1-9]\d*|0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+)n/;
const REGEXP_FLAGS = /^[a-z]*/;
const LINE_TERMINATOR = /[\n\r\u2028\u2029]/;

/** @type {Record<string, string>} */
const SINGLE_CHAR_ESCAPES = {
	b: "\b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "\t",
	v: "\v"
};

/**
 * Read the text of a magic comment, `key: value, key: value`, as the object
 * literal `({ ... })` would give it, without evaluating any code.
 * @param {string} text comment text
 * @returns {Record<string, LiteralValue> | undefined} the properties, or `undefined` when the text holds anything but plain literals
 */
const readMagicCommentLiteral = (text) => {
	let pos = 0;

	/** @returns {never} never returns */
	const fail = () => {
		throw NOT_LITERAL;
	};

	const skipWhitespace = () => {
		while (pos < text.length && WHITESPACE.test(text[pos])) pos++;
	};

	/**
	 * @param {string} quote the closing quote
	 * @returns {string} the string's value
	 */
	const readString = (quote) => {
		pos++;
		let value = "";
		for (;;) {
			if (pos >= text.length) fail();
			const char = text[pos];
			if (char === quote) {
				pos++;
				return value;
			}
			if (quote === "`") {
				// a template literal only when it is plain text
				if (char === "\\" || char === "\r" || text.startsWith("${", pos)) {
					fail();
				}
				value += char;
				pos++;
				continue;
			}
			if (char === "\n" || char === "\r") fail();
			if (char !== "\\") {
				value += char;
				pos++;
				continue;
			}
			const next = text[pos + 1];
			if (next === undefined) fail();
			if (next === "x") {
				const hex = text.slice(pos + 2, pos + 4);
				if (!/^[\da-fA-F]{2}$/.test(hex)) fail();
				value += String.fromCharCode(Number.parseInt(hex, 16));
				pos += 4;
			} else if (next === "u") {
				const match = /^u(?:([\da-fA-F]{4})|\{([\da-fA-F]{1,6})\})/.exec(
					text.slice(pos + 1, pos + 10)
				);
				if (match === null) fail();
				const code = Number.parseInt(match[1] || match[2], 16);
				if (code > 0x10ffff) fail();
				value += String.fromCodePoint(code);
				pos += 1 + match[0].length;
			} else if (next === "0" && !/\d/.test(text[pos + 2] || "")) {
				value += "\0";
				pos += 2;
			} else if (/\d/.test(next)) {
				// a legacy octal escape
				fail();
			} else if (LINE_TERMINATOR.test(next)) {
				pos += next === "\r" && text[pos + 2] === "\n" ? 3 : 2;
			} else {
				value += SINGLE_CHAR_ESCAPES[next] || next;
				pos += 2;
			}
		}
	};

	/** @returns {RegExp} the regular expression */
	const readRegExp = () => {
		const start = ++pos;
		let inClass = false;
		for (;;) {
			const char = text[pos];
			if (char === undefined || LINE_TERMINATOR.test(char)) fail();
			if (char === "\\") {
				if (
					text[pos + 1] === undefined ||
					LINE_TERMINATOR.test(text[pos + 1])
				) {
					fail();
				}
				pos += 2;
				continue;
			}
			if (char === "[") inClass = true;
			else if (char === "]") inClass = false;
			else if (char === "/" && !inClass) break;
			pos++;
		}
		const body = text.slice(start, pos++);
		if (body === "" || body[0] === "*") fail();
		const flags = /** @type {RegExpExecArray} */ (
			REGEXP_FLAGS.exec(text.slice(pos))
		)[0];
		pos += flags.length;
		if (IDENTIFIER_PART.test(text[pos] || "")) fail();
		try {
			return new RegExp(body, flags);
		} catch (_err) {
			return fail();
		}
	};

	/**
	 * @param {boolean} negative whether a minus sign came before it
	 * @returns {number | bigint} the number
	 */
	const readNumber = (negative) => {
		const rest = text.slice(pos);
		const bigint = BIGINT_NUMBER.exec(rest);
		/** @type {number | bigint} */
		let value;
		let length;
		if (bigint !== null) {
			length = bigint[0].length;
			value = BigInt(bigint[0].slice(0, -1));
			if (negative) value = -value;
		} else {
			const match = PREFIXED_NUMBER.exec(rest) || DECIMAL_NUMBER.exec(rest);
			if (match === null) fail();
			length = match[0].length;
			value = Number(match[0]);
			if (negative) value = -value;
		}
		pos += length;
		// `08`, `1_000` and `3in` are not read here
		if (/[\w$]/.test(text[pos] || "")) fail();
		return value;
	};

	/** @returns {string} the identifier */
	const readIdentifier = () => {
		const start = pos;
		if (!IDENTIFIER_START.test(text[pos] || "")) fail();
		while (pos < text.length && IDENTIFIER_PART.test(text[pos])) pos++;
		// a name continued by an escape or a non-ASCII letter
		if (
			pos < text.length &&
			(text[pos] === "\\" || text.charCodeAt(pos) > 0x7f)
		) {
			fail();
		}
		return text.slice(start, pos);
	};

	/** @returns {string} the property key */
	const readKey = () => {
		const char = text[pos];
		if (char === '"' || char === "'") return readString(char);
		if (char !== undefined && /\d/.test(char)) {
			const match = /^(?:0|[1-9]\d*)(?![\w$.])/.exec(text.slice(pos));
			if (match === null) fail();
			pos += match[0].length;
			return String(Number(match[0]));
		}
		return readIdentifier();
	};

	/**
	 * Read `key: value` pairs up to `end` into a new object.
	 * @param {string | undefined} end the closing character, `undefined` for the whole text
	 * @returns {Record<string, LiteralValue>} the properties
	 */
	const readProperties = (end) => {
		/** @type {Record<string, LiteralValue>} */
		const properties = Object.create(null);
		let sawProto = false;
		for (;;) {
			skipWhitespace();
			if (text[pos] === end) break;
			const key = readKey();
			skipWhitespace();
			if (text[pos] !== ":") fail();
			pos++;
			const value = readValue();
			// `__proto__: x` sets the prototype, it is no property
			if (key === "__proto__") {
				if (sawProto) fail();
				sawProto = true;
			} else {
				properties[key] = value;
			}
			skipWhitespace();
			if (text[pos] === ",") {
				pos++;
				continue;
			}
			if (text[pos] !== end) fail();
			break;
		}
		if (end !== undefined) pos++;
		return properties;
	};

	/** @returns {LiteralValue[]} the array */
	const readArray = () => {
		pos++;
		/** @type {LiteralValue[]} */
		const items = [];
		for (;;) {
			skipWhitespace();
			if (text[pos] === "]") break;
			// a hole or a spread is not read here
			if (text[pos] === "," || text.startsWith("...", pos)) fail();
			items.push(readValue());
			skipWhitespace();
			if (text[pos] === ",") {
				pos++;
				continue;
			}
			if (text[pos] !== "]") fail();
			break;
		}
		pos++;
		return items;
	};

	/** @returns {LiteralValue} the value */
	const readValue = () => {
		skipWhitespace();
		const char = text[pos];
		if (char === '"' || char === "'" || char === "`") return readString(char);
		if (char === "[") return readArray();
		if (char === "{") {
			pos++;
			return readProperties("}");
		}
		if (char === "/") return readRegExp();
		if (char === "-" || char === "+") {
			pos++;
			skipWhitespace();
			if (text.startsWith("Infinity", pos) || text.startsWith("NaN", pos)) {
				const name = readIdentifier();
				if (name !== "Infinity" && name !== "NaN") fail();
				return char === "-" ? -Number(name) : Number(name);
			}
			const value = readNumber(char === "-");
			// `+1n` throws a TypeError
			if (char === "+" && typeof value === "bigint") fail();
			return value;
		}
		if (char !== undefined && /[\d.]/.test(char)) return readNumber(false);
		const name = readIdentifier();
		switch (name) {
			case "true":
				return true;
			case "false":
				return false;
			case "null":
				return null;
			case "undefined":
				return undefined;
			case "Infinity":
				return Infinity;
			case "NaN":
				return Number.NaN;
			default:
				return fail();
		}
	};

	try {
		const properties = readProperties(undefined);
		return pos === text.length ? properties : undefined;
	} catch (err) {
		if (err === NOT_LITERAL) return undefined;
		throw err;
	}
};

// How long a comment that is no plain literal may evaluate
const MAGIC_COMMENT_TIMEOUT = 1000;

/**
 * Create the context a comment that is no plain literal evaluates in. Its
 * global object has no prototype, so nothing in it leads to webpack's own `Function`.
 * @returns {import("vm").Context} magic comment context
 */
const createMagicCommentContext = () =>
	getVm().createContext(Object.create(null), {
		name: "Webpack Magic Comment Parser",
		codeGeneration: { strings: false, wasm: false }
	});

/**
 * Detach a value from where it was read: a RegExp is recreated, any other object is JSON-cloned.
 * @param {LiteralValue} value the value
 * @returns {MagicCommentValue} the detached value
 */
const detachValue = (value) => {
	if (typeof value !== "object" || value === null) return value;
	if (value instanceof RegExp) return new RegExp(value);
	return JSON.parse(JSON.stringify(value));
};

/**
 * Parse one magic comment's text and merge into `options`. Values are detached
 * from the vm context (RegExps recreated, other objects JSON-cloned). Throws
 * when the comment body fails to evaluate.
 * @param {MagicCommentOptions} options target to merge into
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
	// plain literals are read as data, without running any code
	const literal = readMagicCommentLiteral(value);
	if (literal !== undefined) {
		for (const key of Object.keys(literal)) {
			options[key] = detachValue(literal[key]);
		}
		return;
	}
	for (let [key, val] of Object.entries(
		/** @type {MagicCommentOptions} */
		(
			getVm().runInContext(`(function(){return {${value}};})()`, context, {
				timeout: MAGIC_COMMENT_TIMEOUT
			})
		)
	)) {
		if (typeof val === "object" && val !== null) {
			val =
				val.constructor.name === "RegExp"
					? new RegExp(/** @type {RegExp} */ (val))
					: JSON.parse(JSON.stringify(val));
		}
		options[key] = val;
	}
};

/**
 * Parse one magic comment's text into its options object.
 * @param {string} value comment text (should already match `webpackCommentRegExp`)
 * @param {import("vm").Context} context context from `createMagicCommentContext`
 * @returns {MagicCommentOptions} parsed options
 */
const parseMagicComment = (value, context) => {
	/** @type {MagicCommentOptions} */
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
 * @returns {{ options: MagicCommentOptions | null, errors: (Error & { comment: TComment })[] | null }} result
 */
const parseMagicCommentOptions = (comments, context) => {
	if (comments.length === 0) {
		return /** @type {{ options: MagicCommentOptions | null, errors: (Error & { comment: TComment })[] | null }} */ (
			EMPTY_COMMENT_OPTIONS
		);
	}
	/** @type {MagicCommentOptions} */
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
 * @returns {{ options: MagicCommentOptions | null, errors: (Error & { comment: TComment })[] | null }} result
 */
const parseCommentOptionsInRange = (comments, range, context) =>
	parseMagicCommentOptions(getCommentsInRange(comments, range), context);

module.exports = {
	CompilerHintNotationRegExp,
	createMagicCommentContext,
	getCommentsInRange,
	parseCommentOptionsInRange,
	parseMagicComment,
	readMagicCommentLiteral,
	webpackCommentRegExp
};
