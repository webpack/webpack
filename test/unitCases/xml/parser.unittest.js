"use strict";

const { fixture } = require("../../helpers/fixture");

// cspell:ignore apos selectedcontent viewbox

/** @import { MatDocument, MatElement, MatNode, MatProcessingInstruction, MatText } from "../../helpers/materializeHtmlTree" */

const {
	A,
	Field,
	Part,
	NodeType,
	decodeXmlAttribute,
	tokenizeXml,
	parseHtml: parseHtmlRefs
} = require("../../../lib/html/syntax-parser");
const { child, materialize } = require("../../helpers/materializeHtmlTree");

/**
 * @param {string} src source
 * @param {import("../../../lib/html/syntax-parser").HtmlAstSkip=} skip skip options
 * @returns {MatDocument} materialized XML document
 */
const parseXml = (src, skip) => {
	const doc = parseHtmlRefs(src, 0, { xml: true, skip });
	return {
		type: NodeType.Document,
		children: A.children(doc).map(materialize)
	};
};

describe("XmlSyntax — parsing", () => {
	it("should leave out errors in an entity's replacement text", () => {
		const parseError = jest.fn();
		parseHtmlRefs(
			fixture("xml", "xml-syntax-parsing-should-leave-out-errors-in-an-entity-s-replacement-text"),
			0,
			{ xml: true, parseError }
		);
		expect(parseError).not.toHaveBeenCalled();
	});

	const { SourceProcessor } = require("../../../lib/html/syntax");

	it("should reuse attribute sorting without HTML normalization", () => {
		const source = fixture("xml", "xml-syntax-parsing-should-reuse-attribute-sorting-without-html-normalization");
		const processor = new SourceProcessor();
		const options = { xml: true, mode: /** @type {const} */ ("minify"), sortAttributes: true };
		const once = processor.process(source, options).code;
		expect(once).toBe('<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg" xmlns:x="urn:test"><g z="1" Z="2" class="b a" x:href="#shape"/><path z="3"/></svg>');
		expect(processor.process(once, options).code).toBe(once);
		expect(processor.process(source, { ...options, sortAttributes: false }).code).toBe(source);
		expect(processor.process(fixture("xml", "xml-syntax-parsing-should-reuse-attribute-sorting-without-html-normalization-2"), options).code).toBe('<Root A="2" z="1"/>');
		expect(processor.process(fixture("xml", "xml-syntax-parsing-should-reuse-attribute-sorting-without-html-normalization-2"), { xml: true, mode: "beautify", sortAttributes: true }).code).toBe('<Root z="1" A="2"/>');
	});

	it("should rank only explicit XML attributes and preserve DTD defaults", () => {
		const source = fixture("xml", "xml-syntax-parsing-should-rank-only-explicit-xml-attributes-and-preserve-dtd");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), sortAttributes: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe('<!DOCTYPE root [<!ATTLIST item z CDATA "default" b CDATA "default">]><root><item a="1" z="explicit"/><item/><item/><other a="2"/></root>');
		expect(processor.process(once, options).code).toBe(once);
	});

	it("should expose XML attribute values through the shared path", () => {
		const source = fixture("xml", "xml-syntax-parsing-should-expose-xml-attribute-values-through-the-shared-path");
		const document = parseHtmlRefs(source, 0, { xml: true });
		const root = A.child(1, document);
		const attribute = A.fieldNamed(Field.attributes, "value", root);
		expect(A.value(attribute)).toBe("declared &\u0080&nbsp;");
		expect(A.value(attribute)).toBe("declared &\u0080&nbsp;");
	});

	it("should decode an XML attribute only once per parse", () => {
		const value = "x".repeat(400000);
		const source = `<!DOCTYPE root [<!ENTITY value "${value}">]><root value="&value;"/>`;
		const document = parseHtmlRefs(source, 0, { xml: true });
		const attribute = A.fieldNamed(Field.attributes, "value", A.child(1, document));
		for (let i = 0; i < 4; i++) expect(A.value(attribute) === value).toBe(true);
		const next = parseHtmlRefs(fixture("xml", "xml-syntax-parsing-should-decode-an-xml-attribute-only-once-per-parse"), 0, { xml: true });
		expect(A.value(A.fieldNamed(Field.attributes, "value", A.child(0, next)))).toBe("next");
	});

	it.each([["", ""], ["\r\n", "-2"]])("should preserve referenced carriage returns in an XML markup entity after %j", (_lineEnd, suffix) => {
		const source = fixture("xml", `xml-syntax-parsing-should-preserve-referenced-carriage-returns-in-an-xml-markup${suffix}`);
		const document = parseHtmlRefs(source, 0, { xml: true });
		expect(A.value(A.child(0, A.child(1, document)))).toBe("a\rb");
	});

	it.each([
		["<![CDATA[a&#13;b]]>", 1, "a\rb"],
		["<!--a&#13;b-->", 3, "a\nb"],
		["<?target a&#13;b?>", 5, "a\nb"]
	])("should normalize entity line endings according to the token in %s", (_markup, first, expected) => {
		for (const index of [first, first + 1]) {
			const source = fixture("xml", `xml-syntax-parsing-should-normalize-entity-line-endings-according-to-the-token${index === 1 ? "" : `-${index}`}`);
			const document = parseHtmlRefs(source, 0, { xml: true });
			expect(A.value(A.child(0, A.child(1, document)))).toBe(expected);
		}
	});

	it("should expose case-sensitive XML content and end-tag ranges", () => {
		const source = fixture("xml", "xml-syntax-parsing-should-expose-case-sensitive-xml-content-and-end-tag-ranges");
		const document = parseHtmlRefs(source, 0, { xml: true });
		const root = A.child(0, document);
		expect(A.rangeOf(Part.content, root)).toEqual([6, 7]);
		expect(A.rangeOf(Part.endTag, root)).toEqual([7, 14]);
		const unclosed = parseHtmlRefs(fixture("xml", "xml-syntax-parsing-should-expose-case-sensitive-xml-content-and-end-tag-ranges-2"), 0, { xml: true });
		expect(A.rangeOf(Part.endTag, A.child(0, unclosed))).toBeNull();
		const skipped = parseHtmlRefs(fixture("xml", "xml-syntax-parsing-should-expose-case-sensitive-xml-content-and-end-tag-ranges-3"), 0, {
			xml: true,
			skip: { text: true }
		});
		expect(A.rangeOf(Part.content, A.child(0, skipped))).toEqual([7, 8]);
	});

	it("should expose XML doctype identifier ranges", () => {
		const source = fixture("xml", "xml-syntax-parsing-should-expose-xml-doctype-identifier-ranges");
		const document = parseHtmlRefs(source, 0, { xml: true });
		const doctype = A.child(0, document);
		expect(A.rangeOf(Part.publicId, doctype)).toEqual([23, 29]);
		expect(A.rangeOf(Part.systemId, doctype)).toEqual([32, 38]);
	});

	it("should normalize XML comment line endings", () => {
		const document = parseHtmlRefs(fixture("xml", "xml-syntax-parsing-should-normalize-xml-comment-line-endings"), 0, {
			xml: true
		});
		const comment = A.child(0, A.child(0, document));
		expect(A.value(comment)).toBe("a\nb\nc");
	});

	it("should bound markup detection in deeply nested XML entities", () => {
		const declarations = [];
		for (let i = 0; i < 10000; i++) {
			declarations.push(`<!ENTITY e${i} "&e${i + 1};">`);
		}
		const source = `<!DOCTYPE root [${declarations.join("")}<!ENTITY e10000 "<child/>">]><root>&e0;<after/></root>`;
		const document = parseHtmlRefs(source, 0, { xml: true });
		const root = A.child(1, document);
		expect(A.name(A.child(1, root))).toBe("after");
	});

	it("should not synthesize the HTML document scaffold", () => {
		const document = parseXml(fixture("xml", "xml-syntax-parsing-should-not-synthesize-the-html-document-scaffold"));
		expect(document.children).toHaveLength(1);
		expect(document.children[0]).toMatchObject({
			type: NodeType.Element,
			tagName: "root",
			selfClosing: true
		});
	});

	it("should read what the input ran out in as far as it goes", () => {
		const [root] = parseXml(fixture("xml", "xml-syntax-parsing-should-read-what-the-input-ran-out-in-as-far-as-it-goes")).children;
		expect(/** @type {MatElement} */ (root).children).toMatchObject([
			{ type: NodeType.Text, data: "a" },
			{ type: NodeType.Comment, data: "FOO b" }
		]);
		expect(parseXml(fixture("xml", "xml-syntax-parsing-should-read-what-the-input-ran-out-in-as-far-as-it-goes-2")).children).toMatchObject(
			[{ type: NodeType.Doctype, name: "r" }]
		);
	});

	it("should replace a NUL in text and read a bare attribute an entity holds", () => {
		const [text] = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-replace-a-nul-in-text-and-read-a-bare-attribute-an")).children[0]
		).children;
		expect(text).toMatchObject({ type: NodeType.Text, data: "a\uFFFDb" });
		const [cdata] = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-replace-a-nul-in-text-and-read-a-bare-attribute-an-2")).children[0]
		).children;
		expect(cdata).toMatchObject({ type: NodeType.Text, data: "a\uFFFDb" });
		const [, root] = parseXml(
			fixture("xml", "xml-syntax-parsing-should-replace-a-nul-in-text-and-read-a-bare-attribute-an-3")
		).children;
		const [x] = /** @type {MatElement} */ (root).children;
		expect(
			/** @type {MatElement} */ (x).attributes.map(({ name, value }) => [
				name,
				value
			])
		).toEqual([["a", ""]]);
	});

	it("should preserve case-sensitive element and attribute names", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-preserve-case-sensitive-element-and-attribute-names")).children[0]
		);
		expect(root.tagName).toBe("Root");
		expect(root.attributes.map(({ name, value }) => [name, value])).toEqual([
			["ID", "upper"],
			["id", "lower"]
		]);
		expect(/** @type {MatElement} */ (root.children[0]).tagName).toBe(
			"Child"
		);
	});

	it("should distinguish empty-element syntax from an explicit end tag", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-distinguish-empty-element-syntax-from-an-explicit-end")).children[0]
		);
		expect(
			root.children.map((node) => ({
				name: /** @type {MatElement} */ (node).tagName,
				selfClosing: /** @type {MatElement} */ (node).selfClosing
			}))
		).toEqual([
			{ name: "empty", selfClosing: true },
			{ name: "paired", selfClosing: false }
		]);
	});

	it("should not apply the HTML void-element list", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-not-apply-the-html-void-element-list")).children[0]
		);
		const br = /** @type {MatElement} */ (root.children[0]);
		const img = /** @type {MatElement} */ (root.children[1]);
		expect(br.selfClosing).toBe(false);
		expect(br.children).toHaveLength(1);
		expect(img.selfClosing).toBe(false);
	});

	it("should not apply HTML paragraph, list, or table repairs", () => {
		const root = /** @type {MatElement} */ (
			parseXml(
				fixture("xml", "xml-syntax-parsing-should-not-apply-html-paragraph-list-or-table-repairs")
			).children[0]
		);
		const paragraph = /** @type {MatElement} */ (root.children[0]);
		const list = /** @type {MatElement} */ (root.children[1]);
		const table = /** @type {MatElement} */ (root.children[2]);
		expect(/** @type {MatElement} */ (paragraph.children[0]).tagName).toBe(
			"div"
		);
		expect(
			/** @type {MatElement} */ (
				/** @type {MatElement} */ (list.children[0]).children[0]
			).tagName
		).toBe("li");
		expect(/** @type {MatElement} */ (table.children[0]).tagName).toBe(
			"span"
		);
	});

	it("should keep markup inside names that are raw text in HTML", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-keep-markup-inside-names-that-are-raw-text-in-html"))
				.children[0]
		);
		expect(
			root.children.map(
				(node) => /** @type {MatElement} */ (node).children[0].type
			)
		).toEqual([NodeType.Element, NodeType.Element]);
	});

	it("should parse XML declarations and processing instructions", () => {
		const document = parseXml(
			fixture("xml", "xml-syntax-parsing-should-parse-xml-declarations-and-processing-instructions")
		);
		expect(
			document.children
				.filter((node) => node.type === NodeType.ProcessingInstruction)
				.map((node) => ({
					target: /** @type {MatProcessingInstruction} */ (node).target,
					data: /** @type {MatProcessingInstruction} */ (node).data
				}))
		).toEqual([
			{ target: "xml", data: 'version="1.0" encoding="UTF-8"' },
			{ target: "build", data: 'mode="fast"' },
			{ target: "done", data: "" }
		]);
	});

	it("should keep comments and read CDATA as character data", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-keep-comments-and-read-cdata-as-character-data"))
				.children[0]
		);
		expect(root.children[0]).toMatchObject({
			type: NodeType.Comment,
			data: " note "
		});
		expect(root.children[1]).toMatchObject({
			type: NodeType.Text,
			data: "<child>&value;"
		});
	});

	it("should preserve qualified names", () => {
		const root = /** @type {MatElement} */ (
			parseXml(
				fixture("xml", "xml-syntax-parsing-should-preserve-qualified-names")
			).children[0]
		);
		const entry = /** @type {MatElement} */ (root.children[0]);
		expect(entry.tagName).toBe("x:entry");
		expect(entry.attributes[0]).toMatchObject({
			name: "x:kind",
			value: "test"
		});
	});

	it("should preserve the document type name and identifiers", () => {
		const document = parseXml(
			fixture("xml", "xml-syntax-parsing-should-preserve-the-document-type-name-and-identifiers")
		);
		expect(document.children[0]).toMatchObject({
			type: NodeType.Doctype,
			name: "Root",
			publicId: "-//EXAMPLE//DTD ROOT 1.0//EN",
			systemId: "root.dtd"
		});
	});

	it("should decode predefined and numeric character references in text", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-decode-predefined-and-numeric-character-references-in"))
				.children[0]
		);
		expect(root.children[0]).toMatchObject({
			type: NodeType.Text,
			data: '<>&"\'AB'
		});
	});

	it("should require a lowercase hexadecimal marker", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-require-a-lowercase-hexadecimal-marker")).children[0]
		);
		expect(root.children[0]).toMatchObject({
			type: NodeType.Text,
			data: "J&#X4A;"
		});
	});

	it("should not decode HTML-only or differently-cased entity names", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-not-decode-html-only-or-differently-cased-entity-names")).children[0]
		);
		expect(root.children[0]).toMatchObject({
			type: NodeType.Text,
			data: "&nbsp;&AMP;&"
		});
	});

	it("should not apply selectedcontent HTML behavior", () => {
		const root = /** @type {MatElement} */ (
			parseXml(
				fixture("xml", "xml-syntax-parsing-should-not-apply-selectedcontent-html-behavior")
			).children[0]
		);
		const select = /** @type {MatElement} */ (root.children[0]);
		expect(select.children.map((node) => node.type)).toEqual([
			NodeType.Element,
			NodeType.Element
		]);
		expect(
			/** @type {MatElement} */ (select.children[1]).children
		).toHaveLength(0);
	});

	it("should honor AST skip options without changing XML structure", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-honor-ast-skip-options-without-changing-xml-structure"), {
				text: true,
				comments: true
			}).children[0]
		);
		expect(root.children).toHaveLength(1);
		expect(root.children[0]).toMatchObject({
			type: NodeType.Element,
			tagName: "child"
		});
	});

	it("should close misnested elements at the end tag naming an open one", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-close-misnested-elements-at-the-end-tag-naming-an-open")).children[0]
		);
		expect(
			root.children.map((node) => /** @type {MatElement} */ (node).tagName)
		).toEqual(["a", "c"]);
		const a = /** @type {MatElement} */ (root.children[0]);
		expect(/** @type {MatElement} */ (a.children[0]).tagName).toBe("b");
	});

	it("should keep a `>` quoted in the internal subset inside the DOCTYPE", () => {
		const document = parseXml(
			fixture("xml", "xml-syntax-parsing-should-keep-a-quoted-in-the-internal-subset-inside-the")
		);
		expect(document.children.map((node) => node.type)).toEqual([
			NodeType.Doctype,
			NodeType.Element
		]);
		expect(
			/** @type {MatElement} */ (document.children[1]).children[0]
		).toMatchObject({ type: NodeType.Text, data: "a>b" });
	});

	it("should expand the internal entities the DTD declares", () => {
		const document = parseXml(
			fixture("xml", "xml-syntax-parsing-should-expand-the-internal-entities-the-dtd-declares")
		);
		const svg = /** @type {MatElement} */ (document.children[1]);
		expect(decodeXmlAttribute(svg.attributes[0].value)).toBe(
			"http://www.w3.org/2000/svg"
		);
		expect(svg.children[0]).toMatchObject({
			type: NodeType.Text,
			data: "http://www.w3.org/2000/svg & &undeclared;"
		});
	});

	it("should not read a parameter entity or what is declared after one", () => {
		const root = /** @type {MatElement} */ (
			parseXml(
				fixture("xml", "xml-syntax-parsing-should-not-read-a-parameter-entity-or-what-is-declared-after")
			).children[1]
		);
		expect(root.children[0]).toMatchObject({ data: "A&b;" });
	});

	it("should tokenize an entity whose replacement text is markup", () => {
		const source =
			fixture("xml", "xml-syntax-parsing-should-tokenize-an-entity-whose-replacement-text-is-markup");
		const root = /** @type {MatElement} */ (parseXml(source).children[1]);
		expect(root.children.map((node) => node.type)).toEqual([
			NodeType.Text,
			NodeType.Element,
			NodeType.Text
		]);
		const x = /** @type {MatElement} */ (root.children[1]);
		expect(x).toMatchObject({ tagName: "x", start: 66, end: 69 });
		expect(decodeXmlAttribute(x.attributes[0].value)).toBe("1");
		expect(root.children[0]).toMatchObject({ data: "a(" });
		expect(root.children[2]).toMatchObject({ data: ")b" });
	});

	it("should report what an entity expands to at its reference past folded CRLFs", () => {
		const source = fixture(
			"xml",
			"xml-syntax-parsing-reports-what-an-entity-expands-to-at-its-reference"
		);
		const root = /** @type {MatElement} */ (parseXml(source).children[1]);
		const elements = root.children.filter(
			(node) => node.type === NodeType.Element
		);
		const body = source.indexOf("<r>");
		const first = source.indexOf("&e;", body);
		const nested = source.indexOf("&w;", body);
		const last = source.lastIndexOf("&e;");
		expect(elements).toMatchObject([
			{ tagName: "x", start: first, end: first + 3 },
			{ tagName: "x", start: nested, end: nested + 3 },
			{ tagName: "x", start: last, end: last + 3 }
		]);
		expect(root.children[0]).toMatchObject({
			data: "a\nb\n",
			start: source.indexOf("a\r\n"),
			end: first
		});
	});

	it("should keep the rest of the document after an entity ending inside a tag", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-keep-the-rest-of-the-document-after-an-entity-ending"))
				.children[1]
		);
		expect(
			root.children.map((node) => /** @type {MatElement} */ (node).tagName)
		).toEqual(["y", "z"]);
	});

	it("should leave a recursive or exponential entity unexpanded", () => {
		const recursive = /** @type {MatElement} */ (
			parseXml(
				fixture("xml", "xml-syntax-parsing-should-leave-a-recursive-or-exponential-entity-unexpanded")
			).children[1]
		);
		expect(recursive.children[0]).toMatchObject({ data: "&a;" });
		const bomb = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-leave-a-recursive-or-exponential-entity-unexpanded-2")).children[1]
		);
		const text = /** @type {MatText} */ (bomb.children[0]).data;
		expect(text.length).toBeLessThan(2 << 20);
		expect(text).toContain("&l");
		// Inline, since the tree it builds would be an 18 MB snapshot.
		let subset = '<!ENTITY l0 "0123456789">';
		for (let i = 1; i < 10; i++) {
			subset += `<!ENTITY l${i} "${`&l${i - 1};`.repeat(10)}">`;
		}
		const markupBomb = /** @type {MatElement} */ (
			parseXml(
				`<!DOCTYPE r [<!ENTITY m "<m/>">${subset.replace('"0123456789"', '"&m;"')}]><r>&l9;</r>`
			).children[1]
		);
		expect(markupBomb.children.length).toBeLessThan(1 << 20);
	});

	it("should normalize attribute values as §3.3.3 does", () => {
		const root = /** @type {MatElement} */ (
			parseXml(
				fixture("xml", "xml-syntax-parsing-should-normalize-attribute-values-as-3-3-3-does")
			).children[1]
		);
		expect(
			root.attributes.map(({ name, value }) => [
				name,
				decodeXmlAttribute(value)
			])
		).toEqual([
			["t", "a b"],
			["c", " a  b\n\tc "]
		]);
	});

	it("should supply the defaults the DTD declares", () => {
		const document = parseXml(
			fixture("xml", "xml-syntax-parsing-should-supply-the-defaults-the-dtd-declares")
		);
		const root = /** @type {MatElement} */ (document.children[1]);
		expect(
			root.attributes.map(({ name, value, nameStart }) => [
				name,
				decodeXmlAttribute(value),
				nameStart
			])
		).toEqual([
			["a", "mine", 125],
			["b", "y", -1]
		]);
		expect(
			/** @type {MatElement} */ (root.children[0]).attributes.map(
				({ name, value }) => [name, value]
			)
		).toEqual([["f", "g"]]);
	});

	it("should read what follows a PI target as its data", () => {
		const document = parseXml(
			fixture("xml", "xml-syntax-parsing-should-read-what-follows-a-pi-target-as-its-data")
		);
		expect(
			document.children.slice(0, 2).map((node) => ({
				target: /** @type {MatProcessingInstruction} */ (node).target,
				data: /** @type {MatProcessingInstruction} */ (node).data
			}))
		).toEqual([
			{ target: "xml-stylesheet", data: "href='a.css' media=\"a>b\"" },
			{ target: "target.v1", data: "two\n lines " }
		]);
	});

	it("should read malformed markup the way a lenient reader does", () => {
		const document = parseXml(
			fixture("xml", "xml-syntax-parsing-should-read-malformed-markup-the-way-a-lenient-reader-does")
		);
		const root = /** @type {MatElement} */ (document.children[0]);
		expect(
			root.attributes.map(({ name, value }) => [name, value])
		).toEqual([
			["a", "unquoted"],
			["b", ""],
			["c", "x"],
			["d", "y"]
		]);
		expect(root.children).toMatchObject([
			{ type: NodeType.Text, data: "1 < 2 & <3" },
			{ type: NodeType.Comment, data: "ELEMENT e ANY" },
			{ type: NodeType.Element, tagName: "t", children: [{ tagName: "u" }] }
		]);
		// Outside the root there is no element for character data to go in.
		expect(document.children[1]).toMatchObject({
			type: NodeType.Comment,
			data: "never closed"
		});
	});

	it("should read every shape a DOCTYPE declaration takes", () => {
		/**
		 * @param {string} source XML source
		 * @returns {MatNode[]} the document's children
		 */
		const nodes = (source) => parseXml(source).children;
		expect(nodes(fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes"))[0]).toMatchObject({
			name: "r",
			publicId: null,
			systemId: "r.dtd"
		});
		expect(nodes(fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes-2"))[0]).toMatchObject({
			publicId: "p",
			systemId: null
		});
		expect(nodes(fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes-3"))[0]).toMatchObject({ name: "" });
		const subset =
			fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes-4");
		expect(
			/** @type {MatElement} */ (nodes(subset)[1]).children[0]
		).toMatchObject({ data: "]>&ext;" });
		// The input ends inside the subset, a literal, or a comment in it.
		for (const source of [
			fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes-5"),
			fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes-6"),
			fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes-7"),
			fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes-8"),
			fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes-9"),
			fixture("xml", "xml-syntax-parsing-should-read-every-shape-a-doctype-declaration-takes-10")
		]) {
			expect(nodes(source)).toMatchObject([{ type: NodeType.Doctype }]);
		}
	});

	it("should read every shape an attribute-list declaration takes", () => {
		const root = /** @type {MatElement} */ (
			parseXml(
				fixture("xml", "xml-syntax-parsing-should-read-every-shape-an-attribute-list-declaration-takes")
			).children[1]
		);
		expect(
			root.attributes.map(({ name, value }) => [
				name,
				decodeXmlAttribute(value)
			])
		).toEqual([
			["i", "1"],
			["n", "a"],
			["e", "y"],
			["f", "f"],
			["t", "t"]
		]);
		// A literal left open runs to the end of the input, subset and all.
		expect(
			parseXml(fixture("xml", "xml-syntax-parsing-should-read-every-shape-an-attribute-list-declaration-takes-2")).children
		).toMatchObject([{ type: NodeType.Doctype }]);
	});

	it("should drop a tag, instruction or end tag the input ends inside", () => {
		for (const source of [fixture("xml", "xml-syntax-parsing-should-drop-a-tag-instruction-or-end-tag-the-input-ends"), fixture("xml", "xml-syntax-parsing-should-drop-a-tag-instruction-or-end-tag-the-input-ends-2"), fixture("xml", "xml-syntax-parsing-should-drop-a-tag-instruction-or-end-tag-the-input-ends-3")]) {
			const root = /** @type {MatElement} */ (parseXml(source).children[0]);
			expect(root.children).toEqual([
				expect.objectContaining({ type: NodeType.Text, data: "x" })
			]);
		}
	});

	it("should replace a character XML does not allow", () => {
		const root = /** @type {MatElement} */ (
			parseXml(fixture("xml", "xml-syntax-parsing-should-replace-a-character-xml-does-not-allow")).children[0]
		);
		expect(root.children[0]).toMatchObject({
			data: "��\u{1F600}�a�b"
		});
	});

	it("should report XML tokens through the tokenizer callbacks", () => {
		/** @type {string[]} */
		const log = [];
		tokenizeXml(
			fixture("xml", "xml-syntax-parsing-should-report-xml-tokens-through-the-tokenizer-callbacks"),
			0,
			{
				text: (input, start, end) => log.push(`text ${input.slice(start, end)}`),
				doctype: (input, start, end, nameStart, nameEnd, publicStart, publicEnd, systemStart, systemEnd, forceQuirks, subsetStart, subsetEnd) =>
					log.push(
						`doctype ${input.slice(nameStart, nameEnd)} ${input.slice(publicStart, publicEnd)} ${input.slice(systemStart, systemEnd)} ${input.slice(/** @type {number} */ (subsetStart), subsetEnd)}`
					),
				attribute: (input, nameStart, nameEnd, valueStart, valueEnd) =>
					log.push(`attribute ${input.slice(nameStart, nameEnd)}=${input.slice(valueStart, valueEnd)}`),
				openTag: (input, start, end, nameStart, nameEnd, selfClosing) =>
					log.push(`open ${input.slice(nameStart, nameEnd)} ${selfClosing}`),
				comment: (input, start, end, dataStart, dataEnd) =>
					log.push(`comment ${input.slice(dataStart, dataEnd)}`),
				closeTag: (input, start, end, nameStart, nameEnd) =>
					log.push(`close ${input.slice(nameStart, nameEnd)}`)
			}
		);
		expect(log).toEqual([
			"text x",
			'doctype d p s <!ENTITY e "]">',
			"attribute k=v",
			"open a true",
			"comment c",
			"comment p d",
			"close a",
			"text y"
		]);
		expect(tokenizeXml(fixture("xml", "xml-syntax-parsing-should-report-xml-tokens-through-the-tokenizer-callbacks-2"))).toBe(3);
	});
});
