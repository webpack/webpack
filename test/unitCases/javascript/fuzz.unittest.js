"use strict";

const fc = require("fast-check");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const syntax = require("../../helpers/syntaxInvariants/javascript");

/**
 * Pieces a generated source is joined from: enough of the grammar that a
 * random sequence often parses, and the rest exercises error recovery.
 */
const PIECES = [
	"a",
	"b",
	"1",
	"0x1",
	"1n",
	".5",
	'"s"',
	"'t'",
	"`x$" + "{a}`",
	" ",
	"\n",
	";",
	",",
	"(",
	")",
	"{",
	"}",
	"[",
	"]",
	"=",
	"==",
	"===",
	"+",
	"-",
	"++",
	"--",
	"*",
	"/",
	"/x/g",
	"%",
	"**",
	"!",
	"?",
	":",
	"?.",
	"??",
	"&&",
	"||",
	"=>",
	"...",
	"let",
	"const",
	"var",
	"function",
	"return",
	"if",
	"else",
	"for",
	"of",
	"in",
	"while",
	"new",
	"class",
	"extends",
	"async",
	"await",
	"yield",
	"typeof",
	"delete",
	"void",
	"this",
	"null",
	"undefined",
	"true",
	"import",
	"export",
	"default",
	"//c\n",
	"/*c*/",
	"a.b",
	"#p",
	"static",
	"get",
	"set"
];

describe("JavaScript syntax fuzzing", () => {
	it("holds its invariants on generated sources", () => {
		// A fixed seed keeps CI deterministic; raise `numRuns` or change the
		// seed locally to search further.
		fc.assert(
			fc.property(
				fc
					.array(fc.constantFrom(...PIECES), { maxLength: 32 })
					.map((pieces) => pieces.join("")),
				(source) => {
					expect(invariantFindings(syntax, [["fuzz", source]])).toEqual([]);
				}
			),
			{ seed: 7, numRuns: 1000 }
		);
	});
});
