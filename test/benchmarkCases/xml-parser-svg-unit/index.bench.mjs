// XML is the HTML module's second grammar: the same tree and the same
// `SourceProcessor`, but well-formed XML instead of HTML tree construction, as
// an SVG or XHTML asset is read. Printing is `xml-printer-svg-unit`'s.

import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/html/syntax-parser")} */
const htmlParser = require("../../../lib/html/syntax-parser.js");
/** @type {typeof import("../../../lib/html/syntax")} */
const htmlSyntax = require("../../../lib/html/syntax.js");

const { SourceProcessor } = htmlSyntax;
const { NodeType, parseHtml, tokenizeXml } = htmlParser;

// No large real-world SVG ships in the repo, so generate a deterministic
// ~1.5 MiB one with namespaced attributes, entity references, comments, CDATA
// and the shapes, groups and text an icon sheet or a chart is made of.
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
const svg = makeSvg(4000);

const NOOP = () => {};
// tokenize callbacks steer the cursor via their return value; returning the
// token end resumes where the tokenizer would by default.
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
	// Whole-document parse — the main entry.
	bench.add('unit benchmark "xml-parser-svg-unit", parseHtml', () => {
		parseHtml(svg, 0, { xml: true });
	});

	// AST-skip fast path (drop text nodes).
	bench.add(
		'unit benchmark "xml-parser-svg-unit", parseHtml (skip text)',
		() => {
			parseHtml(svg, 0, { xml: true, skip: { text: true } });
		}
	);

	// Grammar: parse + visitor walk (SourceProcessor).
	bench.add(
		'unit benchmark "xml-parser-svg-unit", process (no visitors)',
		() => {
			new SourceProcessor().use({}).process(svg, { xml: true });
		}
	);
	bench.add(
		'unit benchmark "xml-parser-svg-unit", process (Element+Comment visitors)',
		() => {
			new SourceProcessor()
				.use({ [NodeType.Element]: NOOP, [NodeType.Comment]: NOOP })
				.process(svg, { xml: true });
		}
	);

	// Tokenizer throughput (push interface).
	bench.add('unit benchmark "xml-parser-svg-unit", tokenize', () => {
		tokenizeXml(svg, 0, {
			openTag: RET_END,
			closeTag: RET_END,
			text: RET_END,
			comment: RET_END,
			doctype: RET_END
		});
	});
};
