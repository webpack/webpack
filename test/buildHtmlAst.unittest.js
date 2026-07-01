"use strict";

// cspell:ignore selectedcontent

const {
	NS_HTML,
	NS_MATHML,
	NS_SVG,
	NodeType,
	buildHtmlAst
} = require("../lib/html/syntax");

/**
 * @param {import("../lib/html/syntax").HtmlNode[]} children children
 * @param {string} tagName tag name
 * @returns {import("../lib/html/syntax").HtmlElement} the element
 */
const child = (children, tagName) =>
	/** @type {import("../lib/html/syntax").HtmlElement} */ (
		children.find((c) => c.type === NodeType.Element && c.tagName === tagName)
	);

// The tree builder always produces a full document (html > head, body); these
// helpers reach the interesting subtrees.
/**
 * @param {string} src source
 * @returns {import("../lib/html/syntax").HtmlElement} html element
 */
const html = (src) => child(buildHtmlAst(src).children, "html");
/**
 * @param {string} src source
 * @returns {import("../lib/html/syntax").HtmlElement[]} body children
 */
const body = (src) =>
	/** @type {import("../lib/html/syntax").HtmlElement[]} */ (
		child(html(src).children, "body").children
	);
/**
 * @param {string} src source
 * @returns {import("../lib/html/syntax").HtmlElement[]} head children
 */
const head = (src) =>
	/** @type {import("../lib/html/syntax").HtmlElement[]} */ (
		child(html(src).children, "head").children
	);

/**
 * @param {string} src source
 * @param {string} tagName tag name
 * @returns {import("../lib/html/syntax").HtmlElement} first matching element anywhere
 */
const find = (src, tagName) => {
	/** @type {import("../lib/html/syntax").HtmlElement | undefined} */
	let found;
	/** @param {import("../lib/html/syntax").HtmlNode} node node to search */
	const walk = (node) => {
		if (found || node.type !== NodeType.Element) return;
		if (node.tagName === tagName) {
			found = node;
			return;
		}
		for (const c of node.children) walk(c);
	};
	for (const c of buildHtmlAst(src).children) walk(c);
	return /** @type {import("../lib/html/syntax").HtmlElement} */ (found);
};

describe("buildHtmlAst", () => {
	it("should produce an empty document with html/head/body scaffolding", () => {
		const ast = buildHtmlAst("");
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
		const span = /** @type {import("../lib/html/syntax").HtmlElement} */ (
			div.children[0]
		);
		expect(span.tagName).toBe("span");
		expect(span.children[0].type).toBe(NodeType.Text);
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (span.children[0])
				.data
		).toBe("hello");
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
		expect(ast.children[0].type).toBe(NodeType.Comment);
		expect(
			/** @type {import("../lib/html/syntax").HtmlComment} */ (ast.children[0])
				.data
		).toBe(" hello ");
	});

	it("should parse doctype", () => {
		const ast = buildHtmlAst("<!DOCTYPE html><html></html>");
		expect(ast.children[0].type).toBe(NodeType.Doctype);
		expect(
			/** @type {import("../lib/html/syntax").HtmlDoctype} */ (ast.children[0])
				.name
		).toBe("html");
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
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				nodes[0].children[0]
			).data
		).toBe("one");
		expect(nodes[1].tagName).toBe("div");
	});

	it("should auto-close same-name elements like <li>", () => {
		const ul = body("<ul><li>one<li>two</ul>")[0];
		expect(ul.children).toHaveLength(2);
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				/** @type {import("../lib/html/syntax").HtmlElement} */ (ul.children[0])
					.children[0]
			).data
		).toBe("one");
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				/** @type {import("../lib/html/syntax").HtmlElement} */ (ul.children[1])
					.children[0]
			).data
		).toBe("two");
	});

	it("should merge adjacent text nodes", () => {
		// Foster-parenting the table's text next to the leading text exercises
		// the adjacent-text-node merge.
		const nodes = body("Text<table>Misplaced</table>");
		expect(nodes[0].type).toBe(NodeType.Text);
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				/** @type {unknown} */ (nodes[0])
			).data
		).toBe("TextMisplaced");
		expect(child(nodes, "table").tagName).toBe("table");
	});

	it("should detect SVG namespace and adjust foreign tag names", () => {
		const svg = body("<svg><lineargradient></lineargradient></svg>")[0];
		expect(svg.namespace).toBe(NS_SVG);
		// SVG tag-name case is corrected per the foreign adjustment table.
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (svg.children[0])
				.tagName
		).toBe("linearGradient");
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (svg.children[0])
				.namespace
		).toBe(NS_SVG);
	});

	it("should not resolve prototype-named SVG tags and attributes through the adjustment tables", () => {
		const svg = body('<svg><constructor toString="x"></constructor></svg>')[0];
		const el = /** @type {import("../lib/html/syntax").HtmlElement} */ (
			svg.children[0]
		);
		expect(el.tagName).toBe("constructor");
		expect(el.attributes[0].name).toBe("tostring");
	});

	it("should detect MathML namespace", () => {
		const math = body("<math><mi>x</mi></math>")[0];
		expect(math.namespace).toBe(NS_MATHML);
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (math.children[0])
				.namespace
		).toBe(NS_MATHML);
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
		const tbody = /** @type {import("../lib/html/syntax").HtmlElement} */ (
			table.children[0]
		);
		expect(tbody.tagName).toBe("tbody");
		const tr = /** @type {import("../lib/html/syntax").HtmlElement} */ (
			tbody.children[0]
		);
		expect(
			tr.children.map(
				(c) =>
					/** @type {import("../lib/html/syntax").HtmlElement} */ (c).tagName
			)
		).toEqual(["td", "td"]);
	});

	it("should treat SVG foreignObject/desc as HTML integration points", () => {
		const svg = body(
			"<svg><foreignObject><div>html</div></foreignObject></svg>"
		)[0];
		const fo = /** @type {import("../lib/html/syntax").HtmlElement} */ (
			svg.children[0]
		);
		expect(fo.namespace).toBe(NS_SVG);
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (fo.children[0])
				.namespace
		).toBe(NS_HTML);
		const desc = /** @type {import("../lib/html/syntax").HtmlElement} */ (
			body("<svg><desc><div>x</div></desc></svg>")[0].children[0]
		);
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (desc.children[0])
				.namespace
		).toBe(NS_HTML);
	});

	it("should keep CDATA text in foreign content", () => {
		const svg = body("<svg><![CDATA[foo]]></svg>")[0];
		expect(svg.children[0].type).toBe(NodeType.Text);
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (svg.children[0])
				.data
		).toBe("foo");
	});

	it("should treat bogus comments as comments", () => {
		// A leading bogus comment is inserted into the document before <html>.
		const ast = buildHtmlAst("<?bogus comment>");
		expect(ast.children[0].type).toBe(NodeType.Comment);
		expect(
			/** @type {import("../lib/html/syntax").HtmlComment} */ (ast.children[0])
				.data
		).toBe("?bogus comment");
	});

	it("should parse raw-text elements without decoding entities", () => {
		const script = find("<script>var a = 1 < 2 &amp; 3;</script>", "script");
		expect(script.children[0].type).toBe(NodeType.Text);
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (script.children[0])
				.data
		).toBe("var a = 1 < 2 &amp; 3;");
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
		const span = /** @type {import("../lib/html/syntax").HtmlElement} */ (
			div.children[0]
		);
		expect(div.end).toBe(src.length);
		expect(span.end).toBe(src.length);
	});

	it("should foster-parent misplaced content out of tables", () => {
		const nodes = body(
			"<table><div>Misplaced</div><tr><td>OK</td></tr></table>"
		);
		expect(nodes[0].tagName).toBe("div");
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				nodes[0].children[0]
			).data
		).toBe("Misplaced");
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
				nodes[0].children.map(
					(n) => /** @type {import("../lib/html/syntax").HtmlText} */ (n).data
				)
			).toEqual(["1"]);
			const p = nodes[1];
			expect(
				/** @type {import("../lib/html/syntax").HtmlElement} */ (p.children[0])
					.tagName
			).toBe("b");
			expect(
				/** @type {import("../lib/html/syntax").HtmlText} */ (
					/** @type {import("../lib/html/syntax").HtmlElement} */ (
						p.children[0]
					).children[0]
				).data
			).toBe("2");
			expect(
				/** @type {import("../lib/html/syntax").HtmlText} */ (p.children[1])
					.data
			).toBe("3");
		});

		it("should reconstruct active formatting elements", () => {
			const nodes = body("<p>1<b>2</p>3</b>");
			expect(nodes[0].tagName).toBe("p");
			expect(
				/** @type {import("../lib/html/syntax").HtmlElement} */ (
					nodes[0].children[1]
				).tagName
			).toBe("b");
			expect(nodes[1].tagName).toBe("b");
			expect(
				/** @type {import("../lib/html/syntax").HtmlText} */ (
					nodes[1].children[0]
				).data
			).toBe("3");
		});

		it("should apply Noah's Ark limit of three formatting elements", () => {
			const nodes = body("<b><b><b><b></b></b></b></b>");
			expect(nodes).toHaveLength(1);
		});

		it("should not duplicate an attribute span when a formatting element is cloned", () => {
			// The <a> is reopened around <div> by the algorithm; the clone must not
			// reuse the original's href span, or the parser emits two dependencies.
			const nodes = body("<a href=x.png><div>y</a>");
			/** @type {string[]} */
			const spans = [];
			/** @param {import("../lib/html/syntax").HtmlNode} node node to collect from */
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
			dl.children.map(
				(c) =>
					/** @type {import("../lib/html/syntax").HtmlElement} */ (c).tagName
			)
		).toEqual(["dd", "dt"]);
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				/** @type {import("../lib/html/syntax").HtmlElement} */ (dl.children[0])
					.children[0]
			).data
		).toBe("a");
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				/** @type {import("../lib/html/syntax").HtmlElement} */ (dl.children[1])
					.children[0]
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
		const span = /** @type {import("../lib/html/syntax").HtmlElement} */ (
			selectedcontent.children[0]
		);
		expect(span.tagName).toBe("span");
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (span.children[0])
				.data
		).toBe("Y");
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
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				selectedcontent.children[0]
			).data
		).toBe("B");
	});

	it("foster-parents stray text in a table fragment context", () => {
		// Context is a `table`, so there is no `<table>` on the open stack: stray
		// character data is fostered to the fragment root, beside the table rows.
		const root = /** @type {import("../lib/html/syntax").HtmlElement} */ (
			buildHtmlAst("<tr><td>a</td></tr>x", "table").children[0]
		);
		const texts = root.children
			.filter((c) => c.type === NodeType.Text)
			.map((/** @type {import("../lib/html/syntax").HtmlText} */ c) => c.data);
		expect(texts).toContain("x");
		expect(child(root.children, "tbody")).toBeDefined();
	});
});

describe("buildHtmlAst — SourceProcessor", () => {
	const { NodeType, SourceProcessor } = require("../lib/html/syntax");

	it("fires enter / exit visitors in source order", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/html/syntax").VisitorMap} */ ({
					[NodeType.Element]: {
						enter: (n) =>
							log.push(
								`enter:${
									/** @type {import("../lib/html/syntax").HtmlElement} */ (n)
										.tagName
								}`
							),
						exit: (n) =>
							log.push(
								`exit:${
									/** @type {import("../lib/html/syntax").HtmlElement} */ (n)
										.tagName
								}`
							)
					},
					[NodeType.Text]: (n) =>
						log.push(
							`text:${
								/** @type {import("../lib/html/syntax").HtmlText} */ (n).data
							}`
						)
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
				[NodeType.Document]: (n, parent) =>
					seen.push([n.type, parent && parent.type])
			})
			.process("<p>x</p>");
		expect(seen).toEqual([[NodeType.Document, null]]);
	});

	it("fires comment / doctype visitors", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Doctype]: () => log.push("doctype"),
				[NodeType.Comment]: (n) =>
					log.push(
						`comment:${
							/** @type {import("../lib/html/syntax").HtmlComment} */ (n).data
						}`
					)
			})
			.process("<!DOCTYPE html><!--c--><p>x</p>");
		expect(log).toEqual(["doctype", "comment:c"]);
	});

	it("ctx.skipChildren() stops descent into a node", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Element]: (n, p, ctx) => {
					const el = /** @type {import("../lib/html/syntax").HtmlElement} */ (
						n
					);
					log.push(el.tagName);
					if (el.tagName === "div") ctx.skipChildren();
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
				[NodeType.Element]: (n) =>
					log.push(
						/** @type {import("../lib/html/syntax").HtmlElement} */ (n).tagName
					)
			})
			.process("<template><p>x</p></template>");
		expect(log).toEqual(["html", "head", "template", "fragment", "p", "body"]);
	});

	it("walks a pre-built AST when options.ast is given", () => {
		/** @type {string[]} */
		const log = [];
		const ast = buildHtmlAst("<p>x</p>");
		new SourceProcessor()
			.use({
				[NodeType.Element]: (n) =>
					log.push(
						/** @type {import("../lib/html/syntax").HtmlElement} */ (n).tagName
					)
			})
			.process("ignored input", { ast });
		expect(log).toEqual(["html", "head", "body", "p"]);
	});

	it("use() chains and accumulates visitors per type", () => {
		let a = 0;
		let b = 0;
		const sp = new SourceProcessor()
			.use({ [NodeType.Element]: () => a++ })
			.use({ [NodeType.Element]: () => b++ });
		expect(sp).toBeInstanceOf(SourceProcessor);
		sp.process("<p>x</p>");
		expect(a).toBe(b);
		expect(a).toBeGreaterThan(0);
	});
});

describe("buildHtmlAst — insertion-mode edge cases", () => {
	it("merges foster-parented text runs before a table", () => {
		const nodes = body("<table>x<tr></tr>y</table>");
		// Both stray runs are fostered before the table and merged into one node.
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				/** @type {unknown} */ (nodes[0])
			).data
		).toBe("xy");
		expect(nodes[1].type).toBe(NodeType.Element);
	});

	it("keeps end tags and comments under foreign rules inside <svg>", () => {
		const svg = find("<svg><circle></circle><!--c--></svg>", "svg");
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (svg.children[0])
				.tagName
		).toBe("circle");
		expect(svg.children[1].type).toBe(NodeType.Comment);
	});

	it("ignores stray end tags before head", () => {
		const nodes = body("</div><p>x</p>");
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (nodes[0]).tagName
		).toBe("p");
	});

	it("handles <noscript> in head with comments, whitespace, and stray tags", () => {
		const noscript = find(
			"<head><noscript><!--c--> <link></div><head></noscript></head>",
			"noscript"
		);
		expect(noscript.children[0].type).toBe(NodeType.Comment);
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (
				noscript.children.find((c) => c.type === NodeType.Element)
			).tagName
		).toBe("link");
	});

	it("pops <noscript> in head on non-passthrough content", () => {
		// <span> is not allowed in head-noscript: noscript is popped and the
		// span lands in the body.
		const nodes = body("<head><noscript><span>x</span></noscript></head>");
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (nodes[0]).tagName
		).toBe("span");
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
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (t1.children[0])
				.tagName
		).toBe("caption");
		// A <tr> start while in caption closes the caption first.
		const t2 = find("<table><caption>a<tr><td>b</table>", "table");
		expect(
			/** @type {import("../lib/html/syntax").HtmlElement} */ (t2.children[0])
				.tagName
		).toBe("caption");
		expect(child(t2.children, "tbody")).toBeDefined();
		// Ignored stray ends inside caption.
		const t3 = find("<table><caption>a</td></tbody>b</table>", "table");
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				/** @type {import("../lib/html/syntax").HtmlElement} */ (t3.children[0])
					.children[0]
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
		const ast = buildHtmlAst("<p>a</p></html><!--c-->z");
		// Comment after </html> attaches to the document.
		expect(ast.children.some((c) => c.type === NodeType.Comment)).toBe(true);
		// Non-whitespace text re-enters the body.
		const texts = body("<p>a</p></html>z");
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				/** @type {import("../lib/html/syntax").HtmlElement} */ (texts[0])
					.children[0]
			).data
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
		const ast = buildHtmlAst(src);
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
		expect(
			/** @type {import("../lib/html/syntax").HtmlText} */ (
				selectedcontent.children[0]
			).data
		).toBe("B");
	});
});

describe("buildHtmlAst — stray doctype and <html> re-dispatch", () => {
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

// The `skip` options are pure output reductions: tree construction (and quirks
// detection) must run identically, so the ELEMENT tree — tags, nesting, offsets
// and attributes — is the same with any skip combination as with none. This
// guards the risky `skip.text` path, which drops text-node insertion.
describe("buildHtmlAst — skip options preserve element structure", () => {
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
		"<!-- only a comment -->"
	];

	/**
	 * @param {import("../lib/html/syntax").HtmlDocument} doc document
	 * @returns {string} a signature of the element tree (tags, nesting, offsets, attrs)
	 */
	const elementSignature = (doc) => {
		/** @type {string[]} */
		const out = [];
		/**
		 * @param {import("../lib/html/syntax").HtmlNode | import("../lib/html/syntax").HtmlDocument | import("../lib/html/syntax").HtmlDocumentFragment} node node
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

	const skipCombos = [
		{ text: true },
		{ comments: true },
		{ doctype: true },
		{ text: true, comments: true, doctype: true }
	];

	it.each(cases)("keeps the element tree stable under skip (%s)", (src) => {
		const baseline = elementSignature(buildHtmlAst(src));
		for (const skip of skipCombos) {
			expect(elementSignature(buildHtmlAst(src, undefined, skip))).toBe(
				baseline
			);
		}
	});

	it("skip.text drops every text node; raw-text bodies stay readable via contentEnd", () => {
		const src = "<p>prose</p><script>var x=1;</script>";
		const doc = buildHtmlAst(src, undefined, { text: true });
		/** @type {import("../lib/html/syntax").HtmlText[]} */
		const texts = [];
		/** @type {import("../lib/html/syntax").HtmlElement | undefined} */
		let script;
		/** @param {import("../lib/html/syntax").HtmlNode} n node */
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
				/** @type {import("../lib/html/syntax").HtmlElement} */ (script).tagEnd,
				/** @type {import("../lib/html/syntax").HtmlElement} */ (script)
					.contentEnd
			)
		).toBe("var x=1;");
	});

	it("skip.comments drops comment nodes; skip.doctype drops the doctype node", () => {
		const src = "<!DOCTYPE html><!-- c --><p></p>";
		const count = (
			/** @type {import("../lib/html/syntax").HtmlDocument} */ doc,
			/** @type {number} */ type
		) => {
			let n = 0;
			/** @param {import("../lib/html/syntax").HtmlNode} node node */
			const walk = (node) => {
				if (node.type === type) n++;
				if ("children" in node) for (const c of node.children) walk(c);
			};
			for (const c of doc.children) walk(c);
			return n;
		};
		expect(count(buildHtmlAst(src, undefined, { comments: true }), NodeType.Comment)).toBe(0);
		expect(count(buildHtmlAst(src, undefined, { doctype: true }), NodeType.Doctype)).toBe(0);
		// Baseline still has both.
		expect(count(buildHtmlAst(src), NodeType.Comment)).toBe(1);
		expect(count(buildHtmlAst(src), NodeType.Doctype)).toBe(1);
	});

	it("skip.text records every raw-text element body span on contentEnd", () => {
		// script/style (raw text) + textarea/title (escapable raw text): each body
		// is the element's raw value, recorded as [tagEnd, contentEnd] — no Text node.
		const src =
			"<title>ti</title><style>.s{}</style></head><body>prose<script>sc</script><textarea>ta</textarea>";
		const doc = buildHtmlAst(src, undefined, { text: true });
		/** @type {Record<string, string>} */
		const bodies = {};
		/** @param {import("../lib/html/syntax").HtmlNode} n node */
		const walk = (n) => {
			// No Text nodes are emitted under skip.text.
			expect(n.type).not.toBe(NodeType.Text);
			if (n.type === NodeType.Element) {
				if (n.contentEnd > n.tagEnd) {
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
			const base = elementSignature(buildHtmlAst(src, ctx));
			for (const skip of skipCombos) {
				expect(elementSignature(buildHtmlAst(src, ctx, skip))).toBe(base);
			}
		}
	});
});
