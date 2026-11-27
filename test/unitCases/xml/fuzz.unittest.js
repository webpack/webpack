"use strict";

const { fuzzSyntax } = require("../../helpers/syntaxFuzz");
const syntax = require("../../helpers/syntaxInvariants/xml");

/**
 * Pieces a generated document is joined from: enough of the grammar that a
 * random sequence often parses, and the rest exercises error recovery.
 */
const PIECES = [
	"<a>",
	"</a>",
	"<b/>",
	'<c x="1">',
	"</c>",
	'<?xml version="1.0"?>',
	"<!--",
	"-->",
	"<![CDATA[",
	"]]>",
	"text",
	" ",
	"\n",
	"&amp;",
	"&#x41;",
	"&",
	"<",
	">",
	'"',
	"=",
	'<svg xmlns="http://www.w3.org/2000/svg">',
	"</svg>",
	'<path d="M0 0L1 1"/>',
	"<g>",
	"</g>",
	'<rect width="1"/>',
	"<!DOCTYPE a>",
	"<?pi x?>"
];

describe("XML syntax fuzzing", () => {
	it("holds its invariants on generated documents", () => {
		fuzzSyntax(syntax, PIECES);
	});
});
