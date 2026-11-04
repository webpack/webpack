"use strict";

const { invariantFindings } = require("../../helpers/syntaxInvariants");
const syntax = require("../../helpers/syntaxInvariants/css");

// Every source is held to spans, slices, purity, idempotence under each preset,
// respelling and its cut-short copies; agreement with other parsers is the
// comparison scripts' own question.
/** @type {[string, string][]} */
const SOURCES = [
	["rules, a list and a condition", "a{color:red}.b,.c{margin:0 auto}@media (min-width:1px){.d{top:0}}"],
	["four `@media` blocks joined", "@media print{.a{color:red}.b{color:blue}}@media print{.a{color:blue}.b{color:blue}}@media print{.a{color:red}.b{color:blue}}@media print{.a{color:blue}.b{color:blue}}"],
	["two identifiers a comment parts after a hex escape", "a{b:\\40/**/x}"],
	["a nested selector ending on a lone `\\`", "a{b\\\n{color:red}}c{color:blue}"]
];

describe("CSS syntax — invariants", () => {
	it("holds every relation over its sources", () => {
		expect(invariantFindings(syntax, SOURCES)).toEqual([]);
	});
});
