/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// a global only from Node.js 11, and `lib` runs on 10.13
// eslint-disable-next-line n/prefer-global/text-decoder
const { TextDecoder } = require("util");
const memoize = require("../util/memoize");
const { declaredCharset } = require("./syntax-parser");

const getJavascriptSyntaxParser = memoize(
	() => require("../javascript/syntax").parser
);

/** @import { Node, Program, TaggedTemplateExpression } from "estree" */
/** @import Module from "../module/Module" */
/** @import { HtmlModuleBuildInfo } from "./HtmlModule" */

/**
 * The encoding a page's bytes are kept in when it is not UTF-8: `utf-16le` or
 * `utf-16be` by its byte order mark, or the name of the encoding its `<meta>`
 * declares, which keeps ASCII as ASCII, so the page is read byte for byte.
 * @typedef {string} DocumentEncoding
 */

/**
 * The encoding of a page's bytes, as a browser finds it before reading them.
 * @param {Buffer} buffer the page's bytes
 * @returns {DocumentEncoding | undefined} the encoding, or undefined for UTF-8
 */
const getDocumentEncoding = (buffer) => {
	if (buffer[0] === 0xff && buffer[1] === 0xfe) return "utf-16le";
	if (buffer[0] === 0xfe && buffer[1] === 0xff) return "utf-16be";
	if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return;
	const label = declaredCharset(buffer.toString("latin1", 0, 1024));
	if (label === undefined) return;
	/** @type {string} */
	let encoding;
	try {
		encoding = new TextDecoder(label.trim()).encoding;
	} catch (_err) {
		// a label the runtime cannot decode is read as UTF-8, as before
		return;
	}
	// UTF-8, or a `<meta>` naming UTF-16, which means UTF-8 to a browser too
	if (/^utf-(?:8$|16)/.test(encoding)) return;
	return encoding;
};

/**
 * The text webpack works on: a UTF-16 page's characters, or one character per
 * byte of a page in another encoding, so its bytes are written back unchanged.
 * @param {Buffer} buffer the page's bytes
 * @param {DocumentEncoding} encoding its encoding
 * @returns {string} the text
 */
const decodeDocument = (buffer, encoding) => {
	if (encoding === "utf-16le") return buffer.toString("utf16le", 2);
	if (encoding === "utf-16be") {
		const bytes = Buffer.from(buffer.subarray(2, buffer.length & ~1));
		return bytes.swap16().toString("utf16le");
	}
	return buffer.toString("latin1");
};

/** @type {Map<DocumentEncoding, Map<string, string>>} */
const encoders = new Map();

/**
 * The bytes each character the encoding holds is written as, one character per
 * byte, read off its decoder: Node.js decodes every encoding but encodes UTF-8 only.
 * @param {DocumentEncoding} encoding the encoding
 * @returns {Map<string, string>} the bytes of each character
 */
const getEncoder = (encoding) => {
	let encoder = encoders.get(encoding);
	if (encoder !== undefined) return encoder;
	encoder = new Map();
	const decoder = new TextDecoder(encoding, { fatal: true });
	/**
	 * Records the character a byte sequence decodes to, the first one seen winning.
	 * @param {Buffer} bytes the bytes
	 */
	const add = (bytes) => {
		let char;
		try {
			char = decoder.decode(bytes);
		} catch (_err) {
			return;
		}
		// a sequence decoding to two characters is two characters, not this one
		if (char.length === 0 || [...char].length !== 1) return;
		if (!encoder.has(char)) encoder.set(char, bytes.toString("latin1"));
	};
	for (let byte = 0x80; byte <= 0xff; byte++) add(Buffer.from([byte]));
	// an encoding with a character for every byte has no two-byte sequence
	if (encoder.size === 0x80) {
		encoders.set(encoding, encoder);
		return encoder;
	}
	for (let lead = 0x81; lead <= 0xfe; lead++) {
		for (let trail = 0x40; trail <= 0xfe; trail++) {
			add(Buffer.from([lead, trail]));
		}
	}
	encoders.set(encoding, encoder);
	return encoder;
};

/**
 * A character reference, which markup reads as the character.
 * @param {number} codePoint the character
 * @returns {string} the reference
 */
const escapeHtmlCodePoint = (codePoint) => `&#x${codePoint.toString(16)};`;

/**
 * A CSS escape, which a stylesheet reads as the character.
 * @param {number} codePoint the character
 * @returns {string} the escape
 */
const escapeCssCodePoint = (codePoint) => `\\${codePoint.toString(16)} `;

/**
 * A `\u` escape of each UTF-16 unit, which a script reads as the character in a
 * string, a template, a regular expression and an identifier alike.
 * @param {number} codePoint the character
 * @returns {string} the escape
 */
const escapeJsCodePoint = (codePoint) => {
	const char = String.fromCodePoint(codePoint);
	let escaped = "";
	for (let i = 0; i < char.length; i++) {
		escaped += `\\u${char.charCodeAt(i).toString(16).padStart(4, "0")}`;
	}
	return escaped;
};

const NON_ASCII_REGEXP = /[^\0-\u007F]/;
const BYTE_RUN_REGEXP = /[\0-\u00FF]+/g;
const WIDE_RUN_REGEXP = /[^\0-\u00FF]+/g;

/**
 * Whether text taken from a page holds a character its bytes do not spell out:
 * ISO-2022-JP writes Japanese with ASCII bytes behind an escape.
 * @param {string} text the text
 * @param {DocumentEncoding} encoding the page's encoding
 * @returns {boolean} whether it has to be decoded
 */
const needsDecoding = (text, encoding) =>
	NON_ASCII_REGEXP.test(text) ||
	(encoding === "iso-2022-jp" && text.includes("\u001B"));

/**
 * The characters of text taken from a page (see `decodeDocument`). A character
 * above U+00FF is one a step put there, and is kept.
 * @param {string} text the text
 * @param {DocumentEncoding} encoding the page's encoding
 * @returns {string} the characters
 */
const fromDocument = (text, encoding) => {
	if (encoding.startsWith("utf-16") || !needsDecoding(text, encoding)) {
		return text;
	}
	const decoder = new TextDecoder(encoding);
	return text.replace(BYTE_RUN_REGEXP, (run) =>
		decoder.decode(Buffer.from(run, "latin1"))
	);
};

/**
 * The characters of text taken from a page, as `fromDocument` gives them, with
 * the offset in the text each one starts at, for an edit at the bytes it came from.
 * @param {string} text the text
 * @param {DocumentEncoding} encoding the page's encoding
 * @returns {{ text: string, map: number[] | undefined }} the characters, and their offsets when any moved
 */
const fromDocumentWithMap = (text, encoding) => {
	if (encoding.startsWith("utf-16") || !needsDecoding(text, encoding)) {
		return { text, map: undefined };
	}
	const decoder = new TextDecoder(encoding);
	let result = "";
	/** @type {number[]} */
	const map = [];
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		// a character a step put there is kept, as `fromDocument` keeps it
		const chars =
			code > 0xff
				? decoder.decode() + text[i]
				: decoder.decode(Buffer.from([code]), { stream: true });
		for (let j = 0; j < chars.length; j++) map.push(start);
		result += chars;
		if (chars.length > 0) start = i + 1;
	}
	const rest = decoder.decode();
	for (let j = 0; j < rest.length; j++) map.push(start);
	result += rest;
	map.push(text.length);
	return { text: result, map };
};

/**
 * Characters put into a page (see `decodeDocument`): each one the encoding holds
 * as its bytes, any other escaped for where it goes.
 * @param {string} text the characters
 * @param {DocumentEncoding} encoding the page's encoding
 * @param {(codePoint: number) => string} escape escapes a character the encoding lacks
 * @returns {string} the text
 */
const toDocument = (text, encoding, escape) => {
	if (encoding.startsWith("utf-16") || !NON_ASCII_REGEXP.test(text)) {
		return text;
	}
	const encoder = getEncoder(encoding);
	let result = "";
	for (const char of text) {
		const code = /** @type {number} */ (char.codePointAt(0));
		if (code < 0x80) {
			result += char;
			continue;
		}
		const bytes = encoder.get(char);
		result += bytes === undefined ? escape(code) : bytes;
	}
	return result;
};

/**
 * Where a node of a parse is, in the script's offsets.
 * @typedef {{ start: number, end: number }} Range
 */

/** @typedef {TaggedTemplateExpression & Range} RangedTemplate */

/**
 * What of a script a character the page's encoding lacks needs more than a `\u` escape for.
 * @typedef {object} ScriptRanges
 * @property {[number, number][]} identifiers where identifiers are, as an astral character is one `\u{...}` escape there
 * @property {[number, number][]} literals where strings, regular expressions and template texts are, as a line separator ends a line elsewhere
 * @property {RangedTemplate[]} templates the tagged templates whose raw text holds such a character
 * @property {number} prologueEnd where the directives at the script's start end
 */

/**
 * Finds where a script needs more than a `\u` escape for a character `lacks` tells.
 * @param {string} code the script
 * @param {(char: string) => boolean} lacks whether the page's encoding lacks a character
 * @returns {ScriptRanges | undefined} the ranges, or undefined when the script does not parse
 */
const getScriptRanges = (code, lacks) => {
	const { parseProgram, takeParsedTree, toEstreeObject } =
		getJavascriptSyntaxParser();
	/** @type {number | undefined} */
	let program;
	for (const sourceType of /** @type {const} */ (["script", "module"])) {
		try {
			program = parseProgram(code, 0, { sourceType });
			break;
		} catch (_err) {
			// a module's syntax is no script's
		}
	}
	if (program === undefined) return;
	/** @type {ScriptRanges} */
	const ranges = {
		identifiers: [],
		literals: [],
		templates: [],
		prologueEnd: 0
	};
	const root = /** @type {Program & Range} */ (
		toEstreeObject(program, { ranges: true })
	);
	for (const statement of root.body) {
		if (!("directive" in statement)) break;
		ranges.prologueEnd = /** @type {typeof statement & Range} */ (
			statement
		).end;
	}
	/**
	 * Collects the ranges below a node.
	 * @param {Node | Node[] | string | number | boolean | RegExp | null | undefined} value a node, a list of them or a field's value
	 * @returns {void}
	 */
	const walk = (value) => {
		if (Array.isArray(value)) {
			for (const item of value) walk(item);
			return;
		}
		if (typeof value !== "object" || value === null) return;
		const node = /** @type {Node & Range} */ (value);
		if (typeof node.type !== "string") return;
		if (node.type === "Identifier" || node.type === "PrivateIdentifier") {
			ranges.identifiers.push([node.start, node.end]);
			return;
		}
		if (node.type === "Literal" || node.type === "TemplateElement") {
			ranges.literals.push([node.start, node.end]);
			return;
		}
		if (
			node.type === "TaggedTemplateExpression" &&
			node.quasi.quasis.some((quasi) => [...quasi.value.raw].some(lacks))
		) {
			ranges.templates.push(node);
		}
		// a field that holds no node is skipped by the checks above
		for (const child of /** @type {(Node | Node[] | null)[]} */ (
			Object.values(node)
		)) {
			walk(child);
		}
	};
	walk(root);
	/** @type {import("../javascript/syntax-parser").SyntaxTree} */ (
		takeParsedTree()
	).release();
	ranges.identifiers.sort((a, b) => a[0] - b[0]);
	ranges.literals.sort((a, b) => a[0] - b[0]);
	ranges.templates.sort((a, b) => a.start - b.start);
	return ranges;
};

/**
 * A short hash of a script, so the names a rewrite declares differ between scripts.
 * @param {string} code the script
 * @returns {string} the hash
 */
const hashScript = (code) => {
	let hash = 0x811c9dc5;
	for (let i = 0; i < code.length; i++) {
		hash = Math.imul(hash ^ code.charCodeAt(i), 0x01000193);
	}
	return (hash >>> 0).toString(36);
};

/**
 * A script put into a page: each character the encoding holds as its bytes, any
 * other escaped. A tagged template whose raw text holds one becomes a call with
 * its strings, as no escape keeps that text; its strings stay the same each call.
 * @param {string} code the script
 * @param {DocumentEncoding} encoding the page's encoding
 * @param {string=} occurrence which of the page's scripts it is, as names it declares must differ between them
 * @returns {string} the script
 */
const scriptToDocument = (code, encoding, occurrence = "") => {
	if (encoding.startsWith("utf-16") || !NON_ASCII_REGEXP.test(code)) {
		return code;
	}
	const encoder = getEncoder(encoding);
	/**
	 * Whether the encoding lacks a character.
	 * @param {string} char the character
	 * @returns {boolean} true, when it is escaped
	 */
	const lacks = (char) =>
		/** @type {number} */ (char.codePointAt(0)) >= 0x80 && !encoder.has(char);
	let lacking = false;
	for (const char of code) {
		if (lacks(char)) {
			lacking = true;
			break;
		}
	}
	const ranges = lacking ? getScriptRanges(code, lacks) : undefined;
	// a script webpack cannot parse is escaped as it is
	if (ranges === undefined) {
		return toDocument(code, encoding, escapeJsCodePoint);
	}
	const { identifiers, literals, templates, prologueEnd } = ranges;
	// a script on the page twice keeps the template objects of each apart
	const prefix = `__webpack_template_${hashScript(`${occurrence}\0${code}`)}_`;
	const intrinsic = `${prefix}object__`;
	let identifierIndex = 0;
	let literalIndex = 0;
	let templateIndex = 0;
	// how many tagged templates became calls, each with a name its strings are kept in
	let declared = 0;
	/**
	 * Writes a range of the script with its characters for the page.
	 * @param {number} start where the range starts
	 * @param {number} end where it ends
	 * @returns {string} the text
	 */
	const write = (start, end) => {
		let result = "";
		let i = start;
		while (i < end) {
			const template = templates[templateIndex];
			const templateStart = template === undefined ? -1 : template.start;
			if (templateStart === i) {
				templateIndex++;
				result += writeTemplate(template);
				i = template.end;
				continue;
			}
			const code32 = /** @type {number} */ (code.codePointAt(i));
			const char = String.fromCodePoint(code32);
			i += char.length;
			if (code32 < 0x80) {
				result += char;
				continue;
			}
			const bytes = encoder.get(char);
			if (bytes !== undefined) {
				result += bytes;
				continue;
			}
			while (
				identifierIndex < identifiers.length &&
				identifiers[identifierIndex][1] <= i - char.length
			) {
				identifierIndex++;
			}
			const identifier = identifiers[identifierIndex];
			// a surrogate pair is no identifier's character, so an astral one is one escape
			if (identifier !== undefined && identifier[0] < i && code32 > 0xffff) {
				result += `\\u{${code32.toString(16)}}`;
				continue;
			}
			if (code32 === 0x2028 || code32 === 0x2029) {
				while (
					literalIndex < literals.length &&
					literals[literalIndex][1] <= i - char.length
				) {
					literalIndex++;
				}
				const literal = literals[literalIndex];
				// outside a literal it ends a line, as of a comment or a `#!` line
				if (literal === undefined || literal[0] >= i) {
					result += "\n";
					continue;
				}
			}
			let backslashes = 0;
			while (code[i - char.length - 1 - backslashes] === "\\") backslashes++;
			if (backslashes % 2 === 1) {
				// the backslash only escaped the character, or continued the line
				result = result.slice(0, -1);
				if (code32 === 0x2028 || code32 === 0x2029) continue;
			}
			result += escapeJsCodePoint(code32);
		}
		return result;
	};
	/**
	 * Writes a tagged template as a call, its strings made once.
	 * @param {RangedTemplate} template the template
	 * @returns {string} the call
	 */
	const writeTemplate = (template) => {
		const tag = /** @type {typeof template.tag & Range} */ (template.tag);
		const { quasis, expressions } = template.quasi;
		/**
		 * A list of strings, for the page.
		 * @param {(string | null | undefined)[]} values the strings, `undefined` for a cooked string an invalid escape has none of
		 * @returns {string} the array
		 */
		const list = (values) =>
			`[${values
				.map((value) =>
					typeof value === "string"
						? toDocument(
								// a `<` could end the script, as in a cooked `\x3c/script>`
								JSON.stringify(value).replace(/</g, "\\u003c"),
								encoding,
								escapeJsCodePoint
							)
						: "void 0"
				)
				.join(", ")}]`;
		const cache = `${prefix}${declared++}__`;
		// the script's own `Object` may not be the global one
		const strings = `${cache} || (${cache} = ${intrinsic}.freeze(${intrinsic}.defineProperty(${list(
			quasis.map((quasi) => quasi.value.cooked)
		)}, "raw", { value: ${intrinsic}.freeze(${list(
			quasis.map((quasi) => quasi.value.raw)
		)}) })))`;
		const callee = write(tag.start, tag.end);
		let args = `(${strings})`;
		for (const expression of expressions) {
			const range = /** @type {typeof expression & Range} */ (expression);
			// a sequence is one substitution, so it keeps its parentheses
			args += `, (${write(range.start, range.end)})`;
		}
		return `((${callee})(${args}))`;
	};
	// the names go after the directives, or after a `#!` line, which must stay first
	let insertAt = prologueEnd;
	if (insertAt === 0 && code.startsWith("#!")) {
		const lineEnd = code.search(/[\n\r\u2028\u2029]/);
		insertAt =
			lineEnd === -1
				? code.length
				: lineEnd + (code.startsWith("\r\n", lineEnd) ? 2 : 1);
	}
	const prologue = write(0, insertAt);
	const body = write(insertAt, code.length);
	if (declared === 0) return prologue + body;
	const names = Array.from({ length: declared }, (_, i) => `${prefix}${i}__`);
	// read without the name `Object`, which the script may declare itself
	names.push(`${intrinsic} = ({}).constructor`);
	return `${prologue}${prologueEnd > 0 ? ";" : ""}var ${names.join(", ")};${body}`;
};

/**
 * The bytes of a page's text in its own encoding (see `decodeDocument`).
 * @param {string} text the text
 * @param {DocumentEncoding} encoding the page's encoding
 * @returns {Buffer} the bytes
 */
const encodeDocument = (text, encoding) => {
	if (encoding === "utf-16le") {
		return Buffer.concat([
			Buffer.from([0xff, 0xfe]),
			Buffer.from(text, "utf16le")
		]);
	}
	if (encoding === "utf-16be") {
		return Buffer.concat([
			Buffer.from([0xfe, 0xff]),
			Buffer.from(text, "utf16le").swap16()
		]);
	}
	// a character above U+00FF is one a step put there, so not one of the bytes
	return Buffer.from(
		text.replace(WIDE_RUN_REGEXP, (run) =>
			toDocument(run, encoding, escapeHtmlCodePoint)
		),
		"latin1"
	);
};

/**
 * Characters a step puts into a page module, in the page's encoding.
 * @param {Module} page the page module
 * @param {string} text the characters
 * @param {(codePoint: number) => string} escape escapes a character the encoding lacks
 * @returns {string} the text
 */
const toPage = (page, text, escape) => {
	const { encoding } = /** @type {HtmlModuleBuildInfo} */ (page.buildInfo);
	return encoding === undefined ? text : toDocument(text, encoding, escape);
};

module.exports.decodeDocument = decodeDocument;
module.exports.encodeDocument = encodeDocument;
module.exports.escapeCssCodePoint = escapeCssCodePoint;
module.exports.escapeHtmlCodePoint = escapeHtmlCodePoint;
module.exports.escapeJsCodePoint = escapeJsCodePoint;
module.exports.fromDocument = fromDocument;
module.exports.fromDocumentWithMap = fromDocumentWithMap;
module.exports.getDocumentEncoding = getDocumentEncoding;
module.exports.scriptToDocument = scriptToDocument;
module.exports.toDocument = toDocument;
module.exports.toPage = toPage;
