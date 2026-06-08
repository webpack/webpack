"use strict";

// cspell:ignore selectedcontent

const buildHtmlAst = require("../lib/html/buildHtmlAst");

const { NS_HTML, NS_MATHML, NS_SVG } = buildHtmlAst;

/**
 * @param {import("../lib/html/buildHtmlAst").HtmlNode[]} children children
 * @param {string} tagName tag name
 * @returns {import("../lib/html/buildHtmlAst").HtmlElement} the element
 */
const child = (children, tagName) =>
	/** @type {import("../lib/html/buildHtmlAst").HtmlElement} */ (
		children.find((c) => c.type === "element" && c.tagName === tagName)
	);

// The tree builder always produces a full document (html > head, body); these
// helpers reach the interesting subtrees.
const html = (src) => child(buildHtmlAst(src).children, "html");
const body = (src) => child(html(src).children, "body").children;
const head = (src) => child(html(src).children, "head").children;

/**
 * @param {string} src source
 * @param {string} tagName tag name
 * @returns {import("../lib/html/buildHtmlAst").HtmlElement} first matching element anywhere
 */
const find = (src, tagName) => {
	let found;
	const walk = (node) => {
		if (found || node.type !== "element") return;
		if (node.tagName === tagName) {
			found = node;
			return;
		}
		for (const c of node.children) walk(c);
	};
	for (const c of buildHtmlAst(src).children) walk(c);
	return found;
};

describe("buildHtmlAst", () => {
	it("should produce an empty document with html/head/body scaffolding", () => {
		const ast = buildHtmlAst("");
		expect(ast.type).toBe("document");
		const root = child(ast.children, "html");
		expect(root.tagName).toBe("html");
		expect(child(root.children, "head").tagName).toBe("head");
		expect(child(root.children, "body").tagName).toBe("body");
	});

	it("should parse a simple element into the body", () => {
		const nodes = body("<div></div>");
		expect(nodes).toHaveLength(1);
		expect(nodes[0].type).toBe("element");
		expect(nodes[0].tagName).toBe("div");
		expect(nodes[0].children).toEqual([]);
	});

	it("should parse nested elements", () => {
		const div = body("<div><span>hello</span></div>")[0];
		const span = div.children[0];
		expect(span.tagName).toBe("span");
		expect(span.children[0].type).toBe("text");
		expect(span.children[0].data).toBe("hello");
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
		const ast = buildHtmlAst("<!-- hello -->");
		expect(ast.children[0].type).toBe("comment");
		expect(ast.children[0].data).toBe(" hello ");
	});

	it("should parse doctype", () => {
		const ast = buildHtmlAst("<!DOCTYPE html><html></html>");
		expect(ast.children[0].type).toBe("doctype");
		expect(ast.children[0].name).toBe("html");
	});

	it("should handle self-closing tags", () => {
		const nodes = body("<input/>");
		expect(nodes[0].tagName).toBe("input");
		expect(nodes[0].selfClosing).toBe(true);
	});

	it("should auto-close <p> when a block element opens", () => {
		const nodes = body("<p>one<div>two</div>");
		expect(nodes).toHaveLength(2);
		expect(nodes[0].tagName).toBe("p");
		expect(nodes[0].children[0].data).toBe("one");
		expect(nodes[1].tagName).toBe("div");
	});

	it("should auto-close same-name elements like <li>", () => {
		const ul = body("<ul><li>one<li>two</ul>")[0];
		expect(ul.children).toHaveLength(2);
		expect(ul.children[0].children[0].data).toBe("one");
		expect(ul.children[1].children[0].data).toBe("two");
	});

	it("should merge adjacent text nodes", () => {
		// Foster-parenting the table's text next to the leading text exercises
		// the adjacent-text-node merge.
		const nodes = body("Text<table>Misplaced</table>");
		expect(nodes[0].type).toBe("text");
		expect(nodes[0].data).toBe("TextMisplaced");
		expect(child(nodes, "table").tagName).toBe("table");
	});

	it("should detect SVG namespace and adjust foreign tag names", () => {
		const svg = body("<svg><lineargradient></lineargradient></svg>")[0];
		expect(svg.namespace).toBe(NS_SVG);
		// SVG tag-name case is corrected per the foreign adjustment table.
		expect(svg.children[0].tagName).toBe("linearGradient");
		expect(svg.children[0].namespace).toBe(NS_SVG);
	});

	it("should detect MathML namespace", () => {
		const math = body("<math><mi>x</mi></math>")[0];
		expect(math.namespace).toBe(NS_MATHML);
		expect(math.children[0].namespace).toBe(NS_MATHML);
	});

	it("should route head and body content to the right place", () => {
		const src =
			'<!DOCTYPE html><html><head><meta charset="utf-8"><title>T</title></head><body><h1>Hi</h1></body></html>';
		expect(child(head(src), "meta").tagName).toBe("meta");
		expect(child(head(src), "title").tagName).toBe("title");
		expect(child(body(src), "h1").tagName).toBe("h1");
	});

	it("should export namespace constants", () => {
		expect(NS_HTML).toBe(0);
		expect(NS_MATHML).toBe(1);
		expect(NS_SVG).toBe(2);
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
		const tbody = table.children[0];
		expect(tbody.tagName).toBe("tbody");
		const tr = tbody.children[0];
		expect(tr.children.map((c) => c.tagName)).toEqual(["td", "td"]);
	});

	it("should treat SVG foreignObject/desc as HTML integration points", () => {
		const svg = body(
			"<svg><foreignObject><div>html</div></foreignObject></svg>"
		)[0];
		const fo = svg.children[0];
		expect(fo.namespace).toBe(NS_SVG);
		expect(fo.children[0].namespace).toBe(NS_HTML);
		const desc = body("<svg><desc><div>x</div></desc></svg>")[0].children[0];
		expect(desc.children[0].namespace).toBe(NS_HTML);
	});

	it("should keep CDATA text in foreign content", () => {
		const svg = body("<svg><![CDATA[foo]]></svg>")[0];
		expect(svg.children[0].type).toBe("text");
		expect(svg.children[0].data).toBe("foo");
	});

	it("should treat bogus comments as comments", () => {
		// A leading bogus comment is inserted into the document before <html>.
		const ast = buildHtmlAst("<?bogus comment>");
		expect(ast.children[0].type).toBe("comment");
		expect(ast.children[0].data).toBe("?bogus comment");
	});

	it("should parse raw-text elements without decoding entities", () => {
		const script = find("<script>var a = 1 < 2 &amp; 3;</script>", "script");
		expect(script.children[0].type).toBe("text");
		expect(script.children[0].data).toBe("var a = 1 < 2 &amp; 3;");
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
		const span = div.children[0];
		expect(div.end).toBe(src.length);
		expect(span.end).toBe(src.length);
	});

	it("should foster-parent misplaced content out of tables", () => {
		const nodes = body(
			"<table><div>Misplaced</div><tr><td>OK</td></tr></table>"
		);
		expect(nodes[0].tagName).toBe("div");
		expect(nodes[0].children[0].data).toBe("Misplaced");
		expect(nodes[1].tagName).toBe("table");
	});

	describe("adoption agency algorithm", () => {
		it("should move the furthest block to the common ancestor", () => {
			// `<b>1<p>2</b>3</p>`: per WHATWG the <p> (furthest block) is relocated
			// to the common ancestor (body); the original <b> keeps only "1" and a
			// <b> clone wraps the content that stayed inside <p>.
			const nodes = body("<b>1<p>2</b>3</p>");
			expect(nodes.map((n) => n.tagName)).toEqual(["b", "p"]);
			expect(nodes[0].children.map((n) => n.data)).toEqual(["1"]);
			const p = nodes[1];
			expect(p.children[0].tagName).toBe("b");
			expect(p.children[0].children[0].data).toBe("2");
			expect(p.children[1].data).toBe("3");
		});

		it("should reconstruct active formatting elements", () => {
			const nodes = body("<p>1<b>2</p>3</b>");
			expect(nodes[0].tagName).toBe("p");
			expect(nodes[0].children[1].tagName).toBe("b");
			expect(nodes[1].tagName).toBe("b");
			expect(nodes[1].children[0].data).toBe("3");
		});

		it("should apply Noah's Ark limit of three formatting elements", () => {
			const nodes = body("<b><b><b><b></b></b></b></b>");
			expect(nodes).toHaveLength(1);
		});

		it("should not duplicate an attribute span when a formatting element is cloned", () => {
			// The <a> is reopened around <div> by the algorithm; the clone must not
			// reuse the original's href span, or the parser emits two dependencies.
			const nodes = body("<a href=x.png><div>y</a>");
			const spans = [];
			const collect = (node) => {
				if (node.type !== "element") return;
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
		expect(dl.children.map((c) => c.tagName)).toEqual(["dd", "dt"]);
		expect(dl.children[0].children[0].data).toBe("a");
		expect(dl.children[1].children[0].data).toBe("b");
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
		const span = selectedcontent.children[0];
		expect(span.tagName).toBe("span");
		expect(span.children[0].data).toBe("Y");
		// The clone carries the attribute name/value but no source offsets, so
		// the consumer never re-emits a dependency for it.
		expect(span.attributes[0].name).toBe("id");
		expect(span.attributes[0].value).toBe("x");
		expect(span.attributes[0].valueStart).toBe(-1);
	});

	it("should mirror the last selected <option> into <selectedcontent>", () => {
		const select = body(
			"<select><button><selectedcontent></button><option>A<option selected>B"
		)[0];
		const selectedcontent = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(selectedcontent.children[0].data).toBe("B");
	});

	it("foster-parents stray text in a table fragment context", () => {
		// Context is a `table`, so there is no `<table>` on the open stack: stray
		// character data is fostered to the fragment root, beside the table rows.
		const root = buildHtmlAst("<tr><td>a</td></tr>x", "table").children[0];
		const texts = root.children
			.filter((c) => c.type === "text")
			.map((c) => c.data);
		expect(texts).toContain("x");
		expect(child(root.children, "tbody")).toBeDefined();
	});
});
