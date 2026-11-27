"use strict";

const { fuzzSyntax } = require("../../helpers/syntaxFuzz");
const syntax = require("../../helpers/syntaxInvariants/html");

/**
 * Pieces a generated document is joined from: tags whose insertion modes and
 * raw-text states interact, and the characters that end or escape them.
 */
const PIECES = [
	"<p>",
	"</p>",
	"<b>",
	"</b>",
	'<div class="x">',
	"</div>",
	"<br>",
	"<!--",
	"-->",
	"<script>",
	"</script>",
	"<style>",
	"</style>",
	"a",
	" ",
	"\n",
	"&amp;",
	"&",
	"<",
	">",
	'"',
	"'",
	"=",
	"<img src=x>",
	"<table>",
	"<td>",
	"<tr>",
	"<!DOCTYPE html>",
	"<svg>",
	"</svg>",
	"<template>",
	"</template>",
	"<pre>",
	"</pre>",
	"<textarea>",
	"</textarea>"
];

describe("HTML syntax fuzzing", () => {
	it("holds its invariants on generated documents", () => {
		fuzzSyntax(syntax, PIECES);
	});
});
