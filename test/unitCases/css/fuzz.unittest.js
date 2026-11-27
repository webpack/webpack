"use strict";

const webpack = require("webpack");
const { fuzzSyntax } = require("../../helpers/syntaxFuzz");
const syntax = require("../../helpers/syntaxInvariants/css");

const { SourceProcessor, parser } = webpack.css.syntax;

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
 * Whether printing a stylesheet keeps input both productions reject as a
 * `NodeType.Raw` node, which exists only while printing.
 * @param {string} source a generated stylesheet
 * @returns {boolean} whether it holds one
 */
const holdsRaw = (source) => {
	let raw = false;
	new SourceProcessor()
		.use({
			[parser.NodeType.Raw]: {
				enter: () => {
					raw = true;
				},
				exit: () => {}
			}
		})
		.process(source, { mode: "minify" });
	return raw;
};

describe("CSS syntax fuzzing", () => {
	it("holds its invariants on generated stylesheets", () => {
		fuzzSyntax(syntax, PIECES, {
			known: [
				{
					relation: "respelling escape",
					// Every escape respelling writes a `\`; the source decides the rest.
					contains: "\\",
					presets: ["default"],
					when: holdsRaw,
					why: "input both productions reject is kept as a `NodeType.Raw` node and printed as authored, escape included (lib/css/syntax-parser.js:3517-3522), as the fixtures/css/css-syntax-minify-keeps-input-the-grammar-rejects-* fixtures file; this skips escape respellings for a whole source holding a Raw node, and a source without one stays fully checked"
				}
			]
		});
	});
});
