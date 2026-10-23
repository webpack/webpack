"use strict";

// cspell:ignore apos scrip
// cspell:ignore selectedcontent mtext mglyph colgroups viewbox definitionurl
// cspell:ignore Silmaril basefont bgsound framesets isindex
// cspell:ignore malignmark menuitem noembed noframes optgroup reparent spacer

/** @import { HtmlAttribute } from "../../../lib/html/syntax-parser" */
/** @import { MatComment, MatDoctype, MatDocument, MatElement, MatFragment, MatNode, MatProcessingInstruction, MatText } from "../../helpers/materializeHtmlTree" */

const {
	A,
	Field,
	Namespace,
	Part,
	NodeType,
	decodeXmlAttribute,
	tokenizeXml,
	parseCssUrls,
	parseHtml: parseHtmlRefs,
	parseMsapplicationTask,
	parseSrc,
	parseSrcset
} = require("../../../lib/html/syntax-parser");
const {
	body,
	child,
	childrenOf,
	html,
	materialize,
	parseHtml
} = require("../../helpers/materializeHtmlTree");
const serializeHtmlTree = require("../../helpers/serializeHtmlTree");

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

/**
 * @param {string} src source
 * @returns {MatElement[]} head children
 */
const head = (src) =>
	/** @type {MatElement[]} */ (child(html(src).children, "head").children);

/**
 * @param {string} src source
 * @param {string} tagName tag name
 * @returns {MatElement} first matching element anywhere
 */
const find = (src, tagName) => {
	/** @type {MatElement | undefined} */
	let found;
	/** @param {MatNode} node node to search */
	const walk = (node) => {
		if (found || node.type !== NodeType.Element) return;
		if (node.tagName === tagName) {
			found = node;
			return;
		}
		for (const c of node.children) walk(c);
	};
	for (const c of parseHtml(src).children) walk(c);
	return /** @type {MatElement} */ (found);
};

describe("HtmlSyntax — the facade", () => {
	const syntax = require("../../../lib/html/syntax");

	it("names its two halves the way `javascript` does", () => {
		expect(typeof syntax.parser.grammar).toBe("function");
		expect(typeof syntax.printer.printer).toBe("function");
	});

	it("publishes only the two halves and the processor", () => {
		expect(Object.keys(syntax).sort()).toEqual([
			"SourceProcessor",
			"parser",
			"printer"
		]);
		expect(syntax.parser).toBe(require("../../../lib/html/syntax-parser"));
		expect(syntax.printer).toBe(require("../../../lib/html/syntax-printer"));
	});

	it("holds no printer until something prints", () => {
		const processor = new syntax.SourceProcessor();
		processor.process("<p>x</p>");
		expect(processor._printer).toBeUndefined();
		expect(processor.process("<p>x</p>", { mode: "minify" }).code).toBe("<p>x");
		expect(typeof processor._printer).toBe("function");
	});
});

describe("parseHtml", () => {
	it("should produce an empty document with html/head/body scaffolding", () => {
		const ast = parseHtml("");
		expect(ast.type).toBe(NodeType.Document);
		const root = child(ast.children, "html");
		expect(root.tagName).toBe("html");
		expect(child(root.children, "head").tagName).toBe("head");
		expect(child(root.children, "body").tagName).toBe("body");
	});

	it("should parse a simple element into the body", () => {
		const nodes = body("<div></div>");
		expect(nodes).toHaveLength(1);
		expect(nodes[0].type).toBe(NodeType.Element);
		expect(nodes[0].tagName).toBe("div");
		expect(nodes[0].children).toEqual([]);
	});

	it("should parse nested elements", () => {
		const div = body("<div><span>hello</span></div>")[0];
		const span = /** @type {MatElement} */ (div.children[0]);
		expect(span.tagName).toBe("span");
		expect(span.children[0].type).toBe(NodeType.Text);
		expect(/** @type {MatText} */ (span.children[0]).data).toBe("hello");
	});

	it("should parse void elements", () => {
		const nodes = body('<img src="test.png"><br>');
		expect(nodes).toHaveLength(2);
		expect(nodes[0].tagName).toBe("img");
		expect(nodes[0].selfClosing).toBe(true);
		expect(nodes[1].tagName).toBe("br");
		expect(nodes[1].selfClosing).toBe(true);
	});

	it("should keep attribute values raw with source offsets", () => {
		const a = body('<a href="test.html" class="link">click</a>')[0];
		expect(a.attributes).toHaveLength(2);
		expect(a.attributes[0].name).toBe("href");
		expect(a.attributes[0].value).toBe("test.html");
		// Raw (undecoded) value preserved; consumers re-resolve from it.
		const raw = body('<a href="a&amp;b">x</a>')[0];
		expect(raw.attributes[0].value).toBe("a&amp;b");
		// Offsets line up with the source.
		const src = '<a href="test.html">x</a>';
		const link = body(src)[0];
		const attr = link.attributes[0];
		expect(src.slice(attr.valueStart, attr.valueEnd)).toBe("test.html");
	});

	it("should parse comments", () => {
		const ast = parseHtml("<!-- hello -->");
		expect(ast.children[0].type).toBe(NodeType.Comment);
		expect(/** @type {MatComment} */ (ast.children[0]).data).toBe(" hello ");
	});

	it("should parse doctype", () => {
		const ast = parseHtml("<!DOCTYPE html><html></html>");
		expect(ast.children[0].type).toBe(NodeType.Doctype);
		expect(/** @type {MatDoctype} */ (ast.children[0]).name).toBe("html");
	});

	it("should handle self-closing tags", () => {
		const nodes = body("<input/>");
		expect(nodes[0].tagName).toBe("input");
		expect(nodes[0].selfClosing).toBe(true);
	});

	describe("XML mode", () => {
		const { SourceProcessor } = require("../../../lib/html/syntax");

		it("should reuse attribute sorting without HTML normalization", () => {
			const source = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="urn:test" viewBox="0 0 1 1"><g z="1" x:href="#shape" Z="2" class="b a"/><path z="3"/></svg>';
			const processor = new SourceProcessor();
			const options = { xml: true, mode: /** @type {const} */ ("minify"), sortAttributes: true };
			const once = processor.process(source, options).code;
			expect(once).toBe('<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg" xmlns:x="urn:test"><g z="1" Z="2" class="b a" x:href="#shape"/><path z="3"/></svg>');
			expect(processor.process(once, options).code).toBe(once);
			expect(processor.process(source, { ...options, sortAttributes: false }).code).toBe(source);
			expect(processor.process('<Root z="1" A="2"/>', options).code).toBe('<Root A="2" z="1"/>');
			expect(processor.process('<Root z="1" A="2"/>', { xml: true, mode: "beautify", sortAttributes: true }).code).toBe('<Root z="1" A="2"/>');
		});

		it("should rank only explicit XML attributes and preserve DTD defaults", () => {
			const source = '<!DOCTYPE root [<!ATTLIST item z CDATA "default" b CDATA "default">]><root><item z="explicit" a="1"/><item/><item/><other a="2"/></root>';
			const options = { xml: true, mode: /** @type {const} */ ("minify"), sortAttributes: true };
			const processor = new SourceProcessor();
			const once = processor.process(source, options).code;
			expect(once).toBe('<!DOCTYPE root [<!ATTLIST item z CDATA "default" b CDATA "default">]><root><item a="1" z="explicit"/><item/><item/><other a="2"/></root>');
			expect(processor.process(once, options).code).toBe(once);
		});

		it("should expose XML attribute values through the shared path", () => {
			const source = '<!DOCTYPE Root [<!ENTITY value "declared">]><Root value="&value;\t&amp;&#x80;&nbsp;"/>';
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
			const next = parseHtmlRefs('<root value="next"/>', 0, { xml: true });
			expect(A.value(A.fieldNamed(Field.attributes, "value", A.child(0, next)))).toBe("next");
		});

		it.each(["", "\r\n"])("should preserve referenced carriage returns in an XML markup entity after %j", (lineEnd) => {
			const source = `<!DOCTYPE root [<!ENTITY value "a&#13;b<child/>">]>${lineEnd}<root>&value;</root>`;
			const document = parseHtmlRefs(source, 0, { xml: true });
			expect(A.value(A.child(0, A.child(1, document)))).toBe("a\rb");
		});

		it.each([
			["<![CDATA[a&#13;b]]>", "a\rb"],
			["<!--a&#13;b-->", "a\nb"],
			["<?target a&#13;b?>", "a\nb"]
		])("should normalize entity line endings according to the token in %s", (markup, expected) => {
			for (const lineEnd of ["", "\r\n"]) {
				const source = `<!DOCTYPE root [<!ENTITY value "${markup}<child/>">]>${lineEnd}<root>&value;</root>`;
				const document = parseHtmlRefs(source, 0, { xml: true });
				expect(A.value(A.child(0, A.child(1, document)))).toBe(expected);
			}
		});

		it("should expose case-sensitive XML content and end-tag ranges", () => {
			const source = "<Root>x</Root>";
			const document = parseHtmlRefs(source, 0, { xml: true });
			const root = A.child(0, document);
			expect(A.rangeOf(Part.content, root)).toEqual([6, 7]);
			expect(A.rangeOf(Part.endTag, root)).toEqual([7, 14]);
			const unclosed = parseHtmlRefs("<root>x</ROOT>", 0, { xml: true });
			expect(A.rangeOf(Part.endTag, A.child(0, unclosed))).toBeNull();
			const skipped = parseHtmlRefs("<style>x</style>", 0, {
				xml: true,
				skip: { text: true }
			});
			expect(A.rangeOf(Part.content, A.child(0, skipped))).toEqual([7, 8]);
		});

		it("should expose XML doctype identifier ranges", () => {
			const source = '<!DOCTYPE Root PUBLIC "public" "system"><Root/>';
			const document = parseHtmlRefs(source, 0, { xml: true });
			const doctype = A.child(0, document);
			expect(A.rangeOf(Part.publicId, doctype)).toEqual([23, 29]);
			expect(A.rangeOf(Part.systemId, doctype)).toEqual([32, 38]);
		});

		it("should normalize XML comment line endings", () => {
			const document = parseHtmlRefs("<root><!--a\r\nb\rc--></root>", 0, {
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
			const document = parseXml("<root/>");
			expect(document.children).toHaveLength(1);
			expect(document.children[0]).toMatchObject({
				type: NodeType.Element,
				tagName: "root",
				selfClosing: true
			});
		});

		it("should read what the input ran out in as far as it goes", () => {
			const [root] = parseXml("<r>a<!FOO b").children;
			expect(/** @type {MatElement} */ (root).children).toMatchObject([
				{ type: NodeType.Text, data: "a" },
				{ type: NodeType.Comment, data: "FOO b" }
			]);
			expect(parseXml('<!DOCTYPE r [<!ENTITY a "x">').children).toMatchObject(
				[{ type: NodeType.Doctype, name: "r" }]
			);
		});

		it("should replace a NUL in text and read a bare attribute an entity holds", () => {
			const [text] = /** @type {MatElement} */ (
				parseXml("<r>a\0b</r>").children[0]
			).children;
			expect(text).toMatchObject({ type: NodeType.Text, data: "a\uFFFDb" });
			const [cdata] = /** @type {MatElement} */ (
				parseXml("<r><![CDATA[a\0b]]></r>").children[0]
			).children;
			expect(cdata).toMatchObject({ type: NodeType.Text, data: "a\uFFFDb" });
			const [, root] = parseXml(
				'<!DOCTYPE r [<!ENTITY e "<x a/>">]><r>&e;</r>'
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
				parseXml('<Root ID="upper" id="lower"><Child/></Root>').children[0]
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
				parseXml("<root><empty/><paired></paired></root>").children[0]
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
				parseXml("<root><br><child/></br><img></img></root>").children[0]
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
					"<root><p><div/></p><ul><li><li/></li></ul><table><span/></table></root>"
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
				parseXml("<root><script><dependency/></script><style><rule/></style></root>")
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
				'<?xml version="1.0" encoding="UTF-8"?><?build mode="fast"?><root/><?done?>'
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
				parseXml("<root><!-- note --><![CDATA[<child>&value;]]></root>")
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
					'<feed xmlns:x="urn:example"><x:entry x:kind="test"/></feed>'
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
				'<!DOCTYPE Root PUBLIC "-//EXAMPLE//DTD ROOT 1.0//EN" "root.dtd"><Root/>'
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
				parseXml("<root>&lt;&gt;&amp;&quot;&apos;&#65;&#x42;</root>")
					.children[0]
			);
			expect(root.children[0]).toMatchObject({
				type: NodeType.Text,
				data: '<>&"\'AB'
			});
		});

		it("should require a lowercase hexadecimal marker", () => {
			const root = /** @type {MatElement} */ (
				parseXml("<root>&#x4A;&#X4A;</root>").children[0]
			);
			expect(root.children[0]).toMatchObject({
				type: NodeType.Text,
				data: "J&#X4A;"
			});
		});

		it("should not decode HTML-only or differently-cased entity names", () => {
			const root = /** @type {MatElement} */ (
				parseXml("<root>&nbsp;&AMP;&amp;</root>").children[0]
			);
			expect(root.children[0]).toMatchObject({
				type: NodeType.Text,
				data: "&nbsp;&AMP;&"
			});
		});

		it("should not apply selectedcontent HTML behavior", () => {
			const root = /** @type {MatElement} */ (
				parseXml(
					"<root><select><option selected=\"\"><span/></option><selectedcontent/></select></root>"
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
				parseXml("<root>text<!-- comment --><child/></root>", {
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
				parseXml("<root><a><b>x</a><c/></stray></root>").children[0]
			);
			expect(
				root.children.map((node) => /** @type {MatElement} */ (node).tagName)
			).toEqual(["a", "c"]);
			const a = /** @type {MatElement} */ (root.children[0]);
			expect(/** @type {MatElement} */ (a.children[0]).tagName).toBe("b");
		});

		it("should keep a `>` quoted in the internal subset inside the DOCTYPE", () => {
			const document = parseXml(
				'<!DOCTYPE r [<!ENTITY gt2 "a>b"><!-- ]> --><?pi ]>?>]><r>&gt2;</r>'
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
				'<!DOCTYPE svg [<!ENTITY ns "http://www.w3.org/2000/svg"><!ENTITY both "&ns; &#38;amp; &undeclared;"><!ENTITY ns "second">]><svg xmlns="&ns;">&both;</svg>'
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
					'<!DOCTYPE r [<!ENTITY % p "x"><!ENTITY a "A">%p;<!ENTITY b "B">]><r>&a;&b;</r>'
				).children[1]
			);
			expect(root.children[0]).toMatchObject({ data: "A&b;" });
		});

		it("should tokenize an entity whose replacement text is markup", () => {
			const source =
				'<!DOCTYPE r [<!ENTITY e "<x a=\'1\'>t</x>"><!ENTITY w "(&e;)">]><r>a&w;b</r>';
			const root = /** @type {MatElement} */ (parseXml(source).children[1]);
			expect(root.children.map((node) => node.type)).toEqual([
				NodeType.Text,
				NodeType.Element,
				NodeType.Text
			]);
			const x = /** @type {MatElement} */ (root.children[1]);
			expect(x).toMatchObject({ tagName: "x", start: 65, end: 70 });
			expect(decodeXmlAttribute(x.attributes[0].value)).toBe("1");
			expect(root.children[0]).toMatchObject({ data: "a(" });
			expect(root.children[2]).toMatchObject({ data: ")b" });
			// No reference can be rebuilt from the elements, so it prints as written.
			expect(
				new SourceProcessor().process(source, { xml: true, mode: "minify" })
					.code
			).toBe(source);
		});

		it("should keep the rest of the document after an entity ending inside a tag", () => {
			const root = /** @type {MatElement} */ (
				parseXml('<!DOCTYPE r [<!ENTITY e "<x">]><r>&e;<y/><z/></r>')
					.children[1]
			);
			expect(
				root.children.map((node) => /** @type {MatElement} */ (node).tagName)
			).toEqual(["y", "z"]);
		});

		it("should leave a recursive or exponential entity unexpanded", () => {
			const recursive = /** @type {MatElement} */ (
				parseXml(
					'<!DOCTYPE r [<!ENTITY a "&b;"><!ENTITY b "&a;">]><r>&a;</r>'
				).children[1]
			);
			expect(recursive.children[0]).toMatchObject({ data: "&a;" });
			let subset = '<!ENTITY l0 "0123456789">';
			for (let i = 1; i < 10; i++) {
				subset += `<!ENTITY l${i} "${`&l${i - 1};`.repeat(10)}">`;
			}
			const bomb = /** @type {MatElement} */ (
				parseXml(`<!DOCTYPE r [${subset}]><r a="&l9;">&l9;</r>`).children[1]
			);
			const text = /** @type {MatText} */ (bomb.children[0]).data;
			expect(text.length).toBeLessThan(2 << 20);
			expect(text).toContain("&l");
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
					'<!DOCTYPE r [<!ATTLIST r t NMTOKENS #IMPLIED c CDATA #IMPLIED>]><r t="  a \r\n b  " c=" a\r\n\tb&#10;&#9;c "/>'
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
				"<!DOCTYPE r [<!ATTLIST r a CDATA 'one' b ( x | y ) #FIXED ' y ' c CDATA #REQUIRED a CDATA 'two'><!ATTLIST e f CDATA 'g'>]><r a='mine'><e/></r>"
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
				"<?xml-stylesheet href='a.css' media=\"a>b\"?><?target.v1\r\n two\r\n lines ?><r/>"
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
				'<r a=unquoted b c="x" / d="y">1 < 2 &amp; <3<!ELEMENT e ANY><t x="1"<u/></r><![CDATA[never closed'
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
			expect(nodes('<!DOCTYPE r SYSTEM "r.dtd"><r/>')[0]).toMatchObject({
				name: "r",
				publicId: null,
				systemId: "r.dtd"
			});
			expect(nodes("<!DOCTYPE r PUBLIC 'p'><r/>")[0]).toMatchObject({
				publicId: "p",
				systemId: null
			});
			expect(nodes("<!DOCTYPE><r/>")[0]).toMatchObject({ name: "" });
			const subset =
				"<!DOCTYPE r [ <!-- ] --> <?pi ]?> <!ENTITY q ']>'> <!ENTITY % p 'x'> <!ENTITY ext SYSTEM 'e.xml'> <!ELEMENT r ANY> ]><r>&q;&ext;</r>";
			expect(
				/** @type {MatElement} */ (nodes(subset)[1]).children[0]
			).toMatchObject({ data: "]>&ext;" });
			// The input ends inside the subset, a literal, or a comment in it.
			for (const source of [
				"<!DOCTYPE r [<!ENTITY a 'x'>",
				"<!DOCTYPE r [<!ENTITY a 'x",
				"<!DOCTYPE r [<!-- open",
				"<!DOCTYPE r [<?open",
				"<!DOCTYPE r [<!ELEMENT r 'open",
				'<!DOCTYPE r "open'
			]) {
				expect(nodes(source)).toMatchObject([{ type: NodeType.Doctype }]);
			}
		});

		it("should read every shape an attribute-list declaration takes", () => {
			const root = /** @type {MatElement} */ (
				parseXml(
					"<!DOCTYPE r [<!ATTLIST r n NOTATION (a|b) 'a' e (x | y) 'y' i ID #IMPLIED f CDATA #FIXED \"f\" t NMTOKEN ' t '><!ATTLIST q><!ATTLIST r broken (open]><r i=' 1 '/>"
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
				parseXml("<!DOCTYPE r [<!ATTLIST r a CDATA 'open]><r/>").children
			).toMatchObject([{ type: NodeType.Doctype }]);
		});

		it("should drop a tag, instruction or end tag the input ends inside", () => {
			for (const source of ["<r>x<y a='1'", "<r>x<?pi data", "<r>x</r"]) {
				const root = /** @type {MatElement} */ (parseXml(source).children[0]);
				expect(root.children).toEqual([
					expect.objectContaining({ type: NodeType.Text, data: "x" })
				]);
			}
		});

		it("should replace a character XML does not allow", () => {
			const root = /** @type {MatElement} */ (
				parseXml("<r>&#0;&#xD800;&#x1F600;&#12;a\0b</r>").children[0]
			);
			expect(root.children[0]).toMatchObject({
				data: "��\u{1F600}�a�b"
			});
		});

		it("should report XML tokens through the tokenizer callbacks", () => {
			/** @type {string[]} */
			const log = [];
			tokenizeXml(
				'x<!DOCTYPE d PUBLIC "p" \'s\' [<!ENTITY e "]">]><a k="v"/><!--c--><?p d?></a>y',
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
			expect(tokenizeXml("<a>")).toBe(3);
		});
	});

	it("should auto-close <p> when a block element opens", () => {
		const nodes = body("<p>one<div>two</div>");
		expect(nodes).toHaveLength(2);
		expect(nodes[0].tagName).toBe("p");
		expect(/** @type {MatText} */ (nodes[0].children[0]).data).toBe("one");
		expect(nodes[1].tagName).toBe("div");
	});

	it("should auto-close same-name elements like <li>", () => {
		const ul = body("<ul><li>one<li>two</ul>")[0];
		expect(ul.children).toHaveLength(2);
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (ul.children[0]).children[0]
			).data
		).toBe("one");
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (ul.children[1]).children[0]
			).data
		).toBe("two");
	});

	it("should replace NULL with U+FFFD in raw text", () => {
		const script = find("<script>a\u0000b</script>", "script");
		expect(
			/** @type {MatText} */ (/** @type {unknown} */ (script.children[0])).data
		).toBe("a\uFFFDb");
	});

	it("should drop NULL from ordinary text", () => {
		const nodes = body("a\u0000b");
		expect(
			/** @type {MatText} */ (/** @type {unknown} */ (nodes[0])).data
		).toBe("ab");
	});

	it("should merge adjacent text nodes", () => {
		// Foster-parenting the table's text next to the leading text exercises
		// the adjacent-text-node merge.
		const nodes = body("Text<table>Misplaced</table>");
		expect(nodes[0].type).toBe(NodeType.Text);
		expect(
			/** @type {MatText} */ (/** @type {unknown} */ (nodes[0])).data
		).toBe("TextMisplaced");
		expect(child(nodes, "table").tagName).toBe("table");
	});

	it("should detect SVG namespace and adjust foreign tag names", () => {
		const svg = body("<svg><lineargradient></lineargradient></svg>")[0];
		expect(svg.namespace).toBe(Namespace.SVG);
		// SVG tag-name case is corrected per the foreign adjustment table.
		expect(/** @type {MatElement} */ (svg.children[0]).tagName).toBe(
			"linearGradient"
		);
		expect(/** @type {MatElement} */ (svg.children[0]).namespace).toBe(Namespace.SVG);
	});

	it("should not resolve prototype-named SVG tags and attributes through the adjustment tables", () => {
		const svg = body('<svg><constructor toString="x"></constructor></svg>')[0];
		const el = /** @type {MatElement} */ (svg.children[0]);
		expect(el.tagName).toBe("constructor");
		expect(el.attributes[0].name).toBe("tostring");
	});

	it("should detect MathML namespace", () => {
		const math = body("<math><mi>x</mi></math>")[0];
		expect(math.namespace).toBe(Namespace.MathML);
		expect(/** @type {MatElement} */ (math.children[0]).namespace).toBe(
			Namespace.MathML
		);
	});

	it("should route head and body content to the right place", () => {
		const src =
			'<!DOCTYPE html><html><head><meta charset="utf-8"><title>T</title></head><body><h1>Hi</h1></body></html>';
		expect(child(head(src), "meta").tagName).toBe("meta");
		expect(child(head(src), "title").tagName).toBe("title");
		expect(child(body(src), "h1").tagName).toBe("h1");
	});

	it("should export namespace constants", () => {
		expect(Namespace.HTML).toBe(0);
		expect(Namespace.MathML).toBe(1);
		expect(Namespace.SVG).toBe(2);
	});

	it("should handle valueless attributes", () => {
		const input = body("<input disabled>")[0];
		expect(input.attributes[0].name).toBe("disabled");
		expect(input.attributes[0].value).toBe("");
	});

	it("should handle all attribute quote styles", () => {
		const input = body("<input a=\"1\" b='2' c=3 disabled>")[0];
		expect(input.attributes.map((attr) => attr.value)).toEqual([
			"1",
			"2",
			"3",
			""
		]);
	});

	it("should construct the table structure with implied tbody/tr", () => {
		const table = body("<table><tr><td>a<td>b</tr></table>")[0];
		const tbody = /** @type {MatElement} */ (table.children[0]);
		expect(tbody.tagName).toBe("tbody");
		const tr = /** @type {MatElement} */ (tbody.children[0]);
		expect(
			tr.children.map((c) => /** @type {MatElement} */ (c).tagName)
		).toEqual(["td", "td"]);
	});

	it("should treat SVG foreignObject/desc as HTML integration points", () => {
		const svg = body(
			"<svg><foreignObject><div>html</div></foreignObject></svg>"
		)[0];
		const fo = /** @type {MatElement} */ (svg.children[0]);
		expect(fo.namespace).toBe(Namespace.SVG);
		expect(/** @type {MatElement} */ (fo.children[0]).namespace).toBe(Namespace.HTML);
		const desc = /** @type {MatElement} */ (
			body("<svg><desc><div>x</div></desc></svg>")[0].children[0]
		);
		expect(/** @type {MatElement} */ (desc.children[0]).namespace).toBe(
			Namespace.HTML
		);
	});

	it("should keep CDATA text in foreign content", () => {
		const svg = body("<svg><![CDATA[foo]]></svg>")[0];
		expect(svg.children[0].type).toBe(NodeType.Text);
		expect(/** @type {MatText} */ (svg.children[0]).data).toBe("foo");
	});

	it("should treat bogus comments as comments", () => {
		// A leading bogus comment is inserted into the document before <html>.
		// `1bogus` is no processing instruction target, so the `<?` stays bogus.
		const ast = parseHtml("<?1bogus comment>");
		expect(ast.children[0].type).toBe(NodeType.Comment);
		expect(/** @type {MatComment} */ (ast.children[0]).data).toBe(
			"?1bogus comment"
		);
	});

	// WPT owns the tree-construction corpus for these
	// (`html/syntax/parsing/resources/processing-instructions.dat`), and it is
	// not carried here, so its cases are mirrored below.
	it("should parse a bogus comment with a valid target as a processing instruction", () => {
		/**
		 * @param {string} source HTML
		 * @returns {MatProcessingInstruction} the leading processing instruction
		 */
		const pi = (source) => {
			const node = parseHtml(source).children[0];
			expect(node.type).toBe(NodeType.ProcessingInstruction);
			return /** @type {MatProcessingInstruction} */ (node);
		};
		expect(pi("<?target data?>")).toMatchObject({
			target: "target",
			data: "data"
		});
		// `>` closes one as well, and `_`, digits and `-` are target characters.
		expect(pi("<?_t-1 data>")).toMatchObject({ target: "_t-1", data: "data" });
		// A `?` is data unless the `>` follows it, and the target may end on one.
		expect(pi("<?t a?b?>")).toMatchObject({ target: "t", data: "a?b" });
		expect(pi("<?t ? ?>")).toMatchObject({ target: "t", data: "? " });
		expect(pi("<?t?>")).toMatchObject({ target: "t", data: "" });
		expect(pi("<?t \u0000?>")).toMatchObject({ target: "t", data: "\uFFFD" });
	});

	it("should insert a processing instruction where a comment would go", () => {
		const head = /** @type {MatElement} */ (
			/** @type {MatElement} */ (parseHtml("<head><?t 1?>").children[0])
				.children[0]
		);
		expect(head.children[0].type).toBe(NodeType.ProcessingInstruction);
		const body = /** @type {MatElement} */ (
			/** @type {MatElement} */ (parseHtml("<body><?t 1?><span>").children[0])
				.children[1]
		);
		expect(body.children[0].type).toBe(NodeType.ProcessingInstruction);
		expect(body.children[1].type).toBe(NodeType.Element);
	});

	it("should keep a reserved or malformed target a bogus comment", () => {
		for (const source of [
			"<?xml version?>",
			"<?XML-stylesheet href?>",
			"<?1st?>",
			"<?t$x?>",
			"<?>"
		]) {
			expect(parseHtml(source).children[0].type).toBe(NodeType.Comment);
		}
		// Reserved targets are judged before EOF, so this one stays a comment.
		expect(parseHtml("<?xml version").children[0].type).toBe(NodeType.Comment);
	});

	it("should drop a processing instruction cut short by EOF", () => {
		// Every state EOF can land in: open, target, after target, data.
		for (const source of [
			"<body>x<?",
			"<body>x<?t",
			"<body>x<?t ",
			"<body>x<?t data"
		]) {
			const body = /** @type {MatElement} */ (
				/** @type {MatElement} */ (parseHtml(source).children[0]).children[1]
			);
			expect(body.children).toHaveLength(1);
			expect(body.children[0].type).toBe(NodeType.Text);
		}
	});

	it("should parse raw-text elements without decoding entities", () => {
		const script = find("<script>var a = 1 < 2 &amp; 3;</script>", "script");
		expect(script.children[0].type).toBe(NodeType.Text);
		expect(/** @type {MatText} */ (script.children[0]).data).toBe(
			"var a = 1 < 2 &amp; 3;"
		);
	});

	it("should set tagEnd, nameEnd and start used by the consumer", () => {
		const src = "<script>x</script>";
		const script = find(src, "script");
		expect(script.start).toBe(0);
		expect(script.tagEnd).toBe(8); // after "<script>"
		expect(src.slice(1, script.nameEnd)).toBe("script");
	});

	it("should update end offsets when an element is closed", () => {
		const src = "<div><span>text</div>";
		const div = body(src)[0];
		const span = /** @type {MatElement} */ (div.children[0]);
		expect(div.end).toBe(src.length);
		// Closed by `</div>`, which names its parent: its source ends where that starts.
		expect(src.slice(span.start, span.end)).toBe("<span>text");
	});

	it("should end an implicitly closed element where its content ends", () => {
		const src = "<p>one<p>two<ul><li>a<li>b</ul><br>";
		const nodes = body(src);
		const spans = nodes.map((n) =>
			src.slice(/** @type {MatElement} */ (n).start, /** @type {MatElement} */ (n).end)
		);
		expect(spans).toEqual(["<p>one", "<p>two", "<ul><li>a<li>b</ul>", "<br>"]);
		const items = /** @type {MatElement} */ (nodes[2]).children.map((n) =>
			src.slice(/** @type {MatElement} */ (n).start, /** @type {MatElement} */ (n).end)
		);
		expect(items).toEqual(["<li>a", "<li>b"]);
	});

	it("should keep whitespace the closed element holds inside its range", () => {
		const src = "<table><colgroup> x</table>";
		// The `x` is foster-parented before the table; the space stays in colgroup.
		const table = /** @type {MatElement} */ (body(src)[1]);
		const colgroup = /** @type {MatElement} */ (table.children[0]);
		expect(src.slice(colgroup.start, colgroup.end)).toBe("<colgroup> ");
	});

	it("should foster-parent misplaced content out of tables", () => {
		const nodes = body(
			"<table><div>Misplaced</div><tr><td>OK</td></tr></table>"
		);
		expect(nodes[0].tagName).toBe("div");
		expect(/** @type {MatText} */ (nodes[0].children[0]).data).toBe(
			"Misplaced"
		);
		expect(nodes[1].tagName).toBe("table");
	});

	describe("adoption agency algorithm", () => {
		it("should move the furthest block to the common ancestor", () => {
			// `<b>1<p>2</b>3</p>`: per WHATWG the <p> (furthest block) is relocated
			// to the common ancestor (body); the original <b> keeps only "1" and a
			// <b> clone wraps the content that stayed inside <p>.
			const nodes = body("<b>1<p>2</b>3</p>");
			expect(nodes.map((n) => n.tagName)).toEqual(["b", "p"]);
			expect(
				nodes[0].children.map((n) => /** @type {MatText} */ (n).data)
			).toEqual(["1"]);
			const p = nodes[1];
			expect(/** @type {MatElement} */ (p.children[0]).tagName).toBe("b");
			expect(
				/** @type {MatText} */ (
					/** @type {MatElement} */ (p.children[0]).children[0]
				).data
			).toBe("2");
			expect(/** @type {MatText} */ (p.children[1]).data).toBe("3");
		});

		it("should reconstruct active formatting elements", () => {
			const nodes = body("<p>1<b>2</p>3</b>");
			expect(nodes[0].tagName).toBe("p");
			expect(/** @type {MatElement} */ (nodes[0].children[1]).tagName).toBe(
				"b"
			);
			expect(nodes[1].tagName).toBe("b");
			expect(/** @type {MatText} */ (nodes[1].children[0]).data).toBe("3");
		});

		// A formatting end tag the list cannot answer for is read as any other end
		// tag, not dropped. A `<select>`'s marker outlives it, so the `<em>` around
		// one is beyond it; Noah's Ark drops the earliest `<b>` but leaves it open.
		it.each([
			[
				"a marker stands between them",
				"<em><select></select></em><x>",
				["em", "x"]
			],
			[
				"a second select closed it",
				"<em><select><select></select></em><x>",
				["em", "x"]
			],
			["an input closed it", "<em><select><input></em><x>", ["em", "x"]],
			[
				"Noah's Ark dropped it",
				"<b><b><b><b></b></b></b><i></b><x>",
				["b", "i"]
			]
		])(
			"reads a formatting end tag as any other when %s",
			(_name, src, shape) => {
				expect(body(src).map((n) => n.tagName)).toEqual(shape);
			}
		);

		// A `<template shadowrootmode>` becomes its parent's shadow root, which the
		// engine takes out of the tree — so it is not a child the algorithm may
		// carry into the formatting element it reconstructs around the rest.
		it.each([
			[
				"attaches to its host",
				"<a href=#x><div><template shadowrootmode=open><slot></slot></template></a>",
				["template", "a"]
			],
			[
				"cannot attach to that host",
				"<a href=#x><li><template shadowrootmode=open><slot></slot></template></a>",
				["a"]
			],
			[
				"names no mode it knows",
				"<a href=#x><div><template shadowrootmode=bogus><slot></slot></template></a>",
				["a"]
			],
			[
				"is the second on one host",
				"<a href=#x><div><template shadowrootmode=open></template><template shadowrootmode=open></template></a>",
				["template", "a"]
			]
		])("leaves a declarative shadow root where it %s", (_name, src, shape) => {
			const nodes = body(src);
			const inner = /** @type {MatElement[]} */ (nodes[1].children);
			expect(inner.map((n) => n.tagName)).toEqual(shape);
		});

		// `attachShadow()` is defined on HTML elements alone. An integration point
		// runs HTML rules with a foreign current node, so it is the one way a
		// `<template shadowrootmode>` is written against a host that cannot take it.
		it("keeps a shadow-root template outside the HTML namespace as content", () => {
			const nodes = body(
				"<a href=#x><svg><foreignObject><template shadowrootmode=open></template></foreignObject></svg></a>"
			);
			/**
			 * @param {MatElement} node an element
			 * @returns {string} its tag name and those it contains
			 */
			const shape = (node) =>
				node.tagName +
				(node.children && node.children.length > 0
					? `>${
							/** @type {MatElement[]} */ (node.children).map(shape).join("")
						}`
					: "");
			expect(nodes.map(shape)).toEqual(["a>svg>foreignObject>template"]);
		});

		it("should apply Noah's Ark limit of three formatting elements", () => {
			const nodes = body("<b><b><b><b></b></b></b></b>");
			expect(nodes).toHaveLength(1);
		});

		// Noah's Ark only counts entries whose attributes match, so the depth the
		// second <p> reconstructs to reports whether two <b>s compared equal.
		/**
		 * @param {string} src source
		 * @returns {number} nested `b` depth of the last body child
		 */
		const reconstructedDepth = (src) => {
			const nodes = body(src);
			let node = nodes[nodes.length - 1];
			let depth = 0;
			for (;;) {
				const next = /** @type {MatElement} */ (node.children[0]);
				if (!next || next.type !== NodeType.Element || next.tagName !== "b") {
					break;
				}
				depth++;
				node = next;
			}
			return depth;
		};

		it("should count equal attributes toward Noah's Ark", () => {
			expect(
				reconstructedDepth(
					"<p><b class=x><b class=x><b class=x><b class=x>1</p><p>2"
				)
			).toBe(3);
		});

		it("should not count differing attribute values toward Noah's Ark", () => {
			expect(
				reconstructedDepth(
					"<p><b class=x><b class=y><b class=z><b class=w>1</p><p>2"
				)
			).toBe(4);
		});

		it("should not count attribute values of differing length toward Noah's Ark", () => {
			expect(
				reconstructedDepth(
					"<p><b class=x><b class=xx><b class=x><b class=x>1</p><p>2"
				)
			).toBe(4);
		});

		it("should count equal valueless attributes toward Noah's Ark", () => {
			// A valueless attribute stores its value rather than a source range, so
			// this takes the resolved-value comparison instead of the range one.
			expect(
				reconstructedDepth(
					"<p><b hidden><b hidden><b hidden><b hidden>1</p><p>2"
				)
			).toBe(3);
		});

		it("should close an open <a> when another start tag opens", () => {
			// The "in body" <a> rule runs the algorithm for the open <a> and drops it
			// from both the formatting list and the stack, so the two are siblings.
			const nodes = body("<a href=1>1<a href=2>2");
			expect(nodes.map((n) => n.tagName)).toEqual(["a", "a"]);
			expect(nodes[1].children).toHaveLength(1);
		});

		it("should drop an open <a> the algorithm could not reach", () => {
			// The <table> is a scope boundary, so the algorithm leaves the outer <a>
			// in the formatting list and the <a> rule has to remove it itself.
			const nodes = body("<a href=1><table><a href=2>");
			expect(nodes.map((n) => n.tagName)).toEqual(["a"]);
			expect(
				/** @type {MatElement[]} */ (nodes[0].children).map((n) => n.tagName)
			).toEqual(["a", "table"]);
		});

		it("should drop formatting elements past the inner-loop limit", () => {
			// Five formatting elements between <b> and the furthest block take the
			// algorithm's inner loop past three, which drops the deepest entries
			// from the formatting list rather than reopening them inside <p>.
			const nodes = body("<b><i><u><s><em><p>x</b>y");
			expect(nodes.map((n) => n.tagName)).toEqual(["b", "u"]);
			const p = find("<b><i><u><s><em><p>x</b>y", "p");
			expect(/** @type {MatElement} */ (p.children[0]).tagName).toBe("b");
		});

		it("should not duplicate an attribute span when a formatting element is cloned", () => {
			// The <a> is reopened around <div> by the algorithm; the clone must not
			// reuse the original's href span, or the parser emits two dependencies.
			const nodes = body("<a href=x.png><div>y</a>");
			/** @type {string[]} */
			const spans = [];
			/** @param {MatNode} node node to collect from */
			const collect = (node) => {
				if (node.type !== NodeType.Element) return;
				for (const attr of node.attributes) {
					if (attr.valueStart !== undefined && attr.valueStart !== -1) {
						spans.push(`${attr.valueStart},${attr.valueEnd}`);
					}
				}
				for (const c of node.children) collect(c);
			};
			for (const node of nodes) collect(node);
			expect(spans).toEqual([...new Set(spans)]);
		});
	});

	it("should auto-close and close <dd>/<dt>", () => {
		const dl = body("<dl><dd>a</dd><dt>b</dt></dl>")[0];
		expect(dl.tagName).toBe("dl");
		expect(
			dl.children.map((c) => /** @type {MatElement} */ (c).tagName)
		).toEqual(["dd", "dt"]);
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (dl.children[0]).children[0]
			).data
		).toBe("a");
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (dl.children[1]).children[0]
			).data
		).toBe("b");
	});

	it("should keep <table> inside <p> in quirks mode (transitional doctype)", () => {
		// A 4.01-Transitional public id (no system id) selects quirks mode, where
		// `<table>` does NOT close an open `<p>`.
		const quirks = body(
			'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><p>x<table></table>'
		);
		expect(quirks).toHaveLength(1);
		expect(quirks[0].tagName).toBe("p");
		expect(child(quirks[0].children, "table")).toBeDefined();

		// No-quirks: `<table>` closes the `<p>` so they are siblings.
		const standard = body("<!DOCTYPE html><p>x<table></table>");
		expect(standard.map((n) => n.tagName)).toEqual(["p", "table"]);
	});

	it("should mirror the selected <option> into <selectedcontent>", () => {
		const select = body(
			"<select><button><selectedcontent></button><option><span id=x>Y</span>"
		)[0];
		const selectedcontent = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		const span = /** @type {MatElement} */ (selectedcontent.children[0]);
		expect(span.tagName).toBe("span");
		expect(/** @type {MatText} */ (span.children[0]).data).toBe("Y");
		// The clone carries the attribute name/value but no source offsets, so
		// the consumer never re-emits a dependency for it.
		expect(span.attributes[0].name).toBe("id");
		expect(span.attributes[0].value).toBe("x");
		expect(span.attributes[0].valueStart).toBe(-1);
	});

	it("clones <template> content when mirroring into <selectedcontent>", () => {
		const select = body(
			"<select><button><selectedcontent></button><option><template><p>x</p></template>"
		)[0];
		const selectedcontent = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		const template = /** @type {MatElement} */ (selectedcontent.children[0]);
		expect(template.tagName).toBe("template");
		// The cloned template keeps its own document-fragment content.
		const fragment = /** @type {MatFragment} */ (template.templateContent);
		expect(fragment.type).toBe(NodeType.DocumentFragment);
		expect(/** @type {MatElement} */ (fragment.children[0]).tagName).toBe("p");
	});

	it("mirrors nothing written inside the <option> itself", () => {
		const select = body(
			"<select><button><selectedcontent></button><option>x<selectedcontent>"
		)[0];
		// The option is what mirroring reads, so a `<selectedcontent>` written
		// there stays as authored while the button's takes the clone.
		const inner = child(
			child(select.children, "option").children,
			"selectedcontent"
		);
		expect(inner.children).toHaveLength(0);
		const mirrored = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(/** @type {MatText} */ (mirrored.children[0]).data).toBe("x");
		expect(/** @type {MatElement} */ (mirrored.children[1]).tagName).toBe(
			"selectedcontent"
		);
	});

	it("mirrors a <select> carried into the clone", () => {
		const select = body(
			"<select><button><selectedcontent></button><option><template><select><button><selectedcontent></button><option>n</select></template>"
		)[0];
		const fragment = /** @type {MatFragment} */ (
			/** @type {MatElement} */ (
				child(child(select.children, "button").children, "selectedcontent")
					.children[0]
			).templateContent
		);
		const cloned = /** @type {MatElement} */ (fragment.children[0]);
		const mirrored = child(
			child(cloned.children, "button").children,
			"selectedcontent"
		);
		// The clone is a select of its own, so its `<selectedcontent>` mirrors
		// there even though the one it was copied from did not.
		expect(/** @type {MatText} */ (mirrored.children[0]).data).toBe("n");
	});

	it("should mirror the last selected <option> into <selectedcontent>", () => {
		const select = body(
			"<select><button><selectedcontent></button><option>A<option selected>B"
		)[0];
		const selectedcontent = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(/** @type {MatText} */ (selectedcontent.children[0]).data).toBe("B");
	});

	it("foster-parents stray text in a table fragment context", () => {
		// Context is a `table`, so there is no `<table>` on the open stack: stray
		// character data is fostered to the fragment root, beside the table rows.
		const root = /** @type {MatElement} */ (
			parseHtml("<tr><td>a</td></tr>x", "table").children[0]
		);
		const texts = root.children
			.filter((c) => c.type === NodeType.Text)
			.map((c) => /** @type {MatText} */ (c).data);
		expect(texts).toContain("x");
		expect(child(root.children, "tbody")).toBeDefined();
	});
});

describe("parseHtml — SourceProcessor", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
const { NodeType } = require("../../../lib/html/syntax-parser");

	it("fires enter / exit visitors in source order", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Element]: {
						enter: (path) => log.push(`enter:${path.name()}`),
						exit: (path) => log.push(`exit:${path.name()}`)
					},
					[NodeType.Text]: (path) => log.push(`text:${path.value()}`)
				})
			)
			.process("<div><span>a</span>b</div>");
		expect(log).toEqual([
			"enter:html",
			"enter:head",
			"exit:head",
			"enter:body",
			"enter:div",
			"enter:span",
			"text:a",
			"exit:span",
			"text:b",
			"exit:div",
			"exit:body",
			"exit:html"
		]);
	});

	it("visits the document root with a null parent", () => {
		/** @type {[number, number | null][]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.Document]: (path) => seen.push([path.type(), path.parent])
			})
			.process("<p>x");
		expect(seen).toEqual([[NodeType.Document, null]]);
	});

	it("fires comment / doctype visitors", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Doctype]: () => log.push("doctype"),
				[NodeType.Comment]: (path) => log.push(`comment:${path.value()}`)
			})
			.process("<!DOCTYPE html><!--c--><p>x</p>");
		expect(log).toEqual(["doctype", "comment:c"]);
	});

	it("path.skipChildren() stops descent into a node", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Element]: (path) => {
					log.push(path.name());
					if (path.name() === "div") path.skipChildren();
				}
			})
			.process("<div><span>a</span></div><p>b</p>");
		expect(log).toEqual(["html", "head", "body", "div", "p"]);
	});

	it("walks <template> content as a document fragment", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.DocumentFragment]: () => log.push("fragment"),
				[NodeType.Element]: (path) => log.push(path.name())
			})
			.process("<template><p>x</p></template>");
		expect(log).toEqual(["html", "head", "template", "fragment", "p", "body"]);
	});

	it("use() chains and accumulates visitors per type", () => {
		let a = 0;
		let b = 0;
		const sp = new SourceProcessor()
			.use({ [NodeType.Element]: () => a++ })
			.use({ [NodeType.Element]: () => b++ });
		expect(sp).toBeInstanceOf(SourceProcessor);
		sp.process("<p>x");
		expect(a).toBe(b);
		expect(a).toBeGreaterThan(0);
	});
});

describe("parseHtml — insertion-mode edge cases", () => {
	it("merges foster-parented text runs before a table", () => {
		const nodes = body("<table>x<tr></tr>y</table>");
		// Both stray runs are fostered before the table and merged into one node.
		expect(
			/** @type {MatText} */ (/** @type {unknown} */ (nodes[0])).data
		).toBe("xy");
		expect(nodes[1].type).toBe(NodeType.Element);
	});

	it("does not read raw text for a tag the frameset modes ignore", () => {
		// §13.2.6.4.10 hands only `noframes` to the head rules; every other tag is
		// ignored, and an ignored one never switches the tokenizer.
		const frameset = find("<frameset><textarea><frame></textarea>", "frameset");
		expect(/** @type {MatElement} */ (frameset.children[0]).tagName).toBe(
			"frame"
		);
		// `noframes` keeps its raw text, so the `<frame>` inside it is not one.
		const noframes = find("<frameset><noframes><frame></noframes>", "noframes");
		expect(noframes.children[0].type).toBe(NodeType.Text);
	});

	it("keeps end tags and comments under foreign rules inside <svg>", () => {
		const svg = find("<svg><circle></circle><!--c--></svg>", "svg");
		expect(/** @type {MatElement} */ (svg.children[0]).tagName).toBe("circle");
		expect(svg.children[1].type).toBe(NodeType.Comment);
	});

	it("ignores stray end tags before head", () => {
		const nodes = body("</div><p>x</p>");
		expect(/** @type {MatElement} */ (nodes[0]).tagName).toBe("p");
	});

	it("handles <noscript> in head with comments, whitespace, and stray tags", () => {
		const noscript = find(
			"<head><noscript><!--c--> <link></div><head></noscript></head>",
			"noscript"
		);
		expect(noscript.children[0].type).toBe(NodeType.Comment);
		expect(
			/** @type {MatElement} */ (
				noscript.children.find((c) => c.type === NodeType.Element)
			).tagName
		).toBe("link");
	});

	it("pops <noscript> in head on non-passthrough content", () => {
		// <span> is not allowed in head-noscript: noscript is popped and the
		// span lands in the body.
		const nodes = body("<head><noscript><span>x</span></noscript></head>");
		expect(/** @type {MatElement} */ (nodes[0]).tagName).toBe("span");
	});

	it("keeps comments between </head> and <body>", () => {
		const root = html("<head></head><!--c--><body>x</body>");
		expect(root.children.some((c) => c.type === NodeType.Comment)).toBe(true);
	});

	it("re-dispatches EOF inside an unterminated <template>", () => {
		const template = find("<template>x", "template");
		expect(template.templateContent).toBeDefined();
	});

	it("keeps comments inside <table>", () => {
		const table = find("<table><!--c--></table>", "table");
		expect(table.children[0].type).toBe(NodeType.Comment);
	});

	it("closes <caption> via </caption>, </table>, and row triggers", () => {
		const t1 = find("<table><caption>a</caption></table>", "table");
		expect(/** @type {MatElement} */ (t1.children[0]).tagName).toBe("caption");
		// A <tr> start while in caption closes the caption first.
		const t2 = find("<table><caption>a<tr><td>b</table>", "table");
		expect(/** @type {MatElement} */ (t2.children[0]).tagName).toBe("caption");
		expect(child(t2.children, "tbody")).toBeDefined();
		// Ignored stray ends inside caption.
		const t3 = find("<table><caption>a</td></tbody>b</table>", "table");
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (t3.children[0]).children[0]
			).data
		).toBe("ab");
	});

	it("parses <colgroup> with cols, comments, and implicit close", () => {
		const table = find(
			"<table><colgroup><!--c--><col span='2'></col></colgroup><tr><td>x</table>",
			"table"
		);
		const colgroup = child(table.children, "colgroup");
		expect(colgroup.children.some((c) => c.type === NodeType.Comment)).toBe(
			true
		);
		expect(child(colgroup.children, "col")).toBeDefined();
		// Implicit close: a row start while in colgroup pops it.
		expect(child(table.children, "tbody")).toBeDefined();
		// Character data pops colgroup back to table (fostered out).
		const t2 = find("<table><colgroup>x</table>", "table");
		expect(child(t2.children, "colgroup")).toBeDefined();
	});

	it("closes a row via </tbody> and ignores stray cell ends in a row", () => {
		const table = find("<table><tbody><tr><td>a</td></tbody></table>", "table");
		const tbody = child(table.children, "tbody");
		expect(child(child(tbody.children, "tr").children, "td")).toBeDefined();
		// ROW_IGNORED_ENDS: a stray </td> directly in row mode is dropped.
		const t2 = find("<table><tr></td><td>b</td></tr></table>", "table");
		expect(
			child(child(child(t2.children, "tbody").children, "tr").children, "td")
		).toBeDefined();
	});

	it("handles content after </html> (after-after-body)", () => {
		const ast = parseHtml("<p>a</p></html><!--c-->z");
		// Comment after </html> attaches to the document.
		expect(ast.children.some((c) => c.type === NodeType.Comment)).toBe(true);
		// Non-whitespace text re-enters the body.
		const texts = body("<p>a</p></html>z");
		expect(
			/** @type {MatText} */ (/** @type {MatElement} */ (texts[0]).children[0])
				.data
		).toBe("a");
	});

	it("parses nested frameset elements, frames, and noframes", () => {
		const src =
			"<frameset cols='50%,50%'> <!--c--><frame src='a'><frameset><frame></frameset></frameset> <!--d--></html> <!--e--><noframes>n</noframes>";
		const root = html(src);
		const frameset = child(root.children, "frameset");
		expect(frameset).toBeDefined();
		expect(child(frameset.children, "frame")).toBeDefined();
		expect(child(frameset.children, "frameset")).toBeDefined();
		expect(frameset.children.some((c) => c.type === NodeType.Comment)).toBe(
			true
		);
		// afterFrameset comment + </html> → afterAfterFrameset comment/noframes.
		const ast = parseHtml(src);
		expect(ast.children.some((c) => c.type === NodeType.Comment)).toBe(true);
		expect(find(src, "noframes")).toBeDefined();
	});

	it("ignores </frameset> at the root frameset and html start in frameset", () => {
		const src = "<frameset></frameset></frameset><html lang='x'>";
		expect(child(html(src).children, "frameset")).toBeDefined();
	});

	it("mirrors the selected option from an <optgroup> into <selectedcontent>", () => {
		const select = body(
			"<select><button><selectedcontent></selectedcontent></button><optgroup><option selected>B</optgroup></select>"
		)[0];
		const selectedcontent = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(/** @type {MatText} */ (selectedcontent.children[0]).data).toBe("B");
	});
});

describe("parseHtml — stray doctype and <html> re-dispatch", () => {
	it("ignores a mid-document doctype and merges stray <html> attributes", () => {
		// A stray doctype is dropped and a repeated <html> merges new
		// attributes in colgroup / table / noscript / frameset modes.
		const t = find(
			"<table><colgroup><!DOCTYPE html></col><template></template><col></colgroup></table>",
			"table"
		);
		expect(child(child(t.children, "colgroup").children, "col")).toBeDefined();
		expect(find("<table><colgroup>", "colgroup")).toBeDefined();
		expect(
			find("<head><noscript><!DOCTYPE html></noscript>", "noscript")
		).toBeDefined();
		const t2 = find("<table><!DOCTYPE html><tr><td>x</table>", "table");
		expect(child(t2.children, "tbody")).toBeDefined();
	});

	it("handles stray doctype and <html> around frameset content", () => {
		const root = html(
			"<frameset><!DOCTYPE html><html lang='a'><frame></frameset><!DOCTYPE html><html lang='b'></html><!DOCTYPE html><html lang='c'>"
		);
		expect(child(root.children, "frameset")).toBeDefined();
		// The stray <html> start tags merged their attributes into the root.
		expect(root.attributes.some((a) => a.name === "lang")).toBe(true);
	});

	it("merges stray <html> after </html> (after-after-body)", () => {
		const root = html("<p>x</p></html><html lang='z'>");
		expect(root.attributes.some((a) => a.name === "lang")).toBe(true);
	});
});

// The `skip` options only reduce output: tree construction and quirks detection
// still run identically, so the element tree — tags, nesting, offsets and
// attributes — is the same under any combination as under none.
describe("parseHtml — skip options preserve element structure", () => {
	// A spread of construction edge cases: foster parenting, adoption agency,
	// select/table/ruby scoping, foreign content, raw-text elements, quirks.
	const cases = [
		"<!DOCTYPE html><html><head><title>t</title></head><body>hi</body></html>",
		"<table>foo<td>bar</td></table>",
		"a<table>b</table>c",
		"text<table><tbody><tr>cell<td>real</table>after",
		"<p>a<b>b<i>c</p>d</i>e",
		"<b>1<p>2</b>3",
		"<a>1<a>2<a>3",
		"<select>x<option>y</option>z</select>",
		"<ruby>base<rt>anno</rt></ruby>",
		"<div><table>txt<svg><foreignObject><div>x</div></foreignObject></svg></table></div>",
		"<math><mtext>t<mglyph>g</math>after",
		"<script>var a = 1 < 2 && '</x>';</script><style>.a{color:red}</style>",
		"<pre>\nkeep</pre><textarea>\nx</textarea>",
		"<!-- c1 --><p>x<!-- c2 --></p><!-- c3 -->",
		"<frameset>x<frame></frameset>",
		// Foreign-content CDATA becomes character data (dropped as prose).
		"<svg><![CDATA[cdata text]]><rect/></svg>",
		// No doctype → quirks mode; skip.doctype must not change that.
		"<table><tr><td>quirks</td></tr></table>",
		// Entities/whitespace in prose text (whitespace routing in head/table).
		"  <html>  <head>  </head>  <body> a &amp; b &#60; c </body> </html>",
		// Escapable raw-text bodies + a title in head.
		"<title>page &amp; more</title><textarea>form\ntext</textarea>",
		// Button scope + implied end tags.
		"<button><p>x</button>y",
		// Comment-only document.
		"<!-- only a comment -->",
		// `skip.text` whitespace fast-path fallbacks: whitespace-producing
		// character references, CR normalization, and NUL must still route text
		// exactly (these decide foster-parenting / framesetOk).
		"<table>&#32;&#9;<td>a</td></table>",
		"<div>&#32;&#32;</div>plain  text",
		"a<table>\r\n  <tr><td>b\0c</td></tr></table>d",
		"<pre>\r\nkeep</pre>"
	];

	/**
	 * @param {MatDocument} doc document
	 * @returns {string} a signature of the element tree (tags, nesting, offsets, attrs)
	 */
	const elementSignature = (doc) => {
		/** @type {string[]} */
		const out = [];
		/**
		 * @param {MatNode | MatDocument | MatFragment} node node
		 * @param {number} depth depth
		 */
		const walk = (node, depth) => {
			if (node.type === NodeType.Element) {
				const attrs = node.attributes
					.map(
						(a) =>
							`${a.name}(${a.nameStart},${a.nameEnd},${a.valueStart},${a.valueEnd})`
					)
					.join(",");
				out.push(
					`${depth}:${node.tagName}@${node.namespace}[${node.start},${node.end},${node.tagEnd},${node.nameEnd}]{${attrs}}`
				);
				if (node.templateContent) {
					for (const c of node.templateContent.children) walk(c, depth + 1);
				}
			}
			if ("children" in node) {
				for (const c of node.children) walk(c, depth + 1);
			}
		};
		walk(doc, 0);
		return out.join("\n");
	};

	// Every non-empty subset of the skip flags (incl. { text, doctype }, the
	// combination HtmlParser uses).
	const skipCombos = [
		{ text: true },
		{ comments: true },
		{ doctype: true },
		{ text: true, comments: true },
		{ text: true, doctype: true },
		{ comments: true, doctype: true },
		{ text: true, comments: true, doctype: true }
	];

	it.each(cases)("keeps the element tree stable under skip (%s)", (src) => {
		const baseline = elementSignature(parseHtml(src));
		for (const skip of skipCombos) {
			expect(elementSignature(parseHtml(src, undefined, skip))).toBe(baseline);
		}
	});

	it("skip.text drops every text node; raw-text bodies stay readable via contentEnd", () => {
		const src = "<p>prose</p><script>var x=1;</script>";
		const doc = parseHtml(src, undefined, { text: true });
		/** @type {MatText[]} */
		const texts = [];
		/** @type {MatElement | undefined} */
		let script;
		/** @param {MatNode} n node */
		const walk = (n) => {
			if (n.type === NodeType.Text) texts.push(n);
			if (n.type === NodeType.Element) {
				if (n.tagName === "script") script = n;
				for (const c of n.children) walk(c);
			}
		};
		for (const c of doc.children) walk(c);
		// No text nodes at all — not even the <script> body.
		expect(texts).toHaveLength(0);
		// The body is read by offset from the element's [tagEnd, contentEnd].
		expect(
			src.slice(
				/** @type {MatElement} */ (script).tagEnd,
				/** @type {MatElement} */ (script).contentEnd
			)
		).toBe("var x=1;");
	});

	it("skip.comments drops comment nodes; skip.doctype drops the doctype node", () => {
		const src = "<!DOCTYPE html><!-- c --><p></p>";
		const count = (
			/** @type {MatDocument} */ doc,
			/** @type {number} */ type
		) => {
			let n = 0;
			/** @param {MatNode} node node */
			const walk = (node) => {
				if (node.type === type) n++;
				if ("children" in node) for (const c of node.children) walk(c);
			};
			for (const c of doc.children) walk(c);
			return n;
		};
		expect(
			count(parseHtml(src, undefined, { comments: true }), NodeType.Comment)
		).toBe(0);
		expect(
			count(parseHtml(src, undefined, { doctype: true }), NodeType.Doctype)
		).toBe(0);
		// Baseline still has both.
		expect(count(parseHtml(src), NodeType.Comment)).toBe(1);
		expect(count(parseHtml(src), NodeType.Doctype)).toBe(1);
	});

	it("skip.text records every raw-text element body span on contentEnd", () => {
		// script/style (raw text) + textarea/title (escapable raw text): each body
		// is the element's raw value, recorded as [tagEnd, contentEnd] — no Text node.
		const src =
			"<title>ti</title><style>.s{}</style></head><body>prose<script>sc</script><textarea>ta</textarea>";
		const doc = parseHtml(src, undefined, { text: true });
		/** @type {Record<string, string>} */
		const bodies = {};
		/** @param {MatNode} n node */
		const walk = (n) => {
			// No Text nodes are emitted under skip.text.
			expect(n.type).not.toBe(NodeType.Text);
			if (n.type === NodeType.Element) {
				// A body read as raw text has no child nodes left to hold it.
				if (n.children.length === 0 && n.contentEnd > n.tagEnd) {
					bodies[n.tagName] = src.slice(n.tagEnd, n.contentEnd);
				}
				for (const c of n.children) walk(c);
			}
		};
		for (const c of doc.children) walk(c);
		expect(bodies).toEqual({
			title: "ti",
			style: ".s{}",
			script: "sc",
			textarea: "ta"
		});
	});

	it("skip.text records contentEnd for foreign-content <style>/<script>", () => {
		// SVG <style>/<script> stay in the SVG namespace and their bodies are plain
		// text; HtmlParser extracts them regardless of namespace, so contentEnd must
		// be recorded here too.
		const src = "<svg><style>.a{}</style><script>x()</script></svg>";
		const doc = parseHtml(src, undefined, { text: true });
		/** @type {Record<string, string>} */
		const bodies = {};
		/** @param {MatNode} n node */
		const walk = (n) => {
			if (n.type === NodeType.Element) {
				// A body read as raw text has no child nodes left to hold it.
				if (n.children.length === 0 && n.contentEnd > n.tagEnd) {
					bodies[n.tagName] = src.slice(n.tagEnd, n.contentEnd);
				}
				for (const c of n.children) walk(c);
			}
		};
		for (const c of doc.children) walk(c);
		expect(bodies).toEqual({ style: ".a{}", script: "x()" });
	});

	it("skip options preserve element structure under fragment parsing", () => {
		// Fragment contexts drive a different initial insertion mode; skips must
		// still leave the element tree (and offsets) identical.
		/** @type {[string, string][]} */
		const fragments = [
			["<td>a</td><tr><td>b", "table"],
			["<li>x<li>y", "ul"],
			["text<b>bold</b>", "div"],
			["<rect/>text", "svg"]
		];
		for (const [src, ctx] of fragments) {
			const base = elementSignature(parseHtml(src, ctx));
			for (const skip of skipCombos) {
				expect(elementSignature(parseHtml(src, ctx, skip))).toBe(base);
			}
		}
	});
});

describe("parseHtml — tree-construction edge cases (SoA columns)", () => {
	/**
	 * @param {string} src source
	 * @param {import("../../../lib/html/syntax-parser").HtmlAstSkip=} skip skip options
	 * @returns {MatNode[]} body children
	 */
	const bodyOf = (src, skip) =>
		child(
			child(parseHtml(src, undefined, skip).children, "html").children,
			"body"
		).children;

	it("grows the node and attribute columns past their initial capacity", () => {
		let src = "";
		for (let i = 0; i < 5000; i++) src += `<i data-n="${i}"></i>`;
		const nodes = body(src);
		expect(nodes).toHaveLength(5000);
		expect(nodes[4999].attributes[0].value).toBe("4999");
	});

	it("re-shrinks the columns after a pathologically large document", () => {
		// > 64 Ki nodes and attributes grow the columns past the shrink
		// threshold; the release after the parse re-shrinks them and the next
		// parse must work from the re-grown baseline
		let src = "";
		for (let i = 0; i < 70000; i++) src += `<i data-n="${i}"></i>`;
		const nodes = body(src);
		expect(nodes).toHaveLength(70000);
		expect(nodes[69999].attributes[0].value).toBe("69999");
		const small = body('<b class="c">x</b>');
		expect(small).toHaveLength(1);
		expect(small[0].attributes[0].value).toBe("c");
	});

	it("handles a large structurally sparse document", () => {
		// Exercise both byte-length estimate caps without needing enough nodes or
		// attributes to fill the speculative columns.
		const nodes = body(`<!--${"x".repeat(3200000)}--><p>x</p>`);
		expect(nodes).toHaveLength(1);
		expect(nodes[0]).toEqual(
			expect.objectContaining({ tagName: "p", children: [expect.any(Object)] })
		);
		expect(body("<b>y</b>")[0]).toEqual(
			expect.objectContaining({ tagName: "b" })
		);
	});

	it("merges texts left adjacent by a skipped comment", () => {
		const nodes = bodyOf("a<!--c-->b", { comments: true });
		expect(nodes).toEqual([
			expect.objectContaining({ type: NodeType.Text, data: "ab" })
		]);
	});

	it("foster-parents text inside <template> containing a table", () => {
		const template = head("<template><table>x</table></template>")[0];
		const content = /** @type {MatFragment} */ (template.templateContent);
		expect(content.children.map((c) => c.type)).toEqual([
			NodeType.Text,
			NodeType.Element
		]);
		expect(/** @type {MatText} */ (content.children[0]).data).toBe("x");
	});

	it("splits leading whitespace out of a <colgroup>", () => {
		const table = child(bodyOf("<table><colgroup> x<col>"), "table");
		// "x" pops the colgroup (fostered before the table); <col> reopens one.
		const colgroups = table.children.filter(
			(c) => c.type === NodeType.Element && c.tagName === "colgroup"
		);
		expect(colgroups).toHaveLength(2);
		expect(
			child(/** @type {MatElement} */ (colgroups[1]).children, "col")
		).toBeDefined();
	});

	it("closes a <colgroup> on its end tag and on anything-else", () => {
		const t1 = child(
			bodyOf("<table><colgroup><col></colgroup><tr><td>x"),
			"table"
		);
		expect(child(t1.children, "colgroup")).toBeDefined();
		expect(child(t1.children, "tbody")).toBeDefined();
		const t2 = child(bodyOf("<table><colgroup><tbody><tr><td>x"), "table");
		expect(child(t2.children, "tbody")).toBeDefined();
	});

	it("ends what is open around an option only inside a select", () => {
		// §"in body": in select scope `<option>` implies end tags but `<optgroup>`,
		// `<hr>` implies all; outside one only an open `<option>` gives way.
		const inSelect = child(bodyOf("<select><p><option>"), "select");
		expect(
			inSelect.children
				.filter((c) => c.type === NodeType.Element)
				.map((c) => /** @type {MatElement} */ (c).tagName)
		).toEqual(["p", "option"]);
		// An `<optgroup>` is kept by an `<option>` and ended by an `<hr>`.
		const grouped = child(bodyOf("<select><optgroup><option>"), "select");
		expect(
			/** @type {MatElement} */ (child(grouped.children, "optgroup")).children
		).toHaveLength(1);
		// No select in scope: the option keeps the `<hr>` written inside it.
		const loose = child(bodyOf("<div><option>o<hr>"), "div");
		const option = child(loose.children, "option");
		expect(
			option.children.some(
				(c) =>
					c.type === NodeType.Element &&
					/** @type {MatElement} */ (c).tagName === "hr"
			)
		).toBe(true);
		// `<li>` is implied-end-tag material too, so the `<hr>` ends it as well.
		const separated = child(bodyOf("<select><li><hr>"), "select");
		expect(
			separated.children
				.filter((c) => c.type === NodeType.Element)
				.map((c) => /** @type {MatElement} */ (c).tagName)
		).toEqual(["li", "hr"]);
	});

	it("moves an <hr> out of option/optgroup context in <select>", () => {
		const select = child(
			bodyOf("<select><option>a<optgroup><option>b<hr><option>c"),
			"select"
		);
		const tags = select.children
			.filter((c) => c.type === NodeType.Element)
			.map((c) => /** @type {MatElement} */ (c).tagName);
		expect(tags).toContain("hr");
	});

	it("keeps <selectedcontent> content when the select has no options", () => {
		const select = child(
			bodyOf(
				"<select><button><selectedcontent>x</selectedcontent></button></select>"
			),
			"select"
		);
		const sc = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(sc.children).toEqual([
			expect.objectContaining({ type: NodeType.Text, data: "x" })
		]);
	});

	it("mirrors the last selected option found inside an <optgroup>", () => {
		const select = child(
			bodyOf(
				"<select><button><selectedcontent></selectedcontent></button><optgroup> <option>A<option selected>B</optgroup></select>"
			),
			"select"
		);
		const sc = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(/** @type {MatText} */ (sc.children[0]).data).toBe("B");
	});

	it("applies the Noah's Ark clause to identical formatting elements", () => {
		// Four identical <b class="x"> in the active formatting list: only three
		// survive, so the reconstruction in the second <p> nests three <b>.
		const src =
			'<p>1<b class="x"><b class="x"><b class="x"><b class="x">2</p><p>3';
		const paragraphs = bodyOf(src).filter(
			(c) => c.type === NodeType.Element && c.tagName === "p"
		);
		/**
		 * @param {MatElement} el element
		 * @returns {number} depth of nested <b>
		 */
		const bDepth = (el) => {
			let depth = 0;
			for (let b = child(el.children, "b"); b; b = child(b.children, "b")) {
				depth++;
			}
			return depth;
		};
		expect(bDepth(/** @type {MatElement} */ (paragraphs[0]))).toBe(4);
		expect(bDepth(/** @type {MatElement} */ (paragraphs[1]))).toBe(3);
	});

	it("clones attributes when the adoption agency splits a formatting element", () => {
		const p = find('<b class="x">1<p>2</b>3', "p");
		const clone = child(p.children, "b");
		expect(clone.attributes).toEqual([
			expect.objectContaining({ name: "class", value: "x" })
		]);
	});

	it("treats <annotation-xml encoding=text/html> as an integration point", () => {
		const ax = find(
			'<math><annotation-xml encoding="text/html"><div>x</div></annotation-xml></math>',
			"annotation-xml"
		);
		const div = child(ax.children, "div");
		expect(div.namespace).toBe(Namespace.HTML);
	});

	it("adjusts SVG and MathML attribute names", () => {
		const svg = find('<svg viewbox="0 0 1 1" xlink:href="#a"/>', "svg");
		const byName = new Map(svg.attributes.map((a) => [a.name, a]));
		expect(byName.has("viewBox")).toBe(true);
		const xlink = /** @type {HtmlAttribute} */ (byName.get("xlink:href"));
		expect(xlink.serializedName).toBe("xlink href");
		const math = find('<math definitionurl="u">', "math");
		expect(math.attributes[0].name).toBe("definitionURL");
	});

	it("breaks a <font> with a color attribute out of foreign content", () => {
		const nodes = bodyOf('<svg><font color="red">x');
		const font = child(nodes, "font");
		expect(font.namespace).toBe(Namespace.HTML);
		// Without a breakout attribute the font stays inside the svg.
		const svg = child(bodyOf("<svg><font other=1>x"), "svg");
		expect(child(svg.children, "font").namespace).toBe(Namespace.SVG);
	});

	it("merges attributes of a repeated <body> tag", () => {
		const doc = parseHtml('<body class="a"><body id="b" class="c">x');
		const bodyEl = child(child(doc.children, "html").children, "body");
		const byName = new Map(bodyEl.attributes.map((a) => [a.name, a.value]));
		expect(byName.get("class")).toBe("a");
		expect(byName.get("id")).toBe("b");
	});

	it("replaces an empty <body> with a <frameset>", () => {
		// An implied body (opened by <div>) leaves frameset-ok set, so the
		// <frameset> detaches it; an explicit <body> tag would clear the flag.
		const doc = parseHtml(
			'<div><frameset rows="1"> <frameset cols="2"><frame></frameset></frameset>'
		);
		const htmlEl = child(doc.children, "html");
		expect(child(htmlEl.children, "body")).toBeUndefined();
		const outer = child(htmlEl.children, "frameset");
		const inner = child(outer.children, "frameset");
		expect(child(inner.children, "frame")).toBeDefined();
	});

	it("closes an open <dd> when a <dt> starts", () => {
		const dl = child(bodyOf("<dl><dd>a<dt>b</dl>"), "dl");
		const items = dl.children
			.filter((c) => c.type === NodeType.Element)
			.map((c) => /** @type {MatElement} */ (c).tagName);
		expect(items).toEqual(["dd", "dt"]);
	});

	it("closes an open <a> when a new <a> starts", () => {
		const nodes = bodyOf('<a href="1">x<a href="2">y');
		const anchors = nodes.filter(
			(c) => c.type === NodeType.Element && c.tagName === "a"
		);
		expect(anchors).toHaveLength(2);
	});

	it("closes an open <button> when a new <button> starts", () => {
		const nodes = bodyOf("<button>a<button>b");
		const buttons = nodes.filter(
			(c) => c.type === NodeType.Element && c.tagName === "button"
		);
		expect(buttons).toHaveLength(2);
	});

	it("closes an open heading when a new heading starts", () => {
		const tags = bodyOf("<h1>a<h2>b")
			.filter((c) => c.type === NodeType.Element)
			.map((c) => /** @type {MatElement} */ (c).tagName);
		expect(tags).toEqual(["h1", "h2"]);
	});

	it("</form> closes the form even with open descendants", () => {
		const form = child(bodyOf("<form><div>x</form>y<input>"), "form");
		// The stray input after </form> lands in the div (still open), not the form.
		expect(child(child(form.children, "div").children, "input")).toBeDefined();
	});

	it("keeps <input type=hidden> inside a table", () => {
		const table = child(
			bodyOf('<table><input type="hidden"><input type="text"></table>'),
			"table"
		);
		const hidden = child(table.children, "input");
		expect(hidden.attributes[0].value).toBe("hidden");
	});

	it("attaches comments after </body> to the <html> element", () => {
		const htmlEl = child(parseHtml("x</body><!--c-->").children, "html");
		expect(htmlEl.children.map((c) => c.type)).toContain(NodeType.Comment);
	});

	it("parses text in a foreign fragment context", () => {
		const doc = parseHtmlRefs("x<div>y", 0, { fragmentContext: "svg" });
		const root = A.child(0, doc);
		expect(A.type(A.child(0, root))).toBe(NodeType.Text);
	});

	it("runs the adoption agency in a table-row fragment context", () => {
		const doc = parseHtml("<b>x<tr>y</b>z", "tr");
		const root = child(doc.children, "html");
		expect(
			/** @type {MatText} */ (child(root.children, "b").children[0]).data
		).toBe("xy");
	});
});

describe("SourceProcessor — streamed walk recycling", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	// Every case is sized past the streaming threshold (49152 nodes) to reach
	// what one pass at EOF cannot: entering an open element, flushing under it,
	// recycling node ids. It counts nodes, so the repeat counts are per-shape.
	const BIG = 40000;
	const BIG_ROWS = 15000;

	/**
	 * @param {string} inner repeated markup
	 * @param {number=} times repetitions (default `BIG`)
	 * @returns {string} a document past the streaming threshold
	 */
	const bigBody = (inner, times = BIG) =>
		`<!DOCTYPE html><html><body>${inner.repeat(times)}</body></html>`;

	/**
	 * @param {string} src source
	 * @param {import("../../../lib/html/syntax-parser").HtmlProcessOptions=} options options
	 * @returns {string[]} `+tag` / `-tag` in visit order
	 */
	const walk = (src, options) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Element]: {
						enter: (path) => log.push(`+${path.name()}`),
						exit: (path) => log.push(`-${path.name()}`)
					}
				})
			)
			.process(src, options);
		return log;
	};

	it("visits every element once across flush batches", () => {
		const log = walk(bigBody("<p><b>x</b></p>"));
		expect(log.filter((l) => l === "+p")).toHaveLength(BIG);
		expect(log.filter((l) => l === "+b")).toHaveLength(BIG);
		// enter/exit stay balanced, so nothing was visited twice or dropped
		expect(log.filter((l) => l.startsWith("+"))).toHaveLength(
			log.filter((l) => l.startsWith("-")).length
		);
	});

	it("keeps parents around their children across a recycle", () => {
		const log = walk(bigBody("<p><b>x</b></p>"));
		const body = log.slice(log.indexOf("+body") + 1, log.lastIndexOf("-body"));
		for (let i = 0; i < body.length; i += 4) {
			expect(body.slice(i, i + 4)).toEqual(["+p", "+b", "-b", "-p"]);
		}
	});

	it("materializes a streamed implied tag as the walked one does", () => {
		// The streamed path decides this where the node is known, the walked one on
		// the first piece emitted, so the two have to agree on the same document.
		const opening = "<tr><style>a{color:red}</style>";
		/**
		 * @param {string} src source
		 * @returns {string} the minified document
		 */
		const minify = (src) =>
			new SourceProcessor().process(src, {
				mode: "minify",
				removeImpliedTags: true
			}).code;
		const walked = minify(`${opening}<p>x</p>`);
		const streamed = minify(`${opening}${"<p>x</p>".repeat(BIG)}`);
		expect(streamed.slice(0, walked.length)).toBe(walked);
	});

	it("honours skipChildren() on a streamed element", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Element]: {
						enter: (path) => {
							log.push(`+${path.name()}`);
							// `div` stays open while its subtree streams, so its skipped
							// descendants are the ones the walk tracks without entering
							if (path.name() === "div") path.skipChildren();
						},
						exit: (path) => log.push(`-${path.name()}`)
					}
				})
			)
			.process(
				`<!DOCTYPE html><html><body><div>${"<p><b>x</b></p>".repeat(
					BIG
				)}</div></body></html>`
			);
		// the skipped element itself still exits; nothing below it is visited
		expect(log.filter((l) => l === "+div")).toHaveLength(1);
		expect(log.filter((l) => l === "-div")).toHaveLength(1);
		expect(log.filter((l) => l.endsWith("p") || l.endsWith("b"))).toHaveLength(
			0
		);
		// every exit pairs with an enter
		const open = [];
		for (const entry of log) {
			if (entry.startsWith("+")) open.push(entry.slice(1));
			else expect(open.pop()).toBe(entry.slice(1));
		}
		expect(open).toHaveLength(0);
	});

	it("merges adjacent text across a flush boundary", () => {
		/** @type {string[]} */
		const text = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Text]: (path) => text.push(path.value())
				})
			)
			// Entity references split the tokenizer's text runs; the walk must not
			// split the node too, so one text child stays one visit. The leading
			// paragraphs push the parse past the threshold before the entity run.
			.process(
				`<!DOCTYPE html><html><body>${"<p>x</p>".repeat(
					BIG
				)}<p id="tail">${"a&amp;b".repeat(2000)}</p></body></html>`
			);
		expect(text).toHaveLength(BIG + 1);
		expect(text[text.length - 1]).toHaveLength(2000 * 3);
	});

	it("streams a document whose form element leaves the open stack", () => {
		const log = walk(bigBody("<form><p>x</p></form>"));
		expect(log.filter((l) => l === "+form")).toHaveLength(BIG);
		expect(log.filter((l) => l === "-form")).toHaveLength(BIG);
	});

	it("does not re-visit an element the form end tag left open", () => {
		// `</form>` removes the form from the middle of the open stack while the
		// `div` inside stays open, so nothing has finished. Reconciling there
		// closes and re-enters the live `div`, which only the visit count catches.
		const log = walk(
			`<!DOCTYPE html><html><body><form>${"<p>x</p>".repeat(
				BIG
			)}<div></form><p>y</p></div></body></html>`
		);
		expect(log.filter((l) => l === "+div")).toHaveLength(1);
		expect(log.filter((l) => l === "-div")).toHaveLength(1);
		// the div nests inside the form in the tree, so it closes first
		const divExit = log.lastIndexOf("-div");
		expect(log.indexOf("-form")).toBeGreaterThan(divExit);
	});

	it("visits a form subtree the walk never entered before `</form>`", () => {
		// Same mid-stack removal, but the bulk sits *before* the form, so the walk
		// is streaming yet has never entered the form when `</form>` takes it off
		// the stack. Keying the halt on "was it entered" loses the whole subtree.
		const log = walk(
			`<!DOCTYPE html><html><body>${"<p>x</p>".repeat(
				BIG
			)}<form><div></form><p>y</p></div></body></html>`
		);
		expect(log.slice(log.indexOf("+form"))).toEqual([
			"+form",
			"+div",
			"+p",
			"-p",
			"-div",
			"-form",
			"-body",
			"-html"
		]);
	});

	it("streams tables, where flushing is held back", () => {
		const log = walk(bigBody("<table><tr><td>a</td></tr></table>", BIG_ROWS));
		expect(log.filter((l) => l === "+table")).toHaveLength(BIG_ROWS);
		expect(log.filter((l) => l === "+td")).toHaveLength(BIG_ROWS);
	});

	it.each([
		[
			"below the threshold",
			"<!DOCTYPE html><html><body><p>a</p></body></html>"
		],
		["past the threshold", bigBody("<p><b>x</b></p>")]
	])("honours skipChildren() on the root, %s", (_label, src) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Document]: {
						enter: (path) => {
							log.push("+doc");
							path.skipChildren();
						},
						exit: () => log.push("-doc")
					},
					[NodeType.Element]: {
						enter: (path) => log.push(`+${path.name()}`),
						exit: (path) => log.push(`-${path.name()}`)
					}
				})
			)
			.process(src);
		// the root still closes; nothing beneath it is visited at all
		expect(log).toEqual(["+doc", "-doc"]);
	});
});

describe("SourceProcessor — streamed walk offsets", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	// `HtmlParser` builds its head-injection anchors during the walk, so what it
	// reads must be final: `tagEnd()` for the still-open `<html>` / `<head>`, and
	// `end()` for the head's completed children. Assert both, at both sizes.
	it("reports final end offsets for head elements", () => {
		const SRC = [
			"<!DOCTYPE html><html><head><title>t</title>",
			'<script src="a.js"></script>',
			"<style>.a{color:red}</style>",
			'<link rel="stylesheet" href="a.css">',
			"</head><body><p>x</p></body></html>"
		].join("");
		/** @type {[string, number, number][]} */
		const seen = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Element]: (path) => {
						seen.push([path.name(), path.range()[0], path.range()[1]]);
					}
				})
			)
			.process(SRC);
		// A final `end` spans the element's own end tag; a provisional one would
		// stop at the start tag's `>`.
		const spans = new Map(
			seen.map(([name, start, end]) => [name, SRC.slice(start, end)])
		);
		expect(spans.get("title")).toBe("<title>t</title>");
		expect(spans.get("script")).toBe('<script src="a.js"></script>');
		expect(spans.get("style")).toBe("<style>.a{color:red}</style>");
		expect(spans.get("link")).toBe('<link rel="stylesheet" href="a.css">');
		expect(seen.map((s) => s[0])).toEqual([
			"html",
			"head",
			"title",
			"script",
			"style",
			"link",
			"body",
			"p"
		]);
	});

	it("reports a provisional end at enter and a final one at exit", () => {
		/**
		 * What the streamed walk does that a single pass at EOF cannot: enter an
		 * element before it closes, leaving its `end` provisional until `exit`.
		 * Below `_STREAM_MIN_NODES` the same markup is walked once at EOF, so the
		 * two reads agree and that contrast pins the streamed path.
		 * @param {number} rows how many children to wrap
		 * @returns {[number, number]} the outer element's `end` at enter and at exit
		 */
		const ends = (rows) => {
			const source = `<div id=outer>${"<p><b>x</b></p>".repeat(rows)}</div>`;
			let atEnter = -1;
			let atExit = -1;
			new SourceProcessor()
				.use(
					/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
						[NodeType.Element]: {
							enter: (path) => {
								if (path.name() === "div" && atEnter === -1) {
									atEnter = path.range()[1];
								}
							},
							exit: (path) => {
								if (path.name() === "div" && atExit === -1) {
									atExit = path.range()[1];
								}
							}
						}
					})
				)
				.process(source);
			return [atEnter, atExit];
		};

		const [smallEnter, smallExit] = ends(10);
		expect(smallEnter).toBe(smallExit);

		const [bigEnter, bigExit] = ends(40000);
		// Provisional: the start tag only, because `</div>` has not been seen yet.
		expect(bigEnter).toBe("<div id=outer>".length);
		// Final: the whole element, once the walk leaves it.
		expect(bigExit).toBe(
			`<div id=outer>${"<p><b>x</b></p>".repeat(40000)}</div>`.length
		);
	});

	it("refuses a nested parse rather than taking the walk's state over", () => {
		// One parse at a time: the walk's state is module-scoped, so a visitor that
		// started another would take this one's over and release its columns.
		expect(() =>
			new SourceProcessor()
				.use(
					/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
						[NodeType.Element]: () => {
							new SourceProcessor().process("<b>nested</b>");
						}
					})
				)
				.process("<p>x</p>")
		).toThrow(/already running/);
	});
});

describe("parseHtml — path accessor completeness", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	it("exposes node, parent links and attribute spans on the path", () => {
		const SRC = '<!DOCTYPE html PUBLIC "p" "s"><div id="d" checked>x</div>';
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Doctype]: (path) => {
						const n = path.node;
						log.push(
							`doctype:${path.textOf(Part.publicId, n)}/${path.textOf(Part.systemId, n)}`
						);
					},
					[NodeType.Element]: (path) => {
						if (path.name() !== "div") return;
						log.push(`node:${path.node !== null}`);
						log.push(
							`parentTag:${path.name(/** @type {number} */ (path.parent))}`
						);
						log.push(`index:${path.index}`);
						log.push(`attrs:${path.fieldCount(Field.attributes)}`);
						const id = path.fieldNamed(Field.attributes, "id");
						log.push(`id:${path.name(id)}=${path.value(id)}`);
						log.push(
							`idName:${SRC.slice(.../** @type {[number, number]} */ (path.rangeOf(Part.name, id)))}`
						);
						log.push(
							`idValue:${SRC.slice(.../** @type {[number, number]} */ (path.rangeOf(Part.value, id)))}`
						);
						log.push(`checkedValue:${path.rangeOf(Part.value, path.field(1, Field.attributes))}`);
						log.push(`firstChildType:${path.type(path.child(0))}`);
						log.push(
							`nextSibling:${path.child(
								path.index + 1,
								/** @type {number} */ (path.parent)
							)}`
						);
					}
				})
			)
			.process(SRC);
		expect(log).toEqual([
			"doctype:p/s",
			"node:true",
			"parentTag:body",
			"index:0",
			"attrs:2",
			"id:id=d",
			"idName:id",
			"idValue:d",
			"checkedValue:null",
			`firstChildType:${NodeType.Text}`,
			"nextSibling:0"
		]);
	});
});

describe("parseSrcset", () => {
	it("should return a single candidate with byte offsets", () => {
		expect(parseSrcset("a.png")).toEqual([["a.png", 0, 5]]);
	});

	it("should accept width, density and height descriptors", () => {
		expect(parseSrcset("a.png 480w")).toEqual([["a.png", 0, 5]]);
		expect(parseSrcset("a.png 2x")).toEqual([["a.png", 0, 5]]);
		expect(parseSrcset("a.png 480w 2h")).toEqual([["a.png", 0, 5]]);
	});

	it("should parse several comma-separated candidates", () => {
		expect(parseSrcset("a.png 480w, b.png 800w")).toEqual([
			["a.png", 0, 5],
			["b.png", 12, 17]
		]);
	});

	it("should accept a url that ends in a trailing comma", () => {
		expect(parseSrcset("a.png,")).toEqual([["a.png", 0, 5]]);
	});

	it("should throw on a zero width descriptor", () => {
		expect(() => parseSrcset("a.png 0w")).toThrow(/Invalid srcset descriptor/);
	});

	it("should throw on a negative density descriptor", () => {
		expect(() => parseSrcset("a.png -1x")).toThrow(/Invalid srcset descriptor/);
	});

	it("should throw on a descriptor after a zero density descriptor", () => {
		expect(parseSrcset("a.png 0x")).toEqual([["a.png", 0, 5]]);
		expect(() => parseSrcset("a.png 0x 1x")).toThrow(
			/Invalid srcset descriptor/
		);
		expect(() => parseSrcset("a.png 0x 1w")).toThrow(
			/Invalid srcset descriptor/
		);
		expect(() => parseSrcset("a.png 0x 1h")).toThrow(
			/Invalid srcset descriptor/
		);
	});

	it("should throw on conflicting descriptors", () => {
		expect(() => parseSrcset("a.png 480w 2x")).toThrow(
			/Invalid srcset descriptor/
		);
	});

	it("should throw on an unrecognized descriptor", () => {
		expect(() => parseSrcset("a.png foo")).toThrow(/Invalid srcset descriptor/);
	});

	it("should throw on duplicate or conflicting typed descriptors", () => {
		expect(() => parseSrcset("a.png 1w 2w")).toThrow(/Invalid srcset/);
		expect(() => parseSrcset("a.png 0h")).toThrow(/Invalid srcset/);
		expect(() => parseSrcset("a.png 2x 1h")).toThrow(/Invalid srcset/);
	});

	it("should traverse the in-parens descriptor state", () => {
		expect(() => parseSrcset("a.png (min-width:1px)x")).toThrow(
			/Invalid srcset descriptor/
		);
		// a parenthesized descriptor that runs to EOF
		expect(() => parseSrcset("a.png (foo")).toThrow(/Invalid srcset/);
	});

	it("should handle whitespace between a descriptor and EOF", () => {
		expect(parseSrcset("a.png 1w ")).toEqual([["a.png", 0, 5]]);
		// a second descriptor after the inter-descriptor whitespace
		expect(() => parseSrcset("a.png 1w x2")).toThrow(/Invalid srcset/);
	});

	it("should throw when there are no image candidate strings", () => {
		expect(() => parseSrcset("   ")).toThrow(
			/Must contain one or more image candidate strings/
		);
	});
});

describe("parseSrc", () => {
	const NBSP = String.fromCharCode(0xa0);
	const DEL = String.fromCharCode(0x7f);

	it("should trim ASCII whitespace and keep offsets", () => {
		expect(parseSrc("  a.png  ")).toEqual([["a.png", 2, 7]]);
	});

	it("should trim a surrounding U+00A0 no-break space", () => {
		expect(parseSrc(`${NBSP}a.png${NBSP}`)).toEqual([["a.png", 1, 6]]);
	});

	it("should strip ignorable control characters from the value", () => {
		expect(parseSrc(`a${DEL}.png`)).toEqual([["a.png", 0, 6]]);
	});

	it("should throw on empty and whitespace-only input", () => {
		expect(() => parseSrc("")).toThrow(/Must be non-empty/);
		expect(() => parseSrc("   ")).toThrow(/Must be non-empty/);
	});

	it("should throw when only ignorable characters remain", () => {
		expect(() => parseSrc(DEL)).toThrow(/Must be non-empty/);
	});
});

describe("parseMsapplicationTask", () => {
	it("should extract the icon-uri value with offsets", () => {
		expect(
			parseMsapplicationTask("name=n;action-uri=http://x;icon-uri=icon.png")
		).toEqual([["icon.png", 36, 44]]);
	});

	it("should return nothing when there is no icon-uri", () => {
		expect(parseMsapplicationTask("name=n;action-uri=http://x")).toEqual([]);
	});

	it("should return nothing for an empty icon-uri value", () => {
		expect(parseMsapplicationTask("icon-uri=   ")).toEqual([]);
	});

	it("should trim whitespace around the icon-uri value", () => {
		expect(parseMsapplicationTask("name=n;icon-uri= icon.png ;x=y")).toEqual([
			["icon.png", 17, 25]
		]);
	});
});

describe("parseCssUrls", () => {
	it("should extract an unquoted url() reference from a presentation attribute", () => {
		expect(parseCssUrls("fill:url(a.png)")).toEqual([["a.png", 9, 14]]);
	});

	it("should extract a quoted url() reference", () => {
		expect(parseCssUrls('fill:url("a.png")')).toEqual([["a.png", 10, 15]]);
		expect(parseCssUrls("fill:url('a.png')")).toEqual([["a.png", 10, 15]]);
	});

	it("should return nothing when the value carries no url()", () => {
		expect(parseCssUrls("fill:red")).toEqual([]);
	});

	it("should skip an empty url(), quoted or not", () => {
		expect(parseCssUrls("mask:url()")).toEqual([]);
		expect(parseCssUrls('mask:url("")')).toEqual([]);
		expect(parseCssUrls("mask:url( '' ) url(a.png)")).toEqual([
			["a.png", 19, 24]
		]);
	});
});

describe("JAVASCRIPT_SCRIPT_TYPES", () => {
	const { JAVASCRIPT_SCRIPT_TYPES } = require("../../../lib/html/data");

	// Pinned against the spec list, not read from the table: a dropped entry
	// would otherwise just shrink what the table-driven cases check.
	// cspell:ignore jscript livescript
	it("should carry every JavaScript MIME essence the spec lists", () => {
		expect([...JAVASCRIPT_SCRIPT_TYPES].sort()).toEqual([
			"",
			"application/ecmascript",
			"application/javascript",
			"application/x-ecmascript",
			"application/x-javascript",
			"module",
			"text/ecmascript",
			"text/javascript",
			"text/javascript1.0",
			"text/javascript1.1",
			"text/javascript1.2",
			"text/javascript1.3",
			"text/javascript1.4",
			"text/javascript1.5",
			"text/jscript",
			"text/livescript",
			"text/x-ecmascript",
			"text/x-javascript"
		]);
	});
});

describe("parseHtml — quirks and foreign-content arcs", () => {
	// In quirks mode `<table>` does not close an open `<p>`.
	/**
	 * @param {string} doctype the doctype to test
	 * @returns {boolean} whether the doctype selects quirks mode
	 */
	const isQuirks = (doctype) => {
		const nodes = body(`${doctype}<p>x<table></table>`);
		return nodes.length === 1 && nodes[0].tagName === "p";
	};

	it("selects quirks mode from the exact, prefix and system-id doctype lists", () => {
		expect(isQuirks('<!DOCTYPE html PUBLIC "HTML">')).toBe(true);
		expect(
			isQuirks(
				'<!DOCTYPE html PUBLIC "+//Silmaril//dtd html Pro v0r11 19970101//EN">'
			)
		).toBe(true);
		expect(
			isQuirks(
				'<!DOCTYPE html SYSTEM "http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd">'
			)
		).toBe(true);
		expect(isQuirks("<!DOCTYPE html>")).toBe(false);
	});

	it("treats MathML and SVG integration points as their own scopes", () => {
		// `<mi>` is MathML-special, so `<p>` breaks all the way out of `<math>`.
		expect(
			body("<math><mi>a</mi><p>b</p></math>").map((n) => n.tagName)
		).toEqual(["math", "p"]);
		// `<desc>` is an SVG HTML-integration point, so `<p>` nests inside it.
		const svg = body("<svg><desc><p>b</p></desc></svg>")[0];
		expect(child(child(svg.children, "desc").children, "p")).toBeDefined();
		// `<g>` is neither, so `<p>` breaks out again.
		expect(body("<svg><g><p>b</p></g></svg>").map((n) => n.tagName)).toEqual([
			"svg",
			"p"
		]);
	});

	it("only treats <annotation-xml> as an integration point for HTML encodings", () => {
		/**
		 * @param {string} attributes the element's attributes
		 * @returns {boolean} whether `<p>` stayed inside the element
		 */
		const nestsHtml = (attributes) => {
			const math = body(
				`<math><annotation-xml${attributes}><p>b</p></annotation-xml></math>`
			)[0];
			return (
				child(child(math.children, "annotation-xml").children, "p") !==
				undefined
			);
		};
		expect(nestsHtml(' encoding="text/html"')).toBe(true);
		expect(nestsHtml(' encoding="APPLICATION/XHTML+XML"')).toBe(true);
		expect(nestsHtml(' encoding="text/plain"')).toBe(false);
		expect(nestsHtml("")).toBe(false);
	});

	it("stops an unmatched end tag at a special element in either foreign namespace", () => {
		// "Any other end tag" walks the stack of open elements and gives up at the
		// first special one — which can be a MathML or SVG element, not only HTML.
		const math = body(
			'<math><annotation-xml encoding="text/html"><b>x</foo>y</b></annotation-xml></math>'
		)[0];
		const b = child(child(math.children, "annotation-xml").children, "b");
		expect(/** @type {MatText} */ (b.children[0]).data).toBe("xy");

		const svg = body("<svg><desc><b>x</foo>y</b></desc></svg>")[0];
		const svgB = child(child(svg.children, "desc").children, "b");
		expect(/** @type {MatText} */ (svgB.children[0]).data).toBe("xy");
	});

	it("applies the Noah's Ark clause only to identical formatting elements", () => {
		/**
		 * @param {string} source source
		 * @returns {number} how many formatting elements were reconstructed
		 */
		const reconstructed = (source) => {
			let depth = 0;
			/** @type {MatElement} */
			let node = body(source)[1];
			while (node !== undefined && node.tagName === "b") {
				depth++;
				node = /** @type {MatElement} */ (node.children[0]);
			}
			return depth;
		};
		// Four identical entries: the earliest is dropped from the list.
		expect(reconstructed("<p><b x=1><b x=1><b x=1><b x=1>t</p>after")).toBe(3);
		// A differing attribute count, and a differing value, both break the match.
		expect(reconstructed("<p><b x=1><b x=1 y=2><b x=1><b x=1>t</p>after")).toBe(
			4
		);
		expect(reconstructed("<p><b x=1><b x=2><b x=1><b x=1>t</p>after")).toBe(4);
	});

	it("grows the node columns past the initial estimate", () => {
		// `len / 12` under-estimates a document of nothing but short start tags,
		// so the doubling growth path has to carry the rest. Walk the refs
		// directly — `materialize` recurses, and this tree is 5000 deep.
		let node = parseHtmlRefs("<i>".repeat(5000));
		let depth = 0;
		for (;;) {
			const children = childrenOf(node);
			if (children.length === 0) break;
			node = children[children.length - 1];
			if (A.type(node) === NodeType.Element && A.name(node) === "i") depth++;
		}
		expect(depth).toBe(5000);
	});
});

// Insertion-mode arcs the optional html5lib submodule covers only when present;
// each case is the smallest corpus input reaching an arc nothing else here does.

/**
 * @param {string} source HTML
 * @param {string=} fragmentContext context element for fragment parsing
 * @returns {string} the serialized tree
 */
const treeOf = (source, fragmentContext) => {
	const doc = parseHtmlRefs(source, 0, { fragmentContext });
	// In fragment mode the tree is the children of the synthesized root.
	const first = A.child(0, doc);
	return serializeHtmlTree(fragmentContext && first !== 0 ? first : doc);
};

/** @type {[string, string, (string | undefined)][]} */
const CASES = [
	[
		"fosters an adoption-agency reparent out of a table",
		"<!doctype html><table><td><table><i>a<div>b<b>c</i>d",
		undefined
	],
	[
		"ignores every end tag the in-table insertion mode has no arc for",
		"<table><tr></strong></b></em></i></u></strike></s></blink></tt></pre></big></small></font></select></h1></h2></h3></h4></h5></h6></body></br></a></img></title></span></style></script></table></th></td></tr></frame></area></link></param></hr></input></col></base></meta></basefont></bgsound></embed></spacer></p></dd></dt></caption></colgroup></tbody></tfoot></thead></address></blockquote></center></dir></div></dl></fieldset></listing></menu></ol></ul></li></nobr></wbr></form></button></marquee></object></html></frameset></head></iframe></image></isindex></noembed></noframes></noscript></optgroup></option></plaintext></textarea>",
		undefined
	],
	[
		"nests framesets and switches to after-frameset",
		"<frame></frame></frame><frameset><frame><frameset><frame></frameset><noframes></frameset><noframes>",
		undefined
	],
	["closes a foreign element by its own end tag", "<g></path>X", "svg path"],
	["opens a template with no body yet", "<head></head><template>", undefined],
	[
		"re-nests a badly nested table, font and anchor",
		"<TABLE>\n<TR>\n<CENTER><CENTER><TD></TD></TR><TR>\n<FONT>\n<TABLE><tr></tr></TABLE>\n</P>\n<a></font><font></a>\nThis page contains an insanely badly-nested tag sequence.",
		undefined
	],
	[
		"parses a template fragment with a form in it",
		'<template><form><input name="q"></form><div>second</div></template>',
		"template"
	],
	[
		"breaks a paragraph out of foreign content",
		"<!doctype html><p><math></p>a",
		undefined
	],
	[
		"ignores a second form in a table",
		"<!doctype html><table><form><form>",
		undefined
	],
	["closes an implied tbody from a cell", "<table><td></tbody>A", undefined],
	[
		"ends a template inside a table body",
		"<table><tbody><template></tbody></template>",
		undefined
	],
	[
		"pops a select and a template out of a cell",
		"<body><table><tr><td><select><template>Foo</template><caption>A</table>",
		undefined
	],
	[
		"keeps an end tag inside a script fragment",
		"<!-- inside </script> -->",
		"script"
	],
	[
		"foster-parents text out of a column group",
		"<table><colgroup> foo</colgroup></table>",
		undefined
	],
	[
		"breaks out of MathML text integration points",
		"<b></b><mglyph/><i></i><malignmark/><u></u><ms/>X",
		"math ms"
	],
	[
		"handles a break and a comment in head noscript",
		"<head><noscript></br><!--foo--></noscript>",
		undefined
	],
	[
		"implies the end of a ruby base",
		"<html><ruby>a<rb>b<rb></ruby></html>",
		undefined
	],
	[
		"appends a comment after the body to the html element",
		"<!doctype html><html></p><!--foo-->",
		undefined
	],
	[
		"opens a column group inside a template",
		"<body><template><col><colgroup>",
		undefined
	],
	["reads a textarea fragment as text", "direct textarea content", "textarea"],
	["ends a caption fragment", "</caption><div>", "caption"],
	["ends a frameset fragment", "</frameset><frame>", "frameset"],
	[
		"foster-parents a formatting element out of a table",
		"<table><a>1<td>2</td>3</table>",
		undefined
	],
	[
		"runs the adoption agency past its outer-loop limit",
		"<div><a><b><div><div><div><div><div><div><div><div><div><div></a>",
		undefined
	],
	[
		"reconstructs nobr across a table and a marquee",
		"<nobr><table><marquee></table><nobr>",
		undefined
	],
	[
		"ignores a doctype inside a column group",
		"<table><colgroup><!DOCTYPE html></colgroup></table>",
		undefined
	],
	[
		"ignores a doctype in foreign content",
		"<svg><!DOCTYPE html></svg>",
		undefined
	],
	["parses a body start tag in an SVG desc fragment", "<body>X", "svg desc"],
	[
		"ignores a stray menuitem end tag",
		"<!DOCTYPE html><head></menuitem>",
		undefined
	],
	[
		"ignores the end tags a cell has no arc for",
		"<table><td></body></caption></col></colgroup></html>foo",
		undefined
	],
	[
		"ignores a template end tag with no template open",
		"<div></template></div>",
		undefined
	],
	[
		"opens a row inside a template",
		"<body><template><tr><div></div></tr></template>",
		undefined
	],
	[
		"merges html attributes across a template",
		"<html a=b><template><div><html b=c><span></template>",
		undefined
	],
	[
		"leaves annotation-xml when its SVG child closes",
		"<math><annotation-xml><svg></svg></annotation-xml><mi>",
		undefined
	],
	[
		"reads noframes text after the frameset closed",
		"<!doctype html><frameset></frameset><noframes>abc",
		undefined
	],
	[
		"closes an optgroup when the next one opens",
		"<!DOCTYPE html><select><optgroup><option><optgroup>",
		undefined
	],
	[
		"reopens a form once the table that held it closed",
		"<!doctype html><table><form></table><form>",
		undefined
	],
	[
		"ignores a plaintext end tag in a plaintext fragment",
		"</plaintext>",
		"plaintext"
	],
	[
		"ignores the end tags a table body has no arc for",
		"<table><tbody></body></caption></col></colgroup></html></td></th></tr>",
		undefined
	],
	["drops an input from a select fragment", "<input><option>", "select"],

	// A stray DOCTYPE, a repeated `<html>` or a repeated `<head>`/`<body>` has
	// its own arc in every insertion mode, and each one is a separate ignore.
	[
		"ignores a second doctype before html",
		"<!DOCTYPE html><!DOCTYPE html>",
		undefined
	],
	["ignores a doctype before head", "<html><!DOCTYPE html>", undefined],
	[
		"ignores a doctype in head",
		"<html><head><!DOCTYPE html></head>",
		undefined
	],
	[
		"ignores a doctype after head",
		"<html><head></head><!DOCTYPE html>",
		undefined
	],
	[
		"ignores a doctype after the body",
		"<body></body><!DOCTYPE html>",
		undefined
	],
	[
		"ignores a doctype after after the body",
		"<html><body></body></html><!DOCTYPE html>",
		undefined
	],
	[
		"merges a repeated html start tag before head",
		"<!DOCTYPE html><html><html abc:def=gh><xyz:abc></xyz:abc>",
		undefined
	],
	[
		"merges a repeated html start tag in head",
		"<!DOCTYPE html><head><html id=x>",
		undefined
	],
	[
		"merges a repeated html start tag after head",
		"<!doctype html><html a=b><head></head><html c=d>",
		undefined
	],
	[
		"merges a repeated html start tag after the body",
		'<!DOCTYPE html>X</body><html id="x">',
		undefined
	],
	[
		"merges a repeated html start tag in head noscript",
		'<head><noscript><html class="foo"><!--foo--></noscript>',
		undefined
	],
	[
		"treats an html start tag in a column group as in-body",
		"<table><colgroup><html></colgroup></table>",
		undefined
	],
	[
		"ignores a repeated head start tag after head",
		"<html><head></head><template></template><head>",
		undefined
	],
	[
		"ignores a repeated head end tag in head",
		"<!DOCTYPE html><HTML><META><HEAD></HEAD></HTML>",
		undefined
	],
	[
		"ignores a paragraph end tag after head",
		"<!doctype html><head></head></p><!--foo-->",
		undefined
	],
	[
		"merges a repeated body start tag inside a template",
		"<body a=b><template><div></div><body c=d><div></div></body></template></body>",
		undefined
	],
	["ends the body from an html fragment", "<body></body></html>", "html"],

	// NUL handling and text insertion.
	["drops a NUL before a frameset", "<html>\0<frameset></frameset>", undefined],
	[
		"keeps a frameset out once text arrived",
		"<html>a\0a<frameset></frameset>",
		undefined
	],
	[
		"foster-parents text between two formatting elements",
		"<!doctype html>a<i>b<table>c<b>d</i>e</b>f",
		undefined
	],
	[
		"strips the newline a pre element starts with",
		"<!DOCTYPE html><html><head></head><body><pre>\n</pre></body></html>",
		undefined
	],

	// Table-related modes reached through a template or a fragment.
	[
		"ignores a table end tag inside a template",
		"<body><template><thead></thead></table><tbody></tbody></template></body>",
		undefined
	],
	[
		"ignores a row end tag inside a template",
		"<body><template><td></td></tr><td></td></template>",
		undefined
	],
	[
		"ignores a row end tag inside a template cell",
		"<body><table><template><td></tr><div></template></table>",
		undefined
	],
	[
		"ignores a column group end tag inside a template",
		"<body><template><col></colgroup>",
		undefined
	],
	[
		"ends a column group on text inside a template",
		"<body><template><col>Hello",
		undefined
	],
	[
		"closes a cell on a mismatched th end tag",
		"<table><tr><td></th>",
		undefined
	],
	[
		"ignores table-section end tags in a row fragment",
		"</tbody></tfoot></thead><td>",
		"tr"
	],
	[
		"ignores a thead end tag in a table body",
		"<table><tbody></thead>",
		undefined
	],
	["opens an implied tbody in a table fragment", "<table><tr>", "table"],
	[
		"clears a table body context across nested tables",
		"<a><table><td><a><table></table><a></tr><a></table><b>X</b>C<a>Y",
		undefined
	],
	[
		"runs thorough implied end tags for a template in a table",
		"<table><thead><template><td></template></table>",
		undefined
	],

	// Foreign content and scope boundaries.
	["ignores a foreign end tag with no match", "</path>X", "svg path"],
	[
		"ignores a frameset start tag in an SVG desc fragment",
		"<frameset>X",
		"svg desc"
	],
	[
		"ignores a tbody start tag inside MathML in a thead fragment",
		"<math><thead><mo><tbody>",
		"thead"
	],
	["closes a div across an SVG element", "<div><svg></div>a", undefined],
	[
		"treats a self-closed math element as foreign",
		"<!doctype html><math/><foo>",
		undefined
	],

	// Arcs the corpus does not reach at all.
	[
		"ignores a second form end tag inside a template",
		"<template><form></form></form></template>",
		undefined
	],
	[
		"drops a table cell holding nothing but a NUL",
		"<table>\0</table>",
		undefined
	],
	[
		"ignores a template end tag after head",
		"<head></head></template>",
		undefined
	]
];

describe("parseHtml — insertion modes", () => {
	for (const [name, source, fragmentContext] of CASES) {
		it(name, () => {
			expect(treeOf(source, fragmentContext)).toMatchSnapshot();
		});
	}
});
