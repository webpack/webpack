"use strict";

// The W3C XML Conformance Test Suite over the optional `test/external/xml-conformance-suite`
// submodule (its `packages/test-data/xmlconf`); an absent one degrades both suites to a no-op.
//
// 1. "xmlconf canonical form" — every valid and invalid document the suite gives
//    an expected output for is parsed with `parseHtml(…, { xml: true })` and
//    written in James Clark's canonical form, which must equal that output.
// 2. "xmlconf printer" — every document the suite holds, well-formed or not, is
//    printed with `mode: "minify"` and `"beautify"`: each output must parse to
//    the same canonical form as its input, and a second minify must change nothing.
//
// Two groups are counted and not run, with the reason asserted: documents that
// need an external entity or DTD, which webpack never reads, and XML 1.1 ones.

const fs = require("fs");
const path = require("path");
const { SourceProcessor } = require("../../lib/html/syntax");
const { A, NodeType, decodeXmlAttribute, parseHtml } = require("../../lib/html/syntax-parser");

const suiteDir = path.resolve(
	__dirname,
	"../external/xml-conformance-suite/packages/test-data/xmlconf"
);
const hasCorpus = fs.existsSync(path.join(suiteDir, "xmlconf.xml"));

/**
 * @typedef {object} ConformanceTest
 * @property {string} id the `TEST` element's ID
 * @property {string} type `valid`, `invalid`, `not-wf` or `error`
 * @property {string} entities which external entities the document reads (`none` when it reads none)
 * @property {string} recommendation which recommendation the test is for
 * @property {string} file absolute path of the document
 * @property {string | undefined} output absolute path of the expected canonical form
 * @property {string} catalog the catalog file listing it, relative to the suite
 */

/** @typedef {Record<string, string>} AttributeMap */

/**
 * @param {import("../../lib/html/syntax-parser").HtmlNodeRef} node an element
 * @returns {AttributeMap} its attributes by name, values normalized
 */
const attributesOf = (node) => {
	/** @type {AttributeMap} */
	const out = {};
	for (const attribute of A.attributes(node)) {
		out[attribute.name] = decodeXmlAttribute(attribute.value);
	}
	return out;
};

/**
 * Read every `TEST` the master catalog reaches. The catalogs are XML themselves,
 * so they are read with the parser under test; `xml:base` resolves each `URI`.
 * @returns {ConformanceTest[]} the tests
 */
const readTests = () => {
	const master = fs.readFileSync(path.join(suiteDir, "xmlconf.xml"), "utf8");
	/** @type {ConformanceTest[]} */
	const tests = [];
	for (const [, catalog] of master.matchAll(
		/<!ENTITY\s+\S+\s+SYSTEM\s+"([^"]+)"/g
	)) {
		const file = path.join(suiteDir, catalog);
		const doc = parseHtml(fs.readFileSync(file, "utf8"), 0, { xml: true });
		/**
		 * @param {import("../../lib/html/syntax-parser").HtmlNodeRef} node node
		 * @param {string} base directory its references resolve against
		 */
		const walk = (node, base) => {
			if (A.type(node) === NodeType.Element) {
				const attributes = attributesOf(node);
				if (attributes["xml:base"]) {
					base = path.join(base, attributes["xml:base"]);
				}
				if (A.tagName(node) === "TEST") {
					tests.push({
						id: attributes.ID,
						type: attributes.TYPE,
						entities: attributes.ENTITIES || "none",
						recommendation: attributes.RECOMMENDATION || "XML1.0",
						file: path.join(base, attributes.URI),
						output: attributes.OUTPUT && path.join(base, attributes.OUTPUT),
						catalog
					});
				}
			}
			for (const child of A.children(node)) walk(child, base);
		};
		walk(doc, path.dirname(file));
	}
	return tests;
};

/**
 * Decode a document's bytes the way §4.3.3 and Appendix F detect them: a byte
 * order mark, else the encoding declaration, else UTF-8.
 * @param {Buffer} bytes the document
 * @returns {string} its text
 */
const decodeDocument = (bytes) => {
	if (bytes[0] === 0xfe && bytes[1] === 0xff) {
		return new TextDecoder("utf-16be").decode(bytes);
	}
	if (bytes[0] === 0xff && bytes[1] === 0xfe) {
		return new TextDecoder("utf-16le").decode(bytes);
	}
	const declared = /^<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/.exec(
		bytes.subarray(0, 200).toString("latin1")
	);
	try {
		return new TextDecoder(declared ? declared[1] : "utf8").decode(bytes);
	} catch (_err) {
		// A name no decoder knows is what a not-well-formed case is testing.
		return new TextDecoder("utf-8").decode(bytes);
	}
};

/**
 * @param {string} value decoded text
 * @returns {string} the text as the canonical form escapes it
 */
const escapeCanonical = (value) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/\t/g, "&#9;")
		.replace(/\n/g, "&#10;")
		.replace(/\r/g, "&#13;");

/**
 * Write a parsed node in James Clark's canonical form: attributes sorted, empty
 * elements paired, comments, the XML declaration and the DOCTYPE left out.
 * @param {import("../../lib/html/syntax-parser").HtmlNodeRef} node node
 * @returns {string} its canonical form
 */
const canonical = (node) => {
	switch (A.type(node)) {
		case NodeType.Element: {
			const attributes = Object.entries(attributesOf(node)).sort(([a], [b]) =>
				a < b ? -1 : a > b ? 1 : 0
			);
			let out = `<${A.tagName(node)}`;
			for (const [name, value] of attributes) {
				out += ` ${name}="${escapeCanonical(value)}"`;
			}
			out += ">";
			for (const child of A.children(node)) out += canonical(child);
			return `${out}</${A.tagName(node)}>`;
		}
		case NodeType.Text:
			return escapeCanonical(A.data(node));
		case NodeType.ProcessingInstruction:
			// The XML declaration reaches the tree as an instruction targeting `xml`.
			return A.piTarget(node) === "xml"
				? ""
				: `<?${A.piTarget(node)} ${A.data(node)}?>`;
		case NodeType.Document: {
			let out = "";
			for (const child of A.children(node)) out += canonical(child);
			return out;
		}
		default:
			return "";
	}
};

/**
 * @param {string} source document text
 * @returns {string} the canonical form of what it parses to
 */
const canonicalOf = (source) => canonical(parseHtml(source, 0, { xml: true }));

/**
 * @param {string} source document text
 * @param {"minify" | "beautify"} mode print mode
 * @returns {string} the printed document
 */
const print = (source, mode) =>
	/** @type {{ code: string }} */ (
		new SourceProcessor().process(source, { xml: true, minimize: true, mode })
	).code;

/** @type {ConformanceTest[]} */
const runnable = [];
// Counted rather than dropped, so what the suites decline is asserted below.
const skipped = { externalEntities: 0, xml11: 0 };

if (hasCorpus) {
	for (const test of readTests()) {
		// webpack never fetches what a document points at, so what an external
		// entity or DTD would have declared is not something it can reproduce.
		if (test.entities !== "none") {
			skipped.externalEntities++;
		} else if (test.recommendation.includes("1.1")) {
			skipped.xml11++;
		} else {
			runnable.push(test);
		}
	}
}

describe("xmlconf canonical form", () => {
	if (!hasCorpus) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/external/xml-conformance-suite`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	it("runs every document that reads no external entity and is XML 1.0", () => {
		expect(skipped).toEqual({ externalEntities: 323, xml11: 215 });
	});

	const withOutput = runnable.filter(
		(test) =>
			(test.type === "valid" || test.type === "invalid") &&
			test.output !== undefined
	);

	it("compares every document the suite gives an expected output for", () => {
		expect(withOutput).toHaveLength(262);
	});

	for (const test of withOutput) {
		it(`${test.catalog} ${test.id}`, () => {
			const expected = fs
				.readFileSync(/** @type {string} */ (test.output), "utf8")
				// Clark's second form states notations in a DOCTYPE, which the
				// canonical form above leaves out along with the rest of the DTD.
				.replace(/^[^]*?<!DOCTYPE[^]*?\]>\n/, "");
			expect(canonicalOf(decodeDocument(fs.readFileSync(test.file)))).toBe(
				expected
			);
		});
	}
});

describe("xmlconf printer", () => {
	if (!hasCorpus) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/external/xml-conformance-suite`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	for (const test of runnable) {
		it(`${test.catalog} ${test.id} (${test.type})`, () => {
			const source = decodeDocument(fs.readFileSync(test.file));
			const expected = canonicalOf(source);
			const minified = print(source, "minify");
			expect(canonicalOf(minified)).toBe(expected);
			expect(print(minified, "minify")).toBe(minified);
			expect(canonicalOf(print(source, "beautify"))).toBe(expected);
		});
	}
});
