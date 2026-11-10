"use strict";

const { fixture } = require("../../helpers/fixture");

/** @import { MatDocument, MatElement } from "../../helpers/materializeHtmlTree" */

const {
	A,
	Field,
	NodeType,
	decodeXmlAttribute,
	parseHtml: parseHtmlRefs
} = require("../../../lib/html/syntax-parser");
const { materialize } = require("../../helpers/materializeHtmlTree");

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

// What the parser builds and reports for each fixture, under each option a
// fixture's `parse.json` names, is in `invariants.unittest.js`'s snapshot;
// these hold its accessors and inputs too large to snapshot.
describe("XmlSyntax — parsing", () => {
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

	it("should bound an entity bomb of markup", () => {
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
});
