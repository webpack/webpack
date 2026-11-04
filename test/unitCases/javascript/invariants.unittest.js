"use strict";

const { invariantFindings } = require("../../helpers/syntaxInvariants");
const syntax = require("../../helpers/syntaxInvariants/javascript");

// Every source is held to spans, slices, purity, idempotence under each preset,
// respelling and its cut-short copies; agreement with other parsers is the
// comparison scripts' own question.
/** @type {[string, string][]} */
const SOURCES = [
	["a module", "const a = 1;\nfunction f(b) {\n\treturn a + b;\n}\nexport default f;\n"],
	["a script", "var x = { a: 1, \"b\": [2, 3] };\nif (x.a) console.log(x.b);\n"]
];

describe("JavaScript syntax — invariants", () => {
	it("holds every relation over its sources", () => {
		expect(invariantFindings(syntax, SOURCES)).toEqual([]);
	});
});
