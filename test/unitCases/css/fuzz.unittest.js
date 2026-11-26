// cspell:ignore mportant olor importanta mportanta importantaa mportantaa colora olora

"use strict";

const { fuzzSyntax } = require("../../helpers/syntaxFuzz");
const syntax = require("../../helpers/syntaxInvariants/css");

/**
 * Pieces a generated stylesheet is joined from: enough of the grammar that a
 * random sequence often parses, and the rest exercises error recovery.
 */
const PIECES = [
	"a",
	"b",
	".c",
	"#d",
	"{",
	"}",
	":",
	";",
	" ",
	"\n",
	"color",
	"red",
	"0",
	"1px",
	"-",
	"+",
	"(",
	")",
	"@media",
	"@import",
	"url(",
	'"x"',
	"'",
	"/*",
	"*/",
	"!important",
	",",
	">",
	"~",
	"[",
	"]",
	"=",
	"calc(",
	"var(--x)",
	"--x",
	"\\",
	"%",
	"e3",
	"&",
	"|",
	"*"
];

/**
 * Each identifier a generated block holds alone, as the escape respelling
 * writes it: neither a declaration nor a rule, so an engine drops it, and the
 * printer writes it back as authored (`NodeType.Raw`), escape included.
 * @type {[string, string][]}
 */
const BARE_IDENTIFIERS = [
	["a", "\\61"],
	["important", "\\69 mportant"],
	["b", "\\62"],
	["--x", "--\\78"],
	["color", "\\63 olor"],
	["aa", "\\61 a"],
	["ab", "\\61 b"],
	["c", "\\63"],
	["a\\", "\\61 \\"],
	["aaa", "\\61 aa"],
	["a\\a", "\\61 \\a"],
	["a\\*", "\\61 \\*"],
	["a\\>", "\\61 \\>"],
	["importanta", "\\69 mportanta"],
	["important\\", "\\69 mportant\\"],
	["importantaa", "\\69 mportantaa"],
	["important\\a", "\\69 mportant\\a"],
	["important\\*", "\\69 mportant\\*"],
	["important\\>", "\\69 mportant\\>"],
	["a-", "\\61 -"],
	["colora", "\\63 olora"],
	["color-", "\\63 olor-"],
	["red", "\\72 ed"]
];

describe("CSS syntax fuzzing", () => {
	it("holds its invariants on generated stylesheets", () => {
		fuzzSyntax(syntax, PIECES, {
			known: BARE_IDENTIFIERS.map(([written, respelled]) => ({
				relation: "respelling escape",
				contains: `    ${written}\n      -> ${respelled}`,
				presets: ["default"],
				why: "input both productions reject is printed as authored, as fixtures/css/css-syntax-minify-keeps-input-the-grammar-rejects-keeps-a-bare-identifier-in-an-unclosed-block files"
			}))
		});
	});
});
