"use strict";

const { fixture } = require("../../helpers/fixture");

const {
	A,
	Field,
	NodeType,
	decodeXmlEntities,
	escapeXmlAttribute,
	parseHtml: parseHtmlRefs
} = require("../../../lib/html/syntax-parser");

/**
 * @param {import("../../../lib/html/syntax-parser").HtmlElement} element element
 * @param {string} name attribute name
 * @returns {string} the attribute's value as the tree hands it out
 */
const attributeValue = (element, name) =>
	A.value(A.fieldNamed(Field.attributes, name, element));

// What the parser builds and reports for each fixture, under each option a
// fixture's `parse.json` names, is in `invariants.unittest.js`'s snapshot;
// these hold what an accessor answers when read again.
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
		const source = fixture(
			"xml",
			"xml-syntax-parsing-should-decode-an-xml-attribute-only-once-per-parse-2"
		);
		const document = parseHtmlRefs(source, 0, { xml: true });
		const attribute = A.fieldNamed(Field.attributes, "value", A.child(1, document));
		for (let i = 0; i < 4; i++) expect(A.value(attribute) === value).toBe(true);
		const next = parseHtmlRefs(fixture("xml", "xml-syntax-parsing-should-decode-an-xml-attribute-only-once-per-parse"), 0, { xml: true });
		expect(A.value(A.fieldNamed(Field.attributes, "value", A.child(0, next)))).toBe("next");
	});

	it("should end the name of an entity reference in every code unit alike", () => {
		// What the name of a reference cannot hold: a delimiter, or what `\s` matches.
		const ends = /[\s&;#<>"'=/%]/;
		// What a declaration cannot name an entity with, so nothing resolves it.
		const undeclared = /[\0\t\n\r "'/<=>?[\]]/;
		let subset = "";
		for (let unit = 0; unit < 0x10000; unit++) {
			const character = String.fromCharCode(unit);
			if (!undeclared.test(character)) subset += `<!ENTITY n${character}m "1">`;
		}
		parseHtmlRefs(`<!DOCTYPE r [${subset}]><r/>`, 0, { xml: true });
		/** @type {number[]} */
		const unexpected = [];
		for (let unit = 0; unit < 0x10000; unit++) {
			const character = String.fromCharCode(unit);
			const reference = `&n${character}m;`;
			const resolves = !undeclared.test(character) && !ends.test(character);
			if (decodeXmlEntities(reference) !== (resolves ? "1" : reference)) {
				unexpected.push(unit);
			}
		}
		expect(unexpected).toEqual([]);
	});

	it("should keep every attribute of an XML document its columns grow for", () => {
		/**
		 * @param {string} source an XML document
		 * @returns {string[]} every attribute under its root as `name=value`, the root's own first
		 */
		const attributesOf = (source) => {
			// A parser of its own: the columns start empty, so each document grows them.
			/** @type {typeof import("../../../lib/html/syntax-parser") | undefined} */
			let fresh;
			jest.isolateModules(() => {
				fresh = require("../../../lib/html/syntax-parser");
			});
			const parser = /** @type {typeof import("../../../lib/html/syntax-parser")} */ (
				fresh
			);
			const path = parser.A;
			const root = path.child(0, parser.parseHtml(source, 0, { xml: true }));
			/** @type {string[]} */
			const seen = [];
			const elements = [root, ...path.children(root)];
			for (const element of elements) {
				if (path.type(element) !== parser.NodeType.Element) continue;
				const count = path.fieldCount(parser.Field.attributes, element);
				for (let i = 0; i < count; i++) {
					const attribute = path.field(i, parser.Field.attributes, element);
					seen.push(`${path.name(attribute)}=${path.value(attribute)}`);
				}
			}
			return seen;
		};
		/** @type {string[]} */
		let expected = [];
		// A few past the first capacity: doubling it holds what is predicted.
		let source = "<r>";
		for (let i = 0; i < 3000; i++) {
			source += `<a b="${i}" c="${i}x"/>`;
			expected.push(`b=${i}`, `c=${i}x`);
		}
		expect(attributesOf(`${source}</r>`)).toEqual(expected);
		// Three times it, spread evenly: the capacity is read off the ones seen so far.
		for (let i = 3000; i < 6000; i++) {
			source += `<a b="${i}" c="${i}x"/>`;
			expected.push(`b=${i}`, `c=${i}x`);
		}
		expect(attributesOf(`${source}</r>`)).toEqual(expected);
		// All in the first tag, before any token ended: nothing to read a capacity off.
		expected = [];
		source = "<r";
		for (let i = 0; i < 4200; i++) {
			source += ` a${i}="${i}"`;
			expected.push(`a${i}=${i}`);
		}
		expect(attributesOf(`${source}/>`)).toEqual(expected);
		// A dense start before a long text: what it predicts is trusted fourfold only.
		expected = [];
		source = "<r>";
		for (let i = 0; i < 700; i++) {
			source += `<a b="" c="${i}" d="" e="" f="" g="${i}"/>`;
			expected.push("b=", `c=${i}`, "d=", "e=", "f=", `g=${i}`);
		}
		expected.push("y=1");
		expect(
			attributesOf(`${source}${"t".repeat(100000)}<z y="1"/></r>`)
		).toEqual(expected);
		// Just under the capacity a release keeps: the headroom stops there.
		expected = [];
		for (let i = 0; i < 31000; i++) expected.push("b=1", "c=2");
		expect(
			attributesOf(`<r>${'<a b="1" c="2"/>'.repeat(31000)}</r>`)
		).toEqual(expected);
	});

	it("should normalize an XML attribute first read after the parse, in any order", () => {
		// Inline: the tab, the line ends and the order of the reads are the test.
		const document = parseHtmlRefs(
			'<!DOCTYPE r [<!ENTITY e "x\ty">]><r a="1\t2\r\n3" b="&e;&#x41;" c="4\n5"><s d="6\r7" e="&amp;"/></r>',
			0,
			{ xml: true }
		);
		const root = A.child(1, document);
		const child = A.child(0, root);
		expect(attributeValue(child, "d")).toBe("6 7");
		expect(attributeValue(root, "c")).toBe("4 5");
		expect(attributeValue(child, "e")).toBe("&");
		expect(attributeValue(root, "a")).toBe("1 2 3");
		expect(attributeValue(root, "b")).toBe("x yA");
		expect(attributeValue(root, "c")).toBe("4 5");
	});

	it("should read the attributes of a tag an XML entity holds", () => {
		const document = parseHtmlRefs(
			"<!DOCTYPE r [<!ENTITY t \"<i k='&amp;v' n='p\tq'/>\">]><r>&t;<j k='a\nb'/></r>",
			0,
			{ xml: true }
		);
		const root = A.child(1, document);
		expect(attributeValue(A.child(1, root), "k")).toBe("a b");
		expect(attributeValue(A.child(0, root), "n")).toBe("p q");
		expect(attributeValue(A.child(0, root), "k")).toBe("&v");
	});

	it("should resolve an XML attribute's references as its start tag is read", () => {
		// A declaration after the tag does not reach back into it, whenever it is read.
		const document = parseHtmlRefs(
			'<r><a v="&e;" w="x\ty"/><!DOCTYPE r [<!ENTITY e "late">]><b v="&e;" w="1&#10;2" x="p\r\nq"/></r>',
			0,
			{ xml: true }
		);
		const root = A.child(0, document);
		const second = A.child(1, root);
		expect(attributeValue(second, "x")).toBe("p q");
		expect(attributeValue(second, "w")).toBe("1\n2");
		expect(attributeValue(second, "v")).toBe("late");
		const first = A.child(0, root);
		expect(attributeValue(first, "w")).toBe("x y");
		expect(attributeValue(first, "v")).toBe("&e;");
		expect(attributeValue(first, "w")).toBe("x y");
	});

	it("should resolve an XML reference of each form and leave any other `&` as written", () => {
		expect(decodeXmlEntities("&lt;&gt;&amp;&quot;&apos;")).toBe("<>&\"'");
		// A name a code unit away from a predefined one is the DTD's to resolve.
		const others =
			"&xt; &lx; &gx; &amq; &xmp; &quo1; &1uot; &apo1; &1pos; &LT; &Amp; &amp2; &l; &quot2;";
		expect(decodeXmlEntities(others)).toBe(others);
		expect(decodeXmlEntities("&#65;&#x41;&#x6a;&#x6A;&#0065;")).toBe("AAjjA");
		const malformed = "&#X41; &#x; &#; &#65 &#x41 &#xG; &#6x; & &; &a b; &a&";
		expect(decodeXmlEntities(malformed)).toBe(malformed);
		// Past U+10FFFF, however many digits, and what §2.2 `Char` leaves out.
		expect(
			decodeXmlEntities(
				"&#x110000;&#1114112;&#xFFFFFFFFFFFFFFFFFFFFFFFF;&#99999999999999999999999;&#0;&#xD800;&#65534;"
			)
		).toBe("\uFFFD".repeat(7));
		expect(decodeXmlEntities("&#x10FFFF;&#1114111;")).toBe("\u{10FFFF}\u{10FFFF}");
		expect(decodeXmlEntities("a&b&amp;c&lt")).toBe("a&b&c&lt");
		// A declaration may extend a predefined name, and cannot take one over.
		parseHtmlRefs('<!DOCTYPE r [<!ENTITY lt2 "two"><!ENTITY amp "shadow">]><r/>', 0, { xml: true });
		expect(decodeXmlEntities("&lt2;&amp;&lt;")).toBe("two&<");
	});

	it("should return an XML attribute value holding nothing to escape as it came", () => {
		expect(escapeXmlAttribute("plain value", '"')).toBe("plain value");
		expect(escapeXmlAttribute("it's", '"')).toBe("it's");
		expect(escapeXmlAttribute('say "hi"', "'")).toBe('say "hi"');
		expect(escapeXmlAttribute("a\"b'c<d&e\tf\ng\rh", '"')).toBe(
			"a&quot;b'c&lt;d&amp;e&#9;f&#10;g&#13;h"
		);
		expect(escapeXmlAttribute("a\"b'c", "'")).toBe("a\"b&apos;c");
	});

	it("should spend the expansion budget on XML attributes in document order", () => {
		const value = "x".repeat(400000);
		const document = parseHtmlRefs(
			`<!DOCTYPE r [<!ENTITY e "${value}">]><r><a v="&e;" p="1"/><b p="2" v="&e;"/><c v="&e;" p="3"/></r>`,
			0,
			{ xml: true }
		);
		const root = A.child(1, document);
		// Read last to first: the third reference is the one past the budget.
		expect(attributeValue(A.child(2, root), "v")).toBe("&e;");
		expect(attributeValue(A.child(2, root), "p")).toBe("3");
		expect(attributeValue(A.child(1, root), "v") === value).toBe(true);
		expect(attributeValue(A.child(1, root), "p")).toBe("2");
		expect(attributeValue(A.child(0, root), "v") === value).toBe(true);
	});

	it("should tell an XML attribute holding a reference from the text around it", () => {
		const document = parseHtmlRefs(
			'<r a="1" b="&lt;" c="2">&amp;<s d="3" e="&#38;" f=\'4\'/>x &amp; y<t g="5"/>&gt;</r>',
			0,
			{ xml: true }
		);
		const root = A.child(0, document);
		expect(attributeValue(root, "a")).toBe("1");
		expect(attributeValue(root, "b")).toBe("<");
		expect(attributeValue(root, "c")).toBe("2");
		const inner = A.child(1, root);
		expect(attributeValue(inner, "d")).toBe("3");
		expect(attributeValue(inner, "e")).toBe("&");
		expect(attributeValue(inner, "f")).toBe("4");
		expect(attributeValue(A.child(3, root), "g")).toBe("5");
	});

	it("should end an XML start tag the input cuts after the space around `=`", () => {
		for (const source of ["<r a ", "<r a =", "<r a= "]) {
			/** @type {string[]} */
			const codes = [];
			const document = parseHtmlRefs(source, 0, {
				xml: true,
				parseError: (_input, code) => {
					codes.push(code);
				}
			});
			expect(codes).toEqual(["eof-in-tag"]);
			expect(A.child(0, document)).toBe(0);
		}
	});

	it("should decode the character references a declared entity's value holds", () => {
		const document = parseHtmlRefs(
			'<!DOCTYPE r [<!ENTITY e "&#65;&#x42;&#1;">]><r>&e;</r>',
			0,
			{ xml: true }
		);
		const root = A.child(1, document);
		// a reference to a code point XML does not allow reads as U+FFFD
		expect(A.value(A.child(0, root))).toBe("AB\uFFFD");
	});
});
