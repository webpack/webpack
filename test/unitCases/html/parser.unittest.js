"use strict";

const { fixture } = require("../../helpers/fixture");

// cspell:ignore apos scrip fffd
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
	parseHtml
} = require("../../helpers/materializeHtmlTree");
const serializeHtmlTree = require("../../helpers/serializeHtmlTree");

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
		processor.process(fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints"));
		expect(processor._printer).toBeUndefined();
		expect(processor.process(fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints"), { mode: "minify" }).code).toBe("<p>x");
		expect(typeof processor._printer).toBe("function");
	});
});

describe("parseHtml", () => {
	it("should parse void elements", () => {
		const nodes = body(fixture("html", "parse-html-should-parse-void-elements"));
		expect(nodes).toHaveLength(2);
		expect(nodes[0].tagName).toBe("img");
		expect(nodes[0].selfClosing).toBe(true);
		expect(nodes[1].tagName).toBe("br");
		expect(nodes[1].selfClosing).toBe(true);
	});

	it("should keep attribute values raw with source offsets", () => {
		const a = body(fixture("html", "parse-html-should-keep-attribute-values-raw-with-source-offsets"))[0];
		expect(a.attributes).toHaveLength(2);
		expect(a.attributes[0].name).toBe("href");
		expect(a.attributes[0].value).toBe("test.html");
		// Raw (undecoded) value preserved; consumers re-resolve from it.
		const raw = body(fixture("html", "parse-html-should-keep-attribute-values-raw-with-source-offsets-2"))[0];
		expect(raw.attributes[0].value).toBe("a&amp;b");
		// Offsets line up with the source.
		const src = fixture("html", "parse-html-should-keep-attribute-values-raw-with-source-offsets-3");
		const link = body(src)[0];
		const attr = link.attributes[0];
		expect(src.slice(attr.valueStart, attr.valueEnd)).toBe("test.html");
	});

	it("should handle self-closing tags", () => {
		const nodes = body(fixture("html", "parse-html-should-handle-self-closing-tags"));
		expect(nodes[0].tagName).toBe("input");
		expect(nodes[0].selfClosing).toBe(true);
	});

	it("should not resolve prototype-named SVG tags and attributes through the adjustment tables", () => {
		const svg = body(fixture("html", "parse-html-should-not-resolve-prototype-named-svg-tags-and-attributes-through"))[0];
		const el = /** @type {MatElement} */ (svg.children[0]);
		expect(el.tagName).toBe("constructor");
		expect(el.attributes[0].name).toBe("tostring");
	});

	it("should export namespace constants", () => {
		expect(Namespace.HTML).toBe(0);
		expect(Namespace.MathML).toBe(1);
		expect(Namespace.SVG).toBe(2);
	});

	it("should set tagEnd, nameEnd and start used by the consumer", () => {
		const src = fixture("html", "parse-html-should-set-tag-end-name-end-and-start-used-by-the-consumer");
		const script = find(src, "script");
		expect(script.start).toBe(0);
		expect(script.tagEnd).toBe(8); // after "<script>"
		expect(src.slice(1, script.nameEnd)).toBe("script");
	});

	it("should update end offsets when an element is closed", () => {
		const src = fixture("html", "parse-html-should-update-end-offsets-when-an-element-is-closed");
		const div = body(src)[0];
		const span = /** @type {MatElement} */ (div.children[0]);
		expect(div.end).toBe(src.length);
		// Closed by `</div>`, which names its parent: its source ends where that starts.
		expect(src.slice(span.start, span.end)).toBe("<span>text");
	});

	it("should end an implicitly closed element where its content ends", () => {
		const src = fixture("html", "parse-html-should-end-an-implicitly-closed-element-where-its-content-ends");
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
		const src = fixture("html", "parse-html-should-keep-whitespace-the-closed-element-holds-inside-its-range");
		// The `x` is foster-parented before the table; the space stays in colgroup.
		const table = /** @type {MatElement} */ (body(src)[1]);
		const colgroup = /** @type {MatElement} */ (table.children[0]);
		expect(src.slice(colgroup.start, colgroup.end)).toBe("<colgroup> ");
	});

	describe("adoption agency algorithm", () => {
		// Noah's Ark only counts entries whose attributes match, so the depth the
		// second <p> reconstructs to reports whether two <b>s compared equal.
		/**
		 * @param {string} src source
		 * @returns {number} nested `b` depth of the last body child
		 */

		it("should not duplicate an attribute span when a formatting element is cloned", () => {
			// The <a> is reopened around <div> by the algorithm; the clone must not
			// reuse the original's href span, or the parser emits two dependencies.
			const nodes = body(fixture("html", "parse-html-adoption-agency-algorithm-should-not-duplicate-an-attribute-span-when"));
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

	it("should mirror the selected <option> into <selectedcontent>", () => {
		const select = body(
			fixture("html", "parse-html-should-mirror-the-selected-option-into-selectedcontent")
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

	it("foster-parents stray text in a table fragment context", () => {
		// Context is a `table`, so there is no `<table>` on the open stack: stray
		// character data is fostered to the fragment root, beside the table rows.
		const root = /** @type {MatElement} */ (
			parseHtml(fixture("html", "parse-html-foster-parents-stray-text-in-a-table-fragment-context"), "table").children[0]
		);
		const texts = root.children
			.filter((c) => c.type === NodeType.Text)
			.map((c) => /** @type {MatText} */ (c).data);
		expect(texts).toContain("x");
		expect(child(root.children, "tbody")).toBeDefined();
	});
});

describe("parseHtml — parseError", () => {
	it.each([
		[fixture("html", "parse-html-parse-error-reports-the-tree-s-errors-in-col-caption"), "caption", ["unexpected-start-tag", "unexpected-end-tag"]],
		[fixture("html", "parse-html-parse-error-reports-the-tree-s-errors-in-frameset-x"), "frameset", ["unexpected-frameset-in-frameset-innerhtml", "unexpected-char-in-frameset"]],
		[fixture("html", "parse-html-parse-error-reports-the-tree-s-errors-in-body-body-html"), "html", ["unexpected-end-tag-after-body-innerhtml"]],
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
			.process(fixture("html", "parse-html-source-processor-fires-enter-exit-visitors-in-source-order"));
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
			.process(fixture("html", "parse-html-source-processor-visits-the-document-root-with-a-null-parent"));
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
			.process(fixture("html", "parse-html-source-processor-fires-comment-doctype-visitors"));
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
			.process(fixture("html", "parse-html-source-processor-path-skip-children-stops-descent-into-a-node"));
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
			.process(fixture("html", "parse-html-source-processor-walks-template-content-as-a-document-fragment"));
		expect(log).toEqual(["html", "head", "template", "fragment", "p", "body"]);
	});

	it("use() chains and accumulates visitors per type", () => {
		let a = 0;
		let b = 0;
		const sp = new SourceProcessor()
			.use({ [NodeType.Element]: () => a++ })
			.use({ [NodeType.Element]: () => b++ });
		expect(sp).toBeInstanceOf(SourceProcessor);
		sp.process(fixture("html", "parse-html-source-processor-visits-the-document-root-with-a-null-parent"));
		expect(a).toBe(b);
		expect(a).toBeGreaterThan(0);
	});
});

// The `skip` options only reduce output: tree construction and quirks detection
// still run identically, so the element tree — tags, nesting, offsets and
// attributes — is the same under any combination as under none.
describe("parseHtml — skip options preserve element structure", () => {
	// A spread of construction edge cases: foster parenting, adoption agency,
	// select/table/ruby scoping, foreign content, raw-text elements, quirks.
	const cases = [
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-2"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-3"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-4"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-5"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-6"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-7"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-8"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-9"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-10"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-11"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-12"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-13"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-14"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-15"),
		// Foreign-content CDATA becomes character data (dropped as prose).
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-16"),
		// No doctype → quirks mode; skip.doctype must not change that.
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-17"),
		// Entities/whitespace in prose text (whitespace routing in head/table).
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-18"),
		// Escapable raw-text bodies + a title in head.
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-19"),
		// Button scope + implied end tags.
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-20"),
		// Comment-only document.
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-21"),
		// `skip.text` whitespace fast-path fallbacks: whitespace-producing
		// character references, CR normalization, and NUL must still route text
		// exactly (these decide foster-parenting / framesetOk).
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-22"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-23"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-24"),
		fixture("html", "parse-html-skip-options-preserve-element-structure-keeps-the-element-tree-stable-25")
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
		const src = fixture("html", "parse-html-skip-options-preserve-element-structure-skip-text-drops-every-text");
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
		const src = fixture("html", "parse-html-skip-options-preserve-element-structure-skip-comments-drops-comment");
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
			fixture("html", "parse-html-skip-options-preserve-element-structure-skip-text-records-every-raw");
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
		const src = fixture("html", "parse-html-skip-options-preserve-element-structure-skip-text-records-content-end");
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
			[fixture("html", "parse-html-skip-options-preserve-element-structure-skip-options-preserve-element"), "table"],
			[fixture("html", "parse-html-skip-options-preserve-element-structure-skip-options-preserve-element-2"), "ul"],
			[fixture("html", "parse-html-skip-options-preserve-element-structure-skip-options-preserve-element-3"), "div"],
			[fixture("html", "parse-html-skip-options-preserve-element-structure-skip-options-preserve-element-4"), "svg"]
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
		const small = body(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-re-shrinks-the-columns"));
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
		expect(body(fixture("html", "source-processor-the-streamed-walk-ends-a-walk-a-visitor-stopped-and-fires-its"))[0]).toEqual(
			expect.objectContaining({ tagName: "b" })
		);
	});

	it("merges texts left adjacent by a skipped comment", () => {
		const nodes = bodyOf(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-merges-texts-left-adjacent"), { comments: true });
		expect(nodes).toEqual([
			expect.objectContaining({ type: NodeType.Text, data: "ab" })
		]);
	});

	it("adjusts SVG and MathML attribute names", () => {
		const svg = find(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-adjusts-svg-and-math-ml"), "svg");
		const byName = new Map(svg.attributes.map((a) => [a.name, a]));
		expect(byName.has("viewBox")).toBe(true);
		const xlink = /** @type {HtmlAttribute} */ (byName.get("xlink:href"));
		expect(xlink.serializedName).toBe("xlink href");
		const math = find(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-adjusts-svg-and-math-ml-2"), "math");
		expect(math.attributes[0].name).toBe("definitionURL");
	});

	it("parses text in a foreign fragment context", () => {
		const doc = parseHtmlRefs(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-parses-text-in-a-foreign"), 0, { fragmentContext: "svg" });
		const root = A.child(0, doc);
		expect(A.type(A.child(0, root))).toBe(NodeType.Text);
	});

	it("runs the adoption agency in a table-row fragment context", () => {
		const doc = parseHtml(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-runs-the-adoption-agency-in"), "tr");
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
		const opening = fixture("html", "source-processor-remove-implied-tags-materializes-an-implied-tag-whose-content");
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
		const streamed = minify(`${opening}${fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints").repeat(BIG)}`);
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
				`<!DOCTYPE html><html><body>${fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints").repeat(
					BIG
				)}<p id="tail">${fixture("html", "tokenize-parse-error-callback-does-not-report-missing-semicolon-for-a-named").repeat(2000)}</p></body></html>`
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
			`<!DOCTYPE html><html><body><form>${fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints").repeat(
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
			`<!DOCTYPE html><html><body>${fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints").repeat(
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
		const log = walk(bigBody(fixture("html", "source-processor-the-per-transform-switches-keeps-a-parser-inserted-table-group-5"), BIG_ROWS));
		expect(log.filter((l) => l === "+table")).toHaveLength(BIG_ROWS);
		expect(log.filter((l) => l === "+td")).toHaveLength(BIG_ROWS);
	});

	it.each([
		[
			"below the threshold",
			fixture("html", "source-processor-streamed-walk-recycling-honours-skip-children-on-the-root-below")
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
			fixture("html", "source-processor-render-embedded-source-keeps-the-body-when-the-renderer-throws"),
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
				.process(fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints"))
		).toThrow(/already running/);
	});
});

describe("parseHtml — path accessor completeness", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	it("exposes a doctype's identifier ranges through the accessors", () => {
		const source = fixture("html", "parse-html-path-accessor-completeness-exposes-a-doctype-s-identifier-ranges");
		const doctype = A.child(0, parseHtmlRefs(source, 0));
		expect(A.type(doctype)).toBe(NodeType.Doctype);
		expect(A.rangeOf(Part.publicId, doctype)).toEqual([23, 24]);
		expect(A.rangeOf(Part.systemId, doctype)).toEqual([27, 28]);
		expect(A.rangeOf(Part.content, doctype)).toBeNull();
	});

	it("exposes node, parent links and attribute spans on the path", () => {
		const SRC = fixture("html", "parse-html-path-accessor-completeness-exposes-node-parent-links-and-attribute");
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
		const doc = parseHtmlRefs(fixture("html", "parse-html-path-accessor-completeness-reads-each-part-of-an-element-with-an-end"));
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
			[fixture("html", "parse-html-path-accessor-completeness-names-a-processing-instruction-by-its"), "x", false],
			// HTML reads this as a bogus comment, XML as a target-less instruction
			[fixture("html", "parse-html-path-accessor-completeness-names-a-processing-instruction-by-its-2"), "", true]
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
		const source = fixture("html", "parse-html-path-accessor-completeness-clears-the-foster-region-marks-a-print");
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
		processor.process(fixture("html", "parse-html-path-accessor-completeness-path-stop-ends-the-walk-after-the-current"));
		expect(log).toEqual(["html", "head", "body", "a", "b"]);
		// the next run starts with every visitor in place again
		log.length = 0;
		processor.process(fixture("html", "parse-html-path-accessor-completeness-path-stop-ends-the-walk-after-the-current-2"));
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
			.process(fixture("html", "parse-html-path-accessor-completeness-path-stop-ends-the-walk-after-the-current-3"));
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
			.process(fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints"));
		expect(log).toEqual(["enter", "exit"]);
	});
});

describe("parseSrcset", () => {
	it("should return a single candidate with byte offsets", () => {
		expect(parseSrcset(fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5]]);
	});

	it("should accept width, density and height descriptors", () => {
		expect(parseSrcset(fixture("html", "parse-srcset-should-accept-width-density-and-height-descriptors"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5]]);
		expect(parseSrcset(fixture("html", "parse-srcset-should-accept-width-density-and-height-descriptors-2"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5]]);
		expect(parseSrcset(fixture("html", "parse-srcset-should-accept-width-density-and-height-descriptors-3"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5]]);
	});

	it("should parse several comma-separated candidates", () => {
		expect(parseSrcset(fixture("html", "parse-srcset-should-parse-several-comma-separated-candidates"))).toEqual([
			[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5],
			["b.png", 12, 17]
		]);
	});

	it("should accept a url that ends in a trailing comma", () => {
		expect(parseSrcset(fixture("html", "parse-srcset-should-accept-a-url-that-ends-in-a-trailing-comma"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5]]);
	});

	it("should throw on a zero width descriptor", () => {
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-a-zero-width-descriptor"))).toThrow(/Invalid srcset descriptor/);
	});

	it("should throw on a negative density descriptor", () => {
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-a-negative-density-descriptor"))).toThrow(/Invalid srcset descriptor/);
	});

	it("should throw on a descriptor after a zero density descriptor", () => {
		expect(parseSrcset(fixture("html", "parse-srcset-should-throw-on-a-descriptor-after-a-zero-density-descriptor"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5]]);
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-a-descriptor-after-a-zero-density-descriptor-2"))).toThrow(
			/Invalid srcset descriptor/
		);
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-a-descriptor-after-a-zero-density-descriptor-3"))).toThrow(
			/Invalid srcset descriptor/
		);
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-a-descriptor-after-a-zero-density-descriptor-4"))).toThrow(
			/Invalid srcset descriptor/
		);
	});

	it("should throw on conflicting descriptors", () => {
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-conflicting-descriptors"))).toThrow(
			/Invalid srcset descriptor/
		);
	});

	it("should throw on an unrecognized descriptor", () => {
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-an-unrecognized-descriptor"))).toThrow(/Invalid srcset descriptor/);
	});

	it("should throw on duplicate or conflicting typed descriptors", () => {
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-duplicate-or-conflicting-typed-descriptors"))).toThrow(/Invalid srcset/);
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-duplicate-or-conflicting-typed-descriptors-2"))).toThrow(/Invalid srcset/);
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-on-duplicate-or-conflicting-typed-descriptors-3"))).toThrow(/Invalid srcset/);
	});

	it("should traverse the in-parens descriptor state", () => {
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-traverse-the-in-parens-descriptor-state"))).toThrow(
			/Invalid srcset descriptor/
		);
		// a parenthesized descriptor that runs to EOF
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-traverse-the-in-parens-descriptor-state-2"))).toThrow(/Invalid srcset/);
	});

	it("should end an empty descriptor list at a comma after the url", () => {
		expect(parseSrcset(fixture("html", "parse-srcset-should-end-an-empty-descriptor-list-at-a-comma-after-the-url"))).toEqual([
			[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5],
			["b.png", 7, 12]
		]);
	});

	it("should keep a parenthesized run inside a started descriptor", () => {
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-keep-a-parenthesized-run-inside-a-started-descriptor"))).toThrow(
			"Invalid srcset descriptor found in 'a.png 1x(2)' at '1x(2)'"
		);
	});

	it("should stay after a descriptor across a whitespace run", () => {
		expect(parseSrcset(fixture("html", "parse-srcset-should-stay-after-a-descriptor-across-a-whitespace-run"))).toEqual([
			[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5],
			["b.png", 12, 17]
		]);
	});

	it("should handle whitespace between a descriptor and EOF", () => {
		expect(parseSrcset(fixture("html", "parse-srcset-should-handle-whitespace-between-a-descriptor-and-eof"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 5]]);
		// a second descriptor after the inter-descriptor whitespace
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-handle-whitespace-between-a-descriptor-and-eof-2"))).toThrow(/Invalid srcset/);
	});

	it("should throw when there are no image candidate strings", () => {
		expect(() => parseSrcset(fixture("html", "parse-srcset-should-throw-when-there-are-no-image-candidate-strings"))).toThrow(
			/Must contain one or more image candidate strings/
		);
	});
});

describe("parseSrc", () => {
	const NBSP = String.fromCharCode(0xa0);
	const DEL = String.fromCharCode(0x7f);

	it("should trim ASCII whitespace and keep offsets", () => {
		expect(parseSrc(fixture("html", "parse-src-should-trim-ascii-whitespace-and-keep-offsets"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 2, 7]]);
	});

	it("should trim a surrounding U+00A0 no-break space", () => {
		expect(parseSrc(`${NBSP}a.png${NBSP}`)).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 1, 6]]);
	});

	it("should strip ignorable control characters from the value", () => {
		expect(parseSrc(`a${DEL}.png`)).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 0, 6]]);
	});

	it("should throw on empty and whitespace-only input", () => {
		expect(() => parseSrc("")).toThrow(/Must be non-empty/);
		expect(() => parseSrc(fixture("html", "parse-srcset-should-throw-when-there-are-no-image-candidate-strings"))).toThrow(/Must be non-empty/);
	});

	it("should throw when only ignorable characters remain", () => {
		expect(() => parseSrc(DEL)).toThrow(/Must be non-empty/);
	});
});

describe("parseMsapplicationTask", () => {
	it("should extract the icon-uri value with offsets", () => {
		expect(
			parseMsapplicationTask(fixture("html", "parse-msapplication-task-should-extract-the-icon-uri-value-with-offsets"))
		).toEqual([["icon.png", 36, 44]]);
	});

	it("should return nothing when there is no icon-uri", () => {
		expect(parseMsapplicationTask(fixture("html", "parse-msapplication-task-should-return-nothing-when-there-is-no-icon-uri"))).toEqual([]);
	});

	it("should return nothing for an empty icon-uri value", () => {
		expect(parseMsapplicationTask(fixture("html", "parse-msapplication-task-should-return-nothing-for-an-empty-icon-uri-value"))).toEqual([]);
	});

	it("should skip a part without a key", () => {
		expect(parseMsapplicationTask(fixture("html", "parse-msapplication-task-should-skip-a-part-without-a-key"))).toEqual([
			[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 11, 16]
		]);
	});

	it("should trim whitespace around the icon-uri value", () => {
		expect(parseMsapplicationTask(fixture("html", "parse-msapplication-task-should-trim-whitespace-around-the-icon-uri-value"))).toEqual([
			["icon.png", 17, 25]
		]);
	});
});

describe("parseCssUrls", () => {
	it("should extract an unquoted url() reference from a presentation attribute", () => {
		expect(parseCssUrls(fixture("html", "parse-css-urls-should-extract-an-unquoted-url-reference-from-a-presentation"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 9, 14]]);
	});

	it("should extract a quoted url() reference", () => {
		expect(parseCssUrls(fixture("html", "parse-css-urls-should-extract-a-quoted-url-reference"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 10, 15]]);
		expect(parseCssUrls(fixture("html", "parse-css-urls-should-extract-a-quoted-url-reference-2"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 10, 15]]);
	});

	it("should return nothing when the value carries no url()", () => {
		expect(parseCssUrls(fixture("html", "parse-css-urls-should-return-nothing-when-the-value-carries-no-url"))).toEqual([]);
	});

	it("should skip a url() whose string is cut by a newline", () => {
		// the bad string ends at the newline; scanning goes on after it
		expect(parseCssUrls(fixture("html", "parse-css-urls-should-skip-a-url-whose-string-is-cut-by-a-newline"))).toEqual([
			["b.png", 21, 26]
		]);
	});

	it("should take an unterminated url() string up to EOF", () => {
		expect(parseCssUrls(fixture("html", "parse-css-urls-should-take-an-unterminated-url-string-up-to-eof"))).toEqual([[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 10, 15]]);
	});

	it("should skip an empty url(), quoted or not", () => {
		expect(parseCssUrls(fixture("html", "parse-css-urls-should-skip-an-empty-url-quoted-or-not"))).toEqual([]);
		expect(parseCssUrls(fixture("html", "parse-css-urls-should-skip-an-empty-url-quoted-or-not-2"))).toEqual([]);
		expect(parseCssUrls(fixture("html", "parse-css-urls-should-skip-an-empty-url-quoted-or-not-3"))).toEqual([
			[fixture("html", "parse-srcset-should-return-a-single-candidate-with-byte-offsets"), 19, 24]
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
		expect(reconstructed(fixture("html", "parse-html-quirks-and-foreign-content-arcs-applies-the-noah-s-ark-clause-only-to"))).toBe(3);
		// A differing attribute count, and a differing value, both break the match.
		expect(reconstructed(fixture("html", "parse-html-quirks-and-foreign-content-arcs-applies-the-noah-s-ark-clause-only-to-2"))).toBe(
			4
		);
		expect(reconstructed(fixture("html", "parse-html-quirks-and-foreign-content-arcs-applies-the-noah-s-ark-clause-only-to-3"))).toBe(4);
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
	["closes a foreign element by its own end tag", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-g-path-x"), "svg path"],
	[
		"parses a template fragment with a form in it",
		fixture("html", "parse-html-insertion-modes-parses-a-template-fragment-with-a-form-in-it"),
		"template"
	],
	[
		"keeps an end tag inside a script fragment",
		fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-inside"),
		"script"
	],
	[
		"breaks out of MathML text integration points",
		fixture("html", "parse-html-insertion-modes-breaks-out-of-math-ml-text-integration-points"),
		"math ms"
	],
	["reads a textarea fragment as text", fixture("html", "parse-html-insertion-modes-reads-a-textarea-fragment-as-text"), "textarea"],
	["ends a caption fragment", fixture("html", "parse-html-insertion-modes-ends-a-caption-fragment"), "caption"],
	["ends a frameset fragment", fixture("html", "parse-html-insertion-modes-ends-a-frameset-fragment"), "frameset"],
	["parses a body start tag in an SVG desc fragment", fixture("html", "parse-html-insertion-modes-parses-a-body-start-tag-in-an-svg-desc-fragment"), "svg desc"],
	[
		"ignores a plaintext end tag in a plaintext fragment",
		fixture("html", "parse-html-insertion-modes-ignores-a-plaintext-end-tag-in-a-plaintext-fragment"),
		"plaintext"
	],
	["drops an input from a select fragment", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-input"), "select"],

	// A stray DOCTYPE, a repeated `<html>` or a repeated `<head>`/`<body>` has
	// its own arc in every insertion mode, and each one is a separate ignore.
	["ends the body from an html fragment", fixture("html", "parse-html-parse-error-reports-the-tree-s-errors-in-body-body-html"), "html"],

	// Table-related modes reached through a template or a fragment.
	[
		"ignores table-section end tags in a row fragment",
		fixture("html", "parse-html-insertion-modes-ignores-table-section-end-tags-in-a-row-fragment"),
		"tr"
	],
	["opens an implied tbody in a table fragment", fixture("html", "parse-html-insertion-modes-opens-an-implied-tbody-in-a-table-fragment"), "table"],

	// Foreign content and scope boundaries.
	["ignores a foreign end tag with no match", fixture("html", "parse-html-insertion-modes-ignores-a-foreign-end-tag-with-no-match"), "svg path"],
	[
		"ignores a frameset start tag in an SVG desc fragment",
		fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-frameset-x"),
		"svg desc"
	],
	[
		"ignores a tbody start tag inside MathML in a thead fragment",
		fixture("html", "parse-html-insertion-modes-ignores-a-tbody-start-tag-inside-math-ml-in-a-thead"),
		"thead"
	],
];

describe("parseHtml — insertion modes", () => {
	for (const [name, source, fragmentContext] of CASES) {
		it(name, () => {
			expect(treeOf(source, fragmentContext)).toMatchSnapshot();
		});
	}
});

describe("parseHtml — arcs the conformance corpus leaves out", () => {
	it("inserts the whitespace among characters a column group without a colgroup ignores", () => {
		// Each character is its own token, so only the non-whitespace ones go.
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-inserts-the-whitespace-among"))).toBe(
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
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-inserts-the-whitespace-among-2"), "colgroup")).toBe('| " \t"');
	});

	it("leaves the tokenizer in the data state after a tag the column group ignored", () => {
		// The ignored start tag never runs the RCDATA / RAWTEXT switch, so what
		// follows is markup: a comment, and an element the mode ignores too.
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-leaves-the-tokenizer-in-the"), "colgroup")).toBe(
			["| <!-- c -->", '| "  "'].join("\n")
		);
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-leaves-the-tokenizer-in-the-2"))).toBe(
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
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-keeps-character-references"), "tbody")).toBe(
			['| "x"', "| <plaintext>", '|   "&amp;"'].join("\n")
		);
	});

	it("reads the whole input as the text of a raw-text fragment context", () => {
		// No start tag opened the context, so no end tag is appropriate to it.
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-reads-the-whole-input-as-the"), "textarea")).toBe(
			'| "a�</textarea>�<b>&"'
		);
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-reads-the-whole-input-as-the-2"), "style")).toBe(
			'| "a</style><b>&amp;\n"'
		);
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-reads-the-whole-input-as-the-3"), "script")).toBe('| "</script><!--<b>"');
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-reads-the-whole-input-as-the-4"), "title")).toBe('| "</title"');
		const doc = parseHtmlRefs(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-reads-the-whole-input-as-the-5"), 0, {
			fragmentContext: "noscript",
			scripting: true
		});
		expect(serializeHtmlTree(A.child(0, doc))).toBe('| "</noscript><b>x"');
		// a foreign context's title is markup, and so is what follows
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-reads-the-whole-input-as-the-6"), "svg title")).toBe("| <b>");
	});

	it("clears the whole name memo once a document filled every slot", () => {
		// 512 unknown names, one per memo slot (`z` repeated 1…512 times).
		let src = "";
		for (let n = 1; n <= 512; n++) src += `<${"z".repeat(n)}>`;
		expect(find(src, "z".repeat(512)).tagName).toBe("z".repeat(512));
		// the next parse reads every name afresh
		expect(body(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-clears-the-whole-name-memo")).map((n) => n.tagName)).toEqual(["zz"]);
		expect(find(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-clears-the-whole-name-memo-2"), "zzz").children[0]).toEqual(
			expect.objectContaining({ tagName: "zzz" })
		);
	});

	it("keeps every form in template contents, a template fragment's too", () => {
		// The form element pointer is not used while parsing template contents
		// (§13.2.4.4), which a template fragment context is as well.
		expect(treeOf(fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-form-form"), "template")).toBe(
			["| <form>", "|   <form>"].join("\n")
		);
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-keeps-every-form-in-template"), "template")).toBe(
			["| <table>", "|   <form>", "|   <form>"].join("\n")
		);
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-keeps-every-form-in-template-2"))).toBe(
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
		const doc = parseHtmlRefs(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-reads-a-noscript-in-the-body"), 0, {
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
		expect(decodeEntities(fixture("html", "tokenize-parse-error-callback-does-not-report-missing-semicolon-for-a-named"), true, true)).toEqual({
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
