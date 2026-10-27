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
	decodeEntities,
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

		it("closes the <a> it found for a nested <a>, not the outermost one", () => {
			// The inner `<a>`s sit below the cell's marker; the outer one stays open
			// past the table, so the text after it is still inside it.
			const [outer] = body("<a>1<table><td><a>2<a>3</td></table>4");
			expect(outer.tagName).toBe("a");
			expect(
				/** @type {MatText} */ (outer.children[outer.children.length - 1]).data
			).toBe("4");
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

describe("parseHtml — parseError", () => {
	it("forwards the option to the tokenizer", () => {
		/** @type {[string, string][]} */
		const errors = [];
		parseHtmlRefs("<!DOCTYPE html><br foo=><p></x>", 0, {
			parseError: (input, code, start, end) => {
				errors.push([code, input.slice(start, end)]);
			}
		});
		expect(errors).toEqual([
			["missing-attribute-value", ">"],
			["unexpected-end-tag", "</x>"]
		]);
	});

	it.each([
		["x", undefined, ["expected-doctype-but-got-chars"]],
		["<p>", undefined, ["expected-doctype-but-got-start-tag"]],
		["</p>", undefined, ["expected-doctype-but-got-end-tag", "unexpected-end-tag-before-html"]],
		["", undefined, ["expected-doctype-but-got-eof"]],
		["<!DOCTYPE html5>", undefined, ["unknown-doctype"]],
		["<!DOCTYPE html PUBLIC \"x\">", undefined, ["unknown-doctype"]],
		["<!DOCTYPE html SYSTEM \"x\">", undefined, ["unknown-doctype"]],
		["<!DOCTYPE html SYSTEM \"about:legacy-compat\">", undefined, []],
		["<!DOCTYPE html><!DOCTYPE html>", undefined, ["unexpected-doctype"]],
		["<!DOCTYPE html><html><!DOCTYPE html></x>", undefined, ["unexpected-doctype", "end-tag-after-implied-root"]],
		["<!DOCTYPE html><head><!DOCTYPE html><head></x>", undefined, ["unexpected-doctype", "two-heads-are-not-better-than-one", "unexpected-end-tag"]],
		["<!DOCTYPE html><head></template>", undefined, ["unexpected-end-tag"]],
		["<!DOCTYPE html><head><template><div></template>", undefined, ["end-tag-too-early"]],
		["<!DOCTYPE html><head><noscript><!DOCTYPE html><head></x>x", undefined, ["unexpected-doctype", "unexpected-start-tag", "unexpected-end-tag", "char-in-head-noscript"]],
		["<!DOCTYPE html><head><noscript></br>", undefined, ["unexpected-inhead-noscript-tag", "unexpected-end-tag-treated-as"]],
		["<!DOCTYPE html><head><noscript>", undefined, ["eof-in-head-noscript"]],
		["<!DOCTYPE html><head></head><!DOCTYPE html><title></title><head></x>", undefined, ["unexpected-doctype", "unexpected-start-tag-out-of-my-head", "unexpected-start-tag", "unexpected-end-tag"]],
		["<!DOCTYPE html><body><!DOCTYPE html><html><body><frameset>", undefined, ["unexpected-doctype", "non-html-root", "unexpected-start-tag", "unexpected-start-tag"]],
		["<!DOCTYPE html><h1><h2>", undefined, ["unexpected-start-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><form><form>", undefined, ["unexpected-start-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><li><b><li>", undefined, ["end-tag-too-early"]],
		["<!DOCTYPE html><dd><b><dt>", undefined, ["end-tag-too-early"]],
		["<!DOCTYPE html><button><button>", undefined, ["unexpected-start-tag-implies-end-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><a><a>", undefined, ["unexpected-start-tag-implies-end-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><nobr><nobr>", undefined, ["unexpected-start-tag-implies-end-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><select><input>", undefined, ["unexpected-input-in-select"]],
		["<!DOCTYPE html><select><option><b><hr>", undefined, ["unexpected-start-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><select><option><b><option>", undefined, ["unexpected-start-tag-implies-end-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><image>", undefined, ["unexpected-start-tag-treated-as"]],
		["<!DOCTYPE html><select><select>", undefined, ["unexpected-select-in-select"]],
		["<!DOCTYPE html><ruby><b><rb><span><rt>", undefined, ["unexpected-start-tag", "unexpected-start-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><caption><col><frame><head><tbody>", undefined, ["unexpected-start-tag-ignored", "unexpected-start-tag-ignored", "unexpected-start-tag-ignored", "unexpected-start-tag-ignored", "unexpected-start-tag-ignored"]],
		["<!DOCTYPE html><div>\u0000x", undefined, ["unexpected-null-character", "invalid-codepoint", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><p><li><dd>", undefined, []],
		["<!DOCTYPE html></select><select><b></select>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
		["<!DOCTYPE html></body><b></body>", undefined, ["unexpected-start-tag-after-body", "expected-one-end-tag-but-got-another"]],
		["<!DOCTYPE html></div><div><b></div>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
		["<!DOCTYPE html></form><form><b></form>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early-ignored", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><template></form><form><b></form></template>", undefined, ["unexpected-end-tag", "end-tag-too-early-ignored"]],
		["<!DOCTYPE html></p><p><b></p>", undefined, ["unexpected-end-tag-before-html", "unexpected-end-tag"]],
		["<!DOCTYPE html></li><li><b></li>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
		["<!DOCTYPE html></dd><dd><b></dd>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
		["<!DOCTYPE html></h1><h1><b></h2>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
		["<!DOCTYPE html></object><object><b></object>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
		["<!DOCTYPE html></br>", undefined, ["unexpected-end-tag-treated-as"]],
		["<!DOCTYPE html><b></i></div><span><div></span>", undefined, ["unexpected-end-tag", "unexpected-end-tag", "unexpected-end-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><b><div></b>", undefined, ["adoption-agency-1.3", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><b><table></b>", undefined, ["unexpected-end-tag-implies-table-voodoo", "adoption-agency-4.4", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><a><table><td><a><table></table><a></tr><a></table>", undefined, ["unexpected-cell-in-table-body", "unexpected-start-tag-implies-end-tag", "unexpected-cell-end-tag", "unexpected-start-tag-implies-table-voodoo", "unexpected-start-tag-implies-end-tag", "adoption-agency-4.4"]],
		["<!DOCTYPE html><script>", undefined, ["expected-named-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><script></script x", undefined, ["eof-in-tag", "expected-named-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><script></S", undefined, ["expected-named-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><script><!--<a", undefined, ["eof-in-script-html-comment-like-text", "expected-named-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><script><!--</", undefined, ["eof-in-script-html-comment-like-text", "expected-named-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><script><!--</script", undefined, ["eof-in-script-html-comment-like-text", "expected-named-closing-tag-but-got-eof"]],
		["</b test", undefined, ["eof-in-tag", "expected-doctype-but-got-eof"]],
		["<!DOCTYPE html><table><!DOCTYPE html><table></table></table>", undefined, ["unexpected-doctype", "unexpected-start-tag-implies-end-tag", "unexpected-end-tag"]],
		["<!DOCTYPE html><table><input type=hidden><form><form>", undefined, ["unexpected-hidden-input-in-table", "unexpected-form-in-table", "unexpected-form-in-table", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><table><tr><b>x y</b>", undefined, ["unexpected-start-tag-implies-table-voodoo", "unexpected-character-implies-table-voodoo", "unexpected-character-implies-table-voodoo", "unexpected-character-implies-table-voodoo", "unexpected-end-tag-implies-table-voodoo", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><table>\u0000 x<tr>", undefined, ["unexpected-null-character", "invalid-codepoint", "unexpected-character-implies-table-voodoo", "unexpected-character-implies-table-voodoo", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><table><caption></caption></caption>", undefined, ["unexpected-end-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><table><caption><b></caption>", undefined, ["expected-one-end-tag-but-got-another", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><template><caption></caption></caption><caption></body><col>",
			undefined,
			["unexpected-end-tag", "unexpected-end-tag", "eof-in-template"]
		],
		["<col></caption>", "caption", ["unexpected-start-tag", "unexpected-end-tag"]],
		[
			"<!DOCTYPE html><p><b></p></b>",
			undefined,
			["unexpected-end-tag", "adoption-agency-1.2"]
		],
		[
			"<!DOCTYPE html><div>&amp;\u0000",
			undefined,
			[
				"unexpected-null-character",
				"invalid-codepoint",
				"expected-closing-tag-but-got-eof"
			]
		],
		[
			"<!DOCTYPE html><template><col></x>",
			undefined,
			["unexpected-end-tag", "eof-in-template"]
		],
		[
			"<!DOCTYPE html><body></body></x>",
			undefined,
			["unexpected-end-tag-after-body", "unexpected-end-tag"]
		],
		[
			"<!DOCTYPE html><body></body>x",
			undefined,
			["unexpected-char-after-body"]
		],
		["<!DOCTYPE html><table><colgroup><!DOCTYPE html></col>x", undefined, ["unexpected-doctype", "no-end-tag", "unexpected-character-implies-table-voodoo", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><template><col> x<b></colgroup>", undefined, ["unexpected-char-in-column-group", "unexpected-start-tag", "unexpected-end-tag", "eof-in-template"]],
		["<!DOCTYPE html><table><tbody><td></thead></body>", undefined, ["unexpected-cell-in-table-body", "unexpected-end-tag", "unexpected-end-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><table><tbody></thead></body>", undefined, ["unexpected-end-tag-in-table-body", "unexpected-end-tag-in-table-body", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><template><tr></tr><caption></table></template>", undefined, ["unexpected-start-tag", "unexpected-end-tag"]],
		["<!DOCTYPE html><template><td></td></tr><caption></table></template>", undefined, ["unexpected-end-tag", "unexpected-start-tag", "unexpected-end-tag"]],
		["<!DOCTYPE html><table><tr></thead></td>", undefined, ["unexpected-end-tag", "unexpected-end-tag-in-table-row", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><table><tr><td><b></td><td></table></td></caption>", undefined, ["unexpected-cell-end-tag", "unexpected-end-tag", "unexpected-end-tag"]],
		["<!DOCTYPE html><table><tr><td></tr><td><b></tr>", undefined, ["unexpected-cell-in-table-body", "unexpected-cell-end-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><template></x>", undefined, ["unexpected-end-tag", "eof-in-template"]],
		["<!DOCTYPE html><body></body><!DOCTYPE html><b></b>x</html>", undefined, ["unexpected-doctype", "unexpected-start-tag-after-body"]],
		["<!DOCTYPE html><body></body></html><p></p>x", undefined, ["expected-eof-but-got-start-tag"]],
		["<!DOCTYPE html><html><body></html>x", undefined, ["expected-eof-but-got-char"]],
		["<!DOCTYPE html><frameset><!DOCTYPE html>x <b></b></frameset></frameset>", undefined, ["unexpected-doctype", "unexpected-char-in-frameset", "unexpected-start-tag-in-frameset", "unexpected-end-tag-in-frameset", "unexpected-end-tag-after-frameset"]],
		["<!DOCTYPE html><frameset>", undefined, ["eof-in-frameset"]],
		["<!DOCTYPE html><frameset></frameset><!DOCTYPE html>x <b>", undefined, ["unexpected-doctype", "unexpected-char-after-frameset", "unexpected-start-tag-after-frameset"]],
		["<!DOCTYPE html><frameset></frameset></html>x <b></b>", undefined, ["expected-eof-but-got-char", "expected-eof-but-got-start-tag", "expected-eof-but-got-end-tag"]],
		["<!DOCTYPE html><svg><!DOCTYPE html>\u0000<b></svg><svg></p>", undefined, ["unexpected-doctype", "unexpected-null-character", "invalid-codepoint", "unexpected-html-element-in-foreign-content", "unexpected-end-tag", "unexpected-html-element-in-foreign-content", "unexpected-end-tag", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><svg><g></x>",
			undefined,
			[
				"unexpected-end-tag",
				"unexpected-end-tag",
				"expected-closing-tag-but-got-eof"
			]
		],
		["<!DOCTYPE html><div/><br/><svg/><math/><svg><g/></svg>", undefined, ["non-void-html-element-start-tag-with-trailing-solidus", "expected-closing-tag-but-got-eof"]],
		["<!DOCTYPE html><frameset><frame/></frameset>", undefined, []],
		["<!DOCTYPE html><body><frame/>", undefined, ["unexpected-start-tag-ignored", "non-void-html-element-start-tag-with-trailing-solidus"]],
		["</frameset>x", "frameset", ["unexpected-frameset-in-frameset-innerhtml", "unexpected-char-in-frameset"]],
		["<body></body></html>", "html", ["unexpected-end-tag-after-body-innerhtml"]],
	])("reports the tree's errors in %j", (source, fragmentContext, codes) => {
		/** @type {string[]} */
		const reported = [];
		parseHtmlRefs(/** @type {string} */ (source), 0, {
			fragmentContext: /** @type {string | undefined} */ (fragmentContext),
			parseError: (input, code) => {
				reported.push(code);
			}
		});
		expect(reported).toEqual(codes);
	});
});

describe("parseHtml — SourceProcessor", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
const { NodeType } = require("../../../lib/html/syntax-parser");

	it("prints an implied opener only when its first piece needs it", () => {
		// Leading whitespace is what the modes would drop, so it brings the tag back.
		const minify = (/** @type {string} */ src) =>
			new SourceProcessor().process(src, { mode: "minify" }).code;
		expect(minify("</body> foo")).toBe("<body> foo</body>");
		expect(minify("<template></template>")).toBe("<template></template>");
	});

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

	it("exposes a doctype's identifier ranges through the accessors", () => {
		const source = '<!DOCTYPE html PUBLIC "p" "s"><p>x';
		const doctype = A.child(0, parseHtmlRefs(source, 0));
		expect(A.type(doctype)).toBe(NodeType.Doctype);
		expect(A.rangeOf(Part.publicId, doctype)).toEqual([23, 24]);
		expect(A.rangeOf(Part.systemId, doctype)).toEqual([27, 28]);
		expect(A.rangeOf(Part.content, doctype)).toBeNull();
	});

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

	it("reads every node kind and attribute through the current-node defaults", () => {
		const { Flag } = require("../../../lib/html/syntax-parser");
		const SRC =
			"<!DOCTYPE html><template><p>t</p></template>" +
			"<div a=1 b=\"2\" c='3' d>x<!--c--><i></i ></div>";
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Document]: (path) => {
						log.push(
							`doc:${path.index}:${path.range()}:${path.loc()}:${path.within(NodeType.Document)}`
						);
					},
					[NodeType.DocumentFragment]: (path) => {
						log.push(
							`fragment:${path.index}:${path.within(NodeType.Element)}:${JSON.stringify(path.name())}:${JSON.stringify(path.value())}`
						);
					},
					[NodeType.Doctype]: (path) => {
						log.push(
							`doctype:${path.startOf(Part.name)}:${path.endOf(Part.name)}:${path.textOf(Part.name)}`
						);
					},
					[NodeType.Comment]: (path) => {
						log.push(
							`comment:${path.index}:${path.type()}:${path.source()}:${JSON.stringify(path.name())}:${path.fieldCount(Field.attributes)}:${path.field(0, Field.attributes)}:${path.fieldNamed(Field.attributes, "a")}:${path.startOf(Part.name)}:${path.endOf(Part.name)}:${path.textOf(Part.publicId)}`
						);
					},
					[NodeType.Element]: (path) => {
						const name = path.name();
						if (name === "template") {
							log.push(
								`template:${path.fieldCount(Field.content)}:${path.type(path.field(0, Field.content))}:${path.field(1, Field.content)}`
							);
						}
						if (name === "i") {
							log.push(
								`i:${path.index}:${path.rangeOf(Part.endTag)}:${path.within(NodeType.Element)}:${path.within(NodeType.DocumentFragment)}`
							);
						}
						if (name !== "div") return;
						for (let i = 0; i < 4; i++) {
							const a = path.field(i, Field.attributes);
							log.push(
								`attr:${path.type(a)}:${path.source(a)}:${path.range(a)}:${path.start(a)}-${path.end(a)}:${path.loc(a)}:${path.rangeOf(Part.value, a)}:${path.startOf(Part.startTag, a)}:${path.endOf(Part.startTag, a)}:${path.flag(Flag.selfClosing, a)}:${path.children(a).length}`
							);
						}
						log.push(
							`div:${path.source(0, 9)}:${path.start()}-${path.end()}:${path.childCount()}/${path.childCount()}:${path.type(path.child(1))}:${path.type(path.child(0))}:${path.children().length}:${path.flag(Flag.selfClosing)}:${path.fieldCount(Field.content)}:${path.field(0, Field.content)}:${path.fieldNamed(Field.content, "a")}`
						);
					}
				})
			)
			.process(SRC);
		expect(log).toEqual([
			"doc:0:0,0:1,0,1,0:false",
			"doctype:-1:-1:null",
			"template:1:2:0",
			// the content fragment is in no sibling chain, and links to no element
			'fragment:0:true:"":""',
			"attr:8:a=1:49,52:49-52:1,49,1,52:51,52:-1:-1:false:0",
			'attr:8:b="2":53,58:53-58:1,53,1,58:56,57:-1:-1:false:0',
			"attr:8:c='3':59,64:59-64:1,59,1,64:62,63:-1:-1:false:0",
			"attr:8:d:65,66:65-66:1,65,1,66:null:-1:-1:false:0",
			`div:<!DOCTYPE:44-90:3/3:${NodeType.Comment}:${NodeType.Text}:3:false:0:0:0`,
			`comment:1:${NodeType.Comment}:<!--c-->:"":0:0:0:-1:-1:null`,
			// the end tag's range spans the whitespace before its `>`
			"i:2:79,84:true:false"
		]);
	});

	it("reads each part of an element, with an end tag, without one and parser-inserted", () => {
		const doc = parseHtmlRefs("<table><tr><td>x</table><div a=1>y</div>");
		/** @type {Record<string, string>} */
		const parts = {};
		/** @param {number} n node */
		const walk = (n) => {
			if (A.type(n) === NodeType.Element) {
				parts[A.name(n)] = [
					Part.name,
					Part.startTag,
					Part.content,
					Part.endTag,
					Part.publicId
				]
					.map((p) => `${A.startOf(p, n)}/${A.endOf(p, n)}`)
					.join(" ");
			}
			for (const c of A.children(n)) walk(c);
		};
		walk(doc);
		expect(parts).toEqual({
			html: "-1/-1 -1/-1 -1/-1 -1/-1 -1/-1",
			head: "-1/-1 -1/-1 -1/-1 -1/-1 -1/-1",
			body: "-1/-1 -1/-1 -1/-1 -1/-1 -1/-1",
			table: "1/6 0/7 7/16 16/24 -1/-1",
			// borrowed from the `<tr>` that implied it, so no start tag of its own
			tbody: "8/10 -1/-1 11/24 -1/-1 -1/-1",
			tr: "8/10 7/11 11/24 -1/-1 -1/-1",
			td: "12/14 11/15 15/24 -1/-1 -1/-1",
			div: "25/28 24/33 33/34 34/40 -1/-1"
		});
	});

	it("names a processing instruction by its target, empty or not", () => {
		for (const [source, target, xml] of /** @type {[string, string, boolean][]} */ ([
			["<?x y?>", "x", false],
			// HTML reads this as a bogus comment, XML as a target-less instruction
			["<? y?><r/>", "", true]
		])) {
			const pi = A.child(0, parseHtmlRefs(source, 0, { xml }));
			expect([A.type(pi), A.name(pi), A.value(pi)]).toEqual([
				NodeType.ProcessingInstruction,
				target,
				"y"
			]);
		}
	});

	it("clears the foster-region marks a print left on reused node slots", () => {
		const { FLAG_FOSTER_REGION } = require("../../../lib/html/syntax-parser");
		// A run no re-nesting reproduces prints from source, marking its holder.
		const source = "<dt><table> </nav>x<p>";
		expect(
			new SourceProcessor().process(source, { mode: "minify" }).code
		).toBe(source);
		/** @type {number[]} */
		const marked = [];
		/** @param {number} n node */
		const walk = (n) => {
			if (A.flag(FLAG_FOSTER_REGION, n)) marked.push(n);
			for (const c of A.children(n)) walk(c);
		};
		walk(parseHtmlRefs(source));
		expect(marked).toEqual([]);
	});

	it("path.stop() ends the walk after the current visitor", () => {
		/** @type {string[]} */
		const log = [];
		const { SourceProcessor: Processor } = require("../../../lib/html/syntax");
		const processor = new Processor().use({
			[NodeType.Element]: (path) => {
				log.push(path.name());
				if (path.name() === "b") {
					path.stop();
					// a second call is a no-op
					path.stop();
				}
			}
		});
		processor.process("<a></a><b></b><i></i>");
		expect(log).toEqual(["html", "head", "body", "a", "b"]);
		// the next run starts with every visitor in place again
		log.length = 0;
		processor.process("<i></i>");
		expect(log).toEqual(["html", "head", "body", "i"]);
		// stopped from an `exit`: the enclosing elements exit no more
		log.length = 0;
		new Processor()
			.use({
				[NodeType.Element]: {
					exit: (path) => {
						log.push(path.name());
						if (path.name() === "a") path.stop();
					}
				}
			})
			.process("<p><a></a></p><b></b>");
		expect(log).toEqual(["head", "a"]);
	});

	it("a skipChildren() on the root leaves only the root's own exit", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Document]: {
					enter: (path) => {
						log.push("enter");
						path.skipChildren();
					},
					exit: () => log.push("exit")
				},
				[NodeType.Element]: (path) => log.push(path.name())
			})
			.process("<p>x</p>");
		expect(log).toEqual(["enter", "exit"]);
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

	it("should end an empty descriptor list at a comma after the url", () => {
		expect(parseSrcset("a.png ,b.png")).toEqual([
			["a.png", 0, 5],
			["b.png", 7, 12]
		]);
	});

	it("should keep a parenthesized run inside a started descriptor", () => {
		expect(() => parseSrcset("a.png 1x(2)")).toThrow(
			"Invalid srcset descriptor found in 'a.png 1x(2)' at '1x(2)'"
		);
	});

	it("should stay after a descriptor across a whitespace run", () => {
		expect(parseSrcset("a.png 1x  , b.png")).toEqual([
			["a.png", 0, 5],
			["b.png", 12, 17]
		]);
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

	it("should skip a part without a key", () => {
		expect(parseMsapplicationTask("x;icon-uri=a.png")).toEqual([
			["a.png", 11, 16]
		]);
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

	it("should skip a url() whose string is cut by a newline", () => {
		// the bad string ends at the newline; scanning goes on after it
		expect(parseCssUrls('mask:url("a\n"x") url(b.png)')).toEqual([
			["b.png", 21, 26]
		]);
	});

	it("should take an unterminated url() string up to EOF", () => {
		expect(parseCssUrls('mask:url("a.png')).toEqual([["a.png", 10, 15]]);
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
	],
	[
		"keeps a paragraph open around a table in quirks mode from a doctype naming no html",
		"<!DOCTYPE potato><p><table>",
		undefined
	],
	[
		"ignores a form end tag whose form the table already closed",
		"<table><form></table></form>x",
		undefined
	],
	[
		"drops a formatting end tag a marker hides nothing behind",
		"<applet></b>x",
		undefined
	],
	[
		"drops a formatting end tag a marker on a marker hides",
		"<applet><marquee></b>x",
		undefined
	],
	[
		"drops a formatting end tag naming another element below the marker",
		"<i><applet></b>x",
		undefined
	],
	[
		"drops the formatting entry whose element an end tag already closed",
		"<p id=a><b><p id=b></b>TEST",
		undefined
	],
	[
		"keeps the bookmark when the inner loop removes entries above it",
		"<b><em><x><y><z><aside></b></em>",
		undefined
	],
	[
		"replaces a body that is not the last child of the root with a frameset",
		"</body><!--x--><frameset>",
		undefined
	],
	[
		"drops whitespace before the html element",
		"<!DOCTYPE html> <html>",
		undefined
	],
	[
		"keeps whitespace in a head noscript",
		"<head><noscript> </noscript>",
		undefined
	],
	[
		"reopens a nested form under an implied end tag in a template",
		"<template><form><li><form>",
		undefined
	],
	[
		"leaves a list item a special element shields open",
		"<li>a<section><li>b",
		undefined
	],
	[
		"walks past an ordinary element to the definition list item",
		"<foo>1<dd>2</foo>",
		undefined
	],
	[
		"walks past a foreign element below a special one for a definition item",
		"<svg><foreignObject><dd>",
		undefined
	],
	[
		"leaves a definition item a special element shields open",
		"<dd>a<section><dt>b",
		undefined
	],
	[
		"opens a link where a marker hides no other",
		"<applet><a>x",
		undefined
	],
	[
		"closes a nobr with the adoption agency",
		"<nobr>1<nobr>2",
		undefined
	],
	[
		"keeps frameset-ok after a hidden input",
		"<input type=hidden><frameset>",
		undefined
	],
	[
		"inserts a param as a void element",
		"<param>A",
		undefined
	],
	[
		"reads an image start tag as img",
		"<p><image></p>",
		undefined
	],
	[
		"reads xmp, iframe and noembed content as raw text",
		"<xmp><b></xmp><iframe><b></iframe><noembed><b></noembed>x",
		undefined
	],
	[
		"closes an option outside a select at the next option",
		"<option>a<option>b",
		undefined
	],
	[
		"inserts ruby parts outside a ruby",
		"<rb>a<rtc>b<rp>c<rt>d",
		undefined
	],
	[
		"closes a list item at its end tag",
		"<ul><li>A</li>B</ul>",
		undefined
	],
	[
		"ignores a sarcasm end tag",
		"<div></sarcasm>x",
		undefined
	],
	[
		"closes a marquee at its end tag",
		"<marquee>a</marquee>b",
		undefined
	],
	[
		"keeps an end tag cut off by the end of the file as script text",
		"<script></S",
		undefined
	],
	[
		"keeps an end tag cut off by the end of the file as title text",
		"<title>a</title",
		undefined
	],
	[
		"goes back to the body for content after the body",
		"</body>x",
		undefined
	],
	[
		"drops text after the frameset that is not whitespace",
		"<frameset></frameset>x",
		undefined
	],
	[
		"keeps whitespace after the html end tag in the body",
		"</html> <head>",
		undefined
	],
	[
		"nests forms in a template",
		"<template><form><form>",
		undefined
	],
	[
		"takes a declarative shadow root on a custom element",
		"<x-y>a<template shadowrootmode=open></template>b",
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

describe("parseHtml — arcs the conformance corpus leaves out", () => {
	it("merges the texts a declarative shadow root parted when adoption moves them", () => {
		// The engine takes the shadow root's template out of the tree, so "a" and
		// "b" are one text node there; the clone the adoption agency makes takes it.
		expect(
			treeOf('<b><div>a<template shadowrootmode="open"></template>b</b>')
		).toBe(
			[
				"| <html>",
				"|   <head>",
				"|   <body>",
				"|     <b>",
				"|     <div>",
				"|       <template>",
				'|         shadowrootmode="open"',
				"|         content",
				"|       <b>",
				'|         "ab"'
			].join("\n")
		);
	});

	it("fosters text past foreign elements on the stack", () => {
		expect(
			treeOf("<svg><foreignObject><table>x</table></foreignObject></svg>")
		).toBe(
			[
				"| <html>",
				"|   <head>",
				"|   <body>",
				"|     <svg svg>",
				"|       <svg foreignObject>",
				'|         "x"',
				"|         <table>"
			].join("\n")
		);
	});

	it("ignores a DOCTYPE in foreign content", () => {
		expect(treeOf("<svg><!DOCTYPE html><g/></svg>")).toBe(
			[
				"| <html>",
				"|   <head>",
				"|   <body>",
				"|     <svg svg>",
				"|       <svg g>"
			].join("\n")
		);
	});

	it("keeps frameset-ok across whitespace and NUL in foreign content", () => {
		const frameset = ["| <html>", "|   <head>", "|   <frameset>"].join("\n");
		expect(treeOf("<svg> </svg><frameset>")).toBe(frameset);
		expect(treeOf("<svg>\0</svg><frameset>")).toBe(frameset);
		expect(treeOf("<svg>x</svg><frameset>")).toBe(
			[
				"| <html>",
				"|   <head>",
				"|   <body>",
				"|     <svg svg>",
				'|       "x"'
			].join("\n")
		);
	});

	it("inserts the whitespace among characters a column group without a colgroup ignores", () => {
		// Each character is its own token, so only the non-whitespace ones go.
		expect(treeOf("<template><col>a b<col></template>")).toBe(
			[
				"| <html>",
				"|   <head>",
				"|     <template>",
				"|       content",
				"|         <col>",
				'|         " "',
				"|         <col>",
				"|   <body>"
			].join("\n")
		);
		expect(treeOf("a b\tc", "colgroup")).toBe('| " \t"');
	});

	it("leaves the tokenizer in the data state after a tag the column group ignored", () => {
		// The ignored start tag never runs the RCDATA / RAWTEXT switch, so what
		// follows is markup: a comment, and an element the mode ignores too.
		expect(treeOf("<textarea><!--c-->  <bgsound>", "colgroup")).toBe(
			["| <!-- c -->", '| "  "'].join("\n")
		);
		expect(treeOf("<template><col><style>x</style> <col></template>")).toBe(
			[
				"| <html>",
				"|   <head>",
				"|     <template>",
				"|       content",
				"|         <col>",
				'|         " "',
				"|         <col>",
				"|   <body>"
			].join("\n")
		);
	});

	it("keeps character references literal in a plaintext opened in a table mode", () => {
		// The PLAINTEXT state outlives the table, cell or caption mode it opened in.
		for (const opening of ["<table>", "<table><td>", "<table><caption>"]) {
			const plaintext = find(`${opening}<plaintext>a&amp;b<p>`, "plaintext");
			expect(plaintext.children).toEqual([
				expect.objectContaining({ type: NodeType.Text, data: "a&amp;b<p>" })
			]);
		}
		expect(treeOf("x<plaintext>&amp;", "tbody")).toBe(
			['| "x"', "| <plaintext>", '|   "&amp;"'].join("\n")
		);
	});

	it("reads the whole input as the text of a raw-text fragment context", () => {
		// No start tag opened the context, so no end tag is appropriate to it.
		expect(treeOf("a\0</textarea>\0<b>&amp;", "textarea")).toBe(
			'| "a�</textarea>�<b>&"'
		);
		expect(treeOf("a</style><b>&amp;\r\n", "style")).toBe(
			'| "a</style><b>&amp;\n"'
		);
		expect(treeOf("</script><!--<b>", "script")).toBe('| "</script><!--<b>"');
		expect(treeOf("</title", "title")).toBe('| "</title"');
		const doc = parseHtmlRefs("</noscript><b>x", 0, {
			fragmentContext: "noscript",
			scripting: true
		});
		expect(serializeHtmlTree(A.child(0, doc))).toBe('| "</noscript><b>x"');
		// a foreign context's title is markup, and so is what follows
		expect(treeOf("</title><b>", "svg title")).toBe("| <b>");
	});

	it("clears the whole name memo once a document filled every slot", () => {
		// 512 unknown names, one per memo slot (`z` repeated 1…512 times).
		let src = "";
		for (let n = 1; n <= 512; n++) src += `<${"z".repeat(n)}>`;
		expect(find(src, "z".repeat(512)).tagName).toBe("z".repeat(512));
		// the next parse reads every name afresh
		expect(body("<zz><Zz>").map((n) => n.tagName)).toEqual(["zz"]);
		expect(find("<ZZZ><zzz>", "zzz").children[0]).toEqual(
			expect.objectContaining({ tagName: "zzz" })
		);
	});

	it("leaves the link below a marker open when a later one is closed", () => {
		// The rule removes the `a` it found after the last marker, not the first
		// one in the list: the outer link is another scope's and stays open.
		expect(treeOf("<a>1<marquee><a>2<a>3</marquee>4")).toBe(
			[
				"| <html>",
				"|   <head>",
				"|   <body>",
				"|     <a>",
				'|       "1"',
				"|       <marquee>",
				"|         <a>",
				'|           "2"',
				"|         <a>",
				'|           "3"',
				'|       "4"'
			].join("\n")
		);
	});

	it("keeps the whitespace before other text in a head noscript", () => {
		// Each character is its own token: the newline is the head rules', and
		// only the `x` pops the noscript.
		expect(treeOf("<head><noscript><!--c-->\nx")).toBe(
			[
				"| <html>",
				"|   <head>",
				"|     <noscript>",
				"|       <!-- c -->",
				'|       "',
				'"',
				"|   <body>",
				'|     "x"'
			].join("\n")
		);
	});

	it("keeps every form in template contents, a template fragment's too", () => {
		// The form element pointer is not used while parsing template contents
		// (§13.2.4.4), which a template fragment context is as well.
		expect(treeOf("<form><form>", "template")).toBe(
			["| <form>", "|   <form>"].join("\n")
		);
		expect(treeOf("<table><form><form>", "template")).toBe(
			["| <table>", "|   <form>", "|   <form>"].join("\n")
		);
		expect(treeOf("<template><table><form><form>")).toBe(
			[
				"| <html>",
				"|   <head>",
				"|     <template>",
				"|       content",
				"|         <table>",
				"|           <form>",
				"|           <form>",
				"|   <body>"
			].join("\n")
		);
	});

	it("reads a noscript in the body as raw text when scripting", () => {
		const doc = parseHtmlRefs("<body><noscript><b>x</noscript>y", 0, {
			scripting: true
		});
		expect(serializeHtmlTree(doc)).toBe(
			[
				"| <html>",
				"|   <head>",
				"|   <body>",
				"|     <noscript>",
				'|       "<b>x"',
				'|     "y"'
			].join("\n")
		);
	});

	it("maps decoded text back to the raw offsets", () => {
		expect(decodeEntities("a&amp;b", true, true)).toEqual({
			text: "a&b",
			map: [0, 1, 6, 7]
		});
		expect(decodeEntities("x&lt;&gt;", false, true)).toEqual({
			text: "x<>",
			map: [0, 1, 5, 9]
		});
		expect(decodeEntities("&zz;", true, true)).toEqual({
			text: "&zz;",
			map: undefined
		});
	});

	it("re-sizes the attribute columns a walk released from the next estimate", () => {
		const { SourceProcessor } = require("../../../lib/html/syntax");
		// Past the shrink threshold, the walk's release drops the columns, so the
		// next parse pre-sizes them from its own (small) estimate.
		let elements = 0;
		new SourceProcessor()
			.use({ [NodeType.Element]: () => elements++ })
			.process("<i a b></i>".repeat(33000));
		expect(elements).toBe(33003);
		const nodes = body(`<b class="c">${"x".repeat(100)}</b>`);
		expect(nodes[0].attributes[0].value).toBe("c");
	});
});
