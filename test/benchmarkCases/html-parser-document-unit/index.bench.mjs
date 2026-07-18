import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/html/syntax")} */
const htmlSyntax = require("../../../lib/html/syntax.js");
const { SourceProcessor, NodeType, parseHtml, tokenize } = htmlSyntax;

// No large real-world HTML ships in the repo, so generate a deterministic
// ~1.6 MiB document that exercises tree construction, attributes with entity
// references, comments, lists/tables and RAWTEXT (<script>/<style>) elements.
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
const html = makeHtml(7000);

// Big table-body fragment (tr context seeds the tokenizer content mode).
const FRAGMENT = `${'<td class="c">cell <b>one</b> &amp; two</td>'.repeat(6000)}`;

const NOOP = () => {};
// tokenize callbacks steer the cursor via their return value; the emit callbacks
// resume at the token end (the tokenizer's own default). `attribute` is left
// unset so the tokenizer uses its built-in advance.
const RET_END = (
	/** @type {string} */ _input,
	/** @type {number} */ _start,
	/** @type {number} */ end
) => end;

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	// Whole-document parse — the main entry (HTML analog of JavascriptParser.parse).
	bench.add('unit benchmark "html-parser-document-unit", parseHtml', () => {
		parseHtml(html);
	});

	// Big fragment parse — the context element seeds the tokenizer content mode.
	bench.add(
		'unit benchmark "html-parser-document-unit", parseHtml (fragment, tr context)',
		() => {
			parseHtml(FRAGMENT, 0, { fragmentContext: "tr" });
		}
	);

	// AST-skip fast path (drop text nodes).
	bench.add(
		'unit benchmark "html-parser-document-unit", parseHtml (skip text)',
		() => {
			parseHtml(html, 0, { skip: { text: true } });
		}
	);

	// Grammar: parse + visitor walk (SourceProcessor).
	bench.add(
		'unit benchmark "html-parser-document-unit", process (no visitors)',
		() => {
			new SourceProcessor().use({}).process(html);
		}
	);
	bench.add(
		'unit benchmark "html-parser-document-unit", process (Element+Comment visitors)',
		() => {
			new SourceProcessor()
				.use({ [NodeType.Element]: NOOP, [NodeType.Comment]: NOOP })
				.process(html);
		}
	);

	// Tokenizer throughput (push interface).
	bench.add('unit benchmark "html-parser-document-unit", tokenize', () => {
		tokenize(html, 0, {
			openTag: RET_END,
			closeTag: RET_END,
			text: RET_END,
			comment: RET_END,
			doctype: RET_END
		});
	});
};
