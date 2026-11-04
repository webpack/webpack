"use strict";

const { invariantFindings } = require("../../helpers/syntaxInvariants");
const syntax = require("../../helpers/syntaxInvariants/html");

// Every source is held to spans, slices, purity, idempotence under each preset,
// respelling and its cut-short copies; agreement with other parsers is the
// comparison scripts' own question.
/** @type {[string, string][]} */
const SOURCES = [
	["a document", "<!doctype html><html><head><title>x</title><style>a{color:red}</style></head><body><p class=\"a  b\">Hi <b>there</b></p><script>let x = 1;</script></body></html>"]
];

describe("HTML syntax — invariants", () => {
	it("holds every relation over its sources", () => {
		expect(invariantFindings(syntax, SOURCES)).toEqual([]);
	});
});
