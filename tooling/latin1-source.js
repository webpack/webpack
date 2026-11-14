/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Keeps `lib/` and `hot/` sources free of characters above U+00FF. V8 holds
// every loaded script's source, and one such character makes it a two-byte
// string: twice the memory for the whole file, for as long as the process runs.
//
//   node tooling/latin1-source.js          # fail listing offending files
//   node tooling/latin1-source.js --write  # rewrite them

const fs = require("fs");
const path = require("path");

const ABOVE_LATIN1_REGEXP = /[^\0-\u00FF]/;

/** @type {Record<string, string>} */
const COMMENT_SPELLINGS = {
	"—": "-",
	"–": "-",
	"−": "-",
	"…": "...",
	"→": "->",
	"←": "<-",
	"↔": "<->",
	"⇒": "=>",
	"⇔": "<=>",
	"‘": "'",
	"’": "'",
	"“": '"',
	"”": '"',
	"≤": "<=",
	"≥": ">=",
	"≠": "!=",
	"≈": "~",
	"•": "-"
};

/**
 * @param {number} code a UTF-16 code unit or a code point
 * @returns {string} its hexadecimal digits, at least four, uppercase
 */
const hexOf = (code) => code.toString(16).toUpperCase().padStart(4, "0");

// labels of the tokens after which a backtick opens a tagged template: what
// can end an expression; a block's `}` too, as refusing is the safe mistake
const TAG_ENDS = new Set([
	"name",
	"string",
	"num",
	"regexp",
	")",
	"]",
	"}",
	"`",
	"this",
	"super",
	"null",
	"true",
	"false"
]);

/**
 * The source ranges of every tagged template's text, whose raw spelling the
 * tag reads, so a `\u` escape would change what it gets.
 * @param {import("acorn").Token[]} tokens the script's tokens, in source order
 * @returns {[number, number][]} the ranges, in source order
 */
const taggedTemplateText = (tokens) => {
	/** @type {[number, number][]} */
	const ranges = [];
	// what each open `{`, `${` and template is, innermost last: a template
	// entry records whether it is tagged
	/** @type {("{" | "tagged" | "untagged")[]} */
	const open = [];
	for (let i = 0; i < tokens.length; i++) {
		const { label } = tokens[i].type;
		const top = open.length > 0 ? open[open.length - 1] : undefined;
		if (label === "`") {
			if (top === "tagged" || top === "untagged") {
				open.pop();
			} else {
				const previous = i > 0 ? tokens[i - 1].type.label : "";
				open.push(TAG_ENDS.has(previous) ? "tagged" : "untagged");
			}
		} else if (label === "template" || label === "invalidTemplate") {
			if (top === "tagged") ranges.push([tokens[i].start, tokens[i].end]);
		} else if (label === "{" || label === "${") {
			open.push("{");
		} else if (label === "}" && top === "{") {
			open.pop();
		}
	}
	return ranges;
};

/**
 * @param {[number, number][]} ranges ranges in source order
 * @param {number} position a position
 * @returns {boolean} whether one of the ranges holds the position
 */
const inRange = (ranges, position) => {
	let low = 0;
	let high = ranges.length - 1;
	while (low <= high) {
		const middle = (low + high) >> 1;
		const [start, end] = ranges[middle];
		if (position < start) high = middle - 1;
		else if (position >= end) low = middle + 1;
		else return true;
	}
	return false;
};

/**
 * Rewrites a script's characters above U+00FF: comments get an ASCII spelling
 * (or `U+XXXX`), tokens `\u` escapes, which read back as the same value.
 * Whitespace between tokens becomes a space, a line separator a newline.
 * @param {string} source the script's source
 * @returns {string} the source with every character at most U+00FF
 */
const toLatin1Source = (source) => {
	if (!ABOVE_LATIN1_REGEXP.test(source)) return source;

	const { parse } = require("acorn");

	/** @type {[number, number][]} */
	const comments = [];
	/** @type {import("acorn").Token[]} */
	const tokens = [];
	parse(source, {
		ecmaVersion: "latest",
		sourceType: "script",
		allowHashBang: true,
		allowReturnOutsideFunction: true,
		onComment: (block, text, start, end) => {
			comments.push([start, end]);
		},
		onToken: tokens
	});
	/** @type {[number, number][]} */
	const tokenRanges = tokens.map((token) => [token.start, token.end]);
	const taggedText = taggedTemplateText(tokens);
	let result = "";
	for (let i = 0; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code <= 0xff) {
			result += source[i];
			continue;
		}
		if (inRange(comments, i)) {
			const codePoint = /** @type {number} */ (source.codePointAt(i));
			const spelling = COMMENT_SPELLINGS[source[i]];
			result += spelling !== undefined ? spelling : `U+${hexOf(codePoint)}`;
			if (codePoint > 0xffff) i++;
		} else if (!inRange(tokenRanges, i)) {
			// whitespace or a line terminator between tokens, which no escape spells
			result += code === 0x2028 || code === 0x2029 ? "\n" : " ";
		} else {
			if (inRange(taggedText, i)) {
				throw new Error(
					`A character above U+00FF at ${i} is in a tagged template's text, whose tag reads it as written`
				);
			}
			let backslashes = 0;
			while (source[i - 1 - backslashes] === "\\") backslashes++;
			if (backslashes % 2 === 1) {
				throw new Error(
					`An escaped character above U+00FF at ${i} has no \\u spelling`
				);
			}
			result += `\\u${hexOf(code)}`;
		}
	}
	return result;
};

module.exports.toLatin1Source = toLatin1Source;

if (require.main === module) {
	const write = process.argv.includes("--write");
	const root = path.resolve(__dirname, "..");
	/** @type {string[]} */
	const offending = [];
	/**
	 * @param {string} directory a directory whose `.js` files are checked
	 * @returns {void}
	 */
	const visit = (directory) => {
		for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
			const file = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				visit(file);
			} else if (entry.name.endsWith(".js")) {
				const source = fs.readFileSync(file, "utf8");
				if (!ABOVE_LATIN1_REGEXP.test(source)) continue;
				offending.push(path.relative(root, file));
				if (write) fs.writeFileSync(file, toLatin1Source(source));
			}
		}
	};
	visit(path.join(root, "lib"));
	visit(path.join(root, "hot"));
	if (offending.length === 0) {
		console.log("lib/ and hot/ sources hold no character above U+00FF");
	} else if (write) {
		console.log(`Rewrote ${offending.length} files above U+00FF`);
	} else {
		console.error(
			`These files hold a character above U+00FF, which doubles their source's memory in V8; run \`node tooling/latin1-source.js --write\`:\n${offending.join(
				"\n"
			)}`
		);
		process.exitCode = 1;
	}
}
