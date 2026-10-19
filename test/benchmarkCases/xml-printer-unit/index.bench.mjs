// Printing is the other half of `xml-parser-unit`: the same walk, but every
// node also serializes, as XML. Every fixture runs in all three modes the
// processor has. `walk` is what a build that is not printing pays — parse and
// walk, no output; `minify` and `beautify` are the same pass with the printer
// on, the first dropping what re-parses the same and the second only
// re-serializing. So `minify - walk` is what printing costs on that shape and
// `minify - beautify` what the rewrites cost on top of serializing. Visitor
// cost is `xml-parser-unit`'s.

import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/html/syntax")} */
const htmlSyntax = require("../../../lib/html/syntax.js");

const { SourceProcessor } = htmlSyntax;

// No large real-world SVG ships in the repo, so generate a deterministic one
// with namespaced attributes, entity references, comments, CDATA and the
// shapes, groups and text an icon sheet or a chart is made of.
/**
 * @param {number} blocks number of repeated groups
 * @returns {string} generated SVG document
 */
function makeSvg(blocks) {
	let out =
		'<?xml version="1.0" encoding="UTF-8"?>' +
		'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1000 1000">' +
		"<defs><style><![CDATA[.a{fill:#ff0000;stroke:none}.b>text{font:12px sans-serif}]]></style>" +
		'<linearGradient id="g"><stop offset="0" stop-color="#000000"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>';
	for (let i = 0; i < blocks; i++) {
		out +=
			`<g id="g-${i}" class="b" transform="translate(${i % 100} ${i % 37})">` +
			`<!-- group ${i} -->` +
			`<path class="a" d="M ${i} 0 L ${
				i + 10
			} 10 C 20 20 , 30 30 , 40 ${i} Z"/>` +
			`<rect x="${i}" y="1" width="10" height="10" rx="2" fill="url(#g)"/>` +
			`<circle cx="${i}" cy="5" r="4" fill-opacity="0.50"/>` +
			`<text x="${i}" y="20">Label ${i} &amp; &lt;more&gt;</text>` +
			'<use xlink:href="#g-0"/>' +
			"</g>\n";
	}
	return `${out}</svg>`;
}

/**
 * `flat siblings` is one long run at depth 1 and `deep nesting` a narrow
 * 20-deep spine, so together they separate per-sibling from per-frame cost.
 * @type {[string, string][]} name, source
 */
const FIXTURES = [
	["document", makeSvg(1500)],
	[
		"flat siblings",
		(() => {
			let s = '<svg xmlns="http://www.w3.org/2000/svg">';
			for (let i = 0; i < 8000; i++) {
				s += `<rect x="${i}" y="0" width="1" height="1"/>`;
			}
			return `${s}</svg>`;
		})()
	],
	[
		"deep nesting",
		(() => {
			let s = '<svg xmlns="http://www.w3.org/2000/svg">';
			for (let i = 0; i < 800; i++) {
				for (let j = 0; j < 20; j++) s += `<g class="l${j}">`;
				s += `<circle r="${i}"/>`;
				for (let j = 0; j < 20; j++) s += "</g>";
			}
			return `${s}</svg>`;
		})()
	]
];

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	for (const [name, source] of FIXTURES) {
		bench.add(`unit benchmark "xml-printer-unit", walk (${name})`, () => {
			new SourceProcessor().process(source, { xml: true });
		});
		bench.add(`unit benchmark "xml-printer-unit", beautify (${name})`, () => {
			new SourceProcessor().process(source, { xml: true, mode: "beautify" });
		});
		bench.add(`unit benchmark "xml-printer-unit", minify (${name})`, () => {
			new SourceProcessor().process(source, { xml: true, mode: "minify" });
		});
	}
};
