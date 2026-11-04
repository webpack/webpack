"use strict";

const { invariantFindings } = require("../../helpers/syntaxInvariants");
const syntax = require("../../helpers/syntaxInvariants/xml");

// Every source is held to spans, slices, purity, idempotence under each preset,
// respelling and its cut-short copies; agreement with other parsers is the
// comparison scripts' own question.
/** @type {[string, string][]} */
const SOURCES = [
	["a document", "<?xml version=\"1.0\"?><root a=\"1\"><child>text</child><!-- c --><empty/></root>"]
];

describe("XML syntax — invariants", () => {
	it("holds every relation over its sources", () => {
		expect(invariantFindings(syntax, SOURCES)).toEqual([]);
	});
});
