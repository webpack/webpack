// cspell:ignore mdash
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/html/syntax")} */
const htmlSyntax = require("../../../lib/html/syntax.js");

const { SourceProcessor } = htmlSyntax;

// Printing is the other half of `html-parser-document-unit`: the same walk, but
// every node also serializes. A node whose text is `open + children + close`
// emits its pieces as the walk reaches them; anything else is composed from its
// children's text and read back whole. Both paths are covered here, and so are
// the tree shapes they cost differently on — the piecemeal path carries one
// frame per open element, so fan-out and depth are separate axes.
//
// Every fixture runs twice: `walk` is what a build that is not minimizing pays
// — parse and walk, no output — and `minify` is the same pass with the printer
// on. No visitors are registered, so `walk` is the floor both share and the
// difference is what printing costs on that shape, which neither number shows
// alone. Visitor cost itself is `html-parser-document-unit`'s.

// No large real-world HTML ships in the repo, so generate a deterministic
// document mixing tree construction, entity references, comments, lists/tables
// and RAWTEXT (<script>/<style>) elements.
/**
 * @param {number} blocks number of repeated sections
 * @returns {string} generated HTML document
 */
function makeHtml(blocks) {
	let out =
		"<!DOCTYPE html><html><head><title>Benchmark &amp; Co</title>" +
		"<style>.a{color:red;background:url(x.png)}</style></head><body>";
	for (let i = 0; i < blocks; i++) {
		out +=
			`<section class="c-${i}" id="i-${i}" data-x="${i}" hidden>` +
			`<h2>Heading ${i} &mdash; &#8212;</h2>` +
			`<p>Paragraph ${i} with <a href="/l/${i}?q=1&amp;r=2">a link</a> and <b>bold</b>.</p>` +
			`<!-- comment ${i} -->` +
			"<ul><li>one</li><li>two</li><li>three</li></ul>" +
			"<table><tr><td>a</td><td>b</td></tr></table>" +
			`<script>var x = ${i}; if (x < 2) { x++; }</script>` +
			"</section>\n";
	}
	return `${out}</body></html>`;
}

// One axis each. `wide table` and `nested lists` are wide with a shallow
// repeating nest, `flat siblings` is one long sibling run at depth 1, `deep
// nesting` is a narrow 20-deep spine — together they separate the per-sibling
// cost from the per-frame one.
/** @type {[string, string, { fragmentContext?: string }][]} name, source, extra process options */
const FIXTURES = [
	["document", makeHtml(2000), {}],
	// The context element seeds the tokenizer content mode.
	[
		"fragment, tr context",
		'<td class="c">cell <b>one</b> &amp; two</td>'.repeat(6000),
		{ fragmentContext: "tr" }
	],
	[
		"wide table",
		(() => {
			let s = "<table>";
			for (let i = 0; i < 8000; i++) {
				s += `<tr><td class=c${i}>cell ${i}</td><td>${i}</td></tr>`;
			}
			return `${s}</table>`;
		})(),
		{}
	],
	[
		"flat siblings",
		(() => {
			let s = "";
			for (let i = 0; i < 8000; i++) s += `<p class=c${i}>text ${i}</p>`;
			return s;
		})(),
		{}
	],
	[
		"nested lists",
		(() => {
			let s = "";
			for (let i = 0; i < 800; i++) {
				s += `<ul id=u${i}>`;
				for (let j = 0; j < 10; j++) {
					s += `<li><a href=/p${j}>item ${j}</a></li>`;
				}
				s += "</ul>";
			}
			return s;
		})(),
		{}
	],
	[
		"deep nesting",
		(() => {
			let s = "";
			for (let i = 0; i < 800; i++) {
				for (let j = 0; j < 20; j++) s += `<div class=l${j}>`;
				s += `<span>leaf ${i}</span>`;
				for (let j = 0; j < 20; j++) s += "</div>";
			}
			return s;
		})(),
		{}
	],
	// Elements that cannot print in pieces, so their subtrees are composed and
	// read back: a `<pre>` / `<textarea>` leading newline only survives
	// re-parsing once the children's text is in, and a `<template>` holds its
	// children in a content fragment rather than the child chain.
	[
		"composed subtrees",
		(() => {
			let s = "";
			for (let i = 0; i < 2000; i++) {
				s += `<div><pre>\n\nkeep ${i}</pre><textarea>\n\nt ${i}</textarea><template><p>x${i}</p></template></div>`;
			}
			return s;
		})(),
		{}
	],
	// An omitted `<html>` / `<body>` start tag, held back until the first thing
	// inside it decides whether it materializes (it does here — the text is
	// whitespace the insertion modes would otherwise drop).
	[
		"implied start tags",
		(() => {
			let s = " ";
			for (let i = 0; i < 4000; i++) s += `<p>t${i}<b>b${i}</b>`;
			return s;
		})(),
		{}
	]
];

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	for (const [name, source, options] of FIXTURES) {
		bench.add(
			`unit benchmark "html-printer-document-unit", walk (${name})`,
			() => {
				new SourceProcessor().process(source, options);
			}
		);
		bench.add(
			`unit benchmark "html-printer-document-unit", minify (${name})`,
			() => {
				new SourceProcessor().process(source, { ...options, minimize: true });
			}
		);
	}
};
