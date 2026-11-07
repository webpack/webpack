"use strict";

const { fixture } = require("../../helpers/fixture");

const { invariantFindings } = require("../../helpers/syntaxInvariants");
const syntax = require("../../helpers/syntaxInvariants/javascript");

// Every source is held to spans, slices, purity, idempotence under each preset,
// respelling and its cut-short copies; agreement with other parsers is the
// comparison scripts' own question.
/** @type {[string, string][]} */
const SOURCES = [
	["a module", fixture("javascript", "javascript-syntax-invariants-holds-every-relation-over-its-sources")],
	["a script", fixture("javascript", "javascript-syntax-invariants-holds-every-relation-over-its-sources-2")]
];

describe("JavaScript syntax — invariants", () => {
	it("holds every relation over its sources", () => {
		expect(invariantFindings(syntax, SOURCES)).toEqual([]);
	});
});
