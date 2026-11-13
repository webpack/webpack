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

/**
 * Rewrites a script's characters above U+00FF: comments get an ASCII spelling
 * (or `U+XXXX`), code gets `\u` escapes, which read back as the same value.
 * @param {string} source the script's source
 * @returns {string} the source with every character at most U+00FF
 */
const toLatin1Source = (source) => {
	if (!ABOVE_LATIN1_REGEXP.test(source)) return source;

	const { parse } = require("acorn");

	/** @type {[number, number][]} */
	const comments = [];
	parse(source, {
		ecmaVersion: "latest",
		sourceType: "script",
		allowHashBang: true,
		allowReturnOutsideFunction: true,
		onComment: (block, text, start, end) => {
			comments.push([start, end]);
		}
	});
	let result = "";
	let comment = 0;
	for (let i = 0; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code <= 0xff) {
			result += source[i];
			continue;
		}
		while (comment < comments.length && comments[comment][1] <= i) comment++;
		if (comment < comments.length && comments[comment][0] <= i) {
			const codePoint = /** @type {number} */ (source.codePointAt(i));
			const spelling = COMMENT_SPELLINGS[source[i]];
			result += spelling !== undefined ? spelling : `U+${hexOf(codePoint)}`;
			if (codePoint > 0xffff) i++;
		} else {
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
