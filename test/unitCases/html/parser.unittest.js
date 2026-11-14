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
	Namespace,
	Part,
	NodeType,
	decodeEntities,
	parseHtml: parseHtmlRefs
} = require("../../../lib/html/syntax-parser");
const {
	body,
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



	it("should export namespace constants", () => {
		expect(Namespace.HTML).toBe(0);
		expect(Namespace.MathML).toBe(1);
		expect(Namespace.SVG).toBe(2);
	});







});


describe("parseHtml — SourceProcessor", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
const { NodeType } = require("../../../lib/html/syntax-parser");






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

	it("grows the node and attribute columns past their initial capacity", () => {
		const nodes = body(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-grows-the-node-and-attribute"));
		expect(nodes).toHaveLength(5000);
		expect(nodes[4999].attributes[0].value).toBe("4999");
	});

	it("re-shrinks the columns after a pathologically large document", () => {
		// > 64 Ki nodes and attributes grow the columns past the shrink
		// threshold; the release after the parse re-shrinks them and the next
		// parse must work from the re-grown baseline
		const nodes = body(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-re-shrinks-the-columns-after"));
		expect(nodes).toHaveLength(70000);
		expect(nodes[69999].attributes[0].value).toBe("69999");
		const small = body(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-re-shrinks-the-columns"));
		expect(small).toHaveLength(1);
		expect(small[0].attributes[0].value).toBe("c");
	});

	it("handles a large structurally sparse document", () => {
		// Exercise both byte-length estimate caps without needing enough nodes or
		// attributes to fill the speculative columns.
		const nodes = body(fixture("html", "parse-html-tree-construction-edge-cases-so-a-columns-handles-a-large-structurally"));
		expect(nodes).toHaveLength(1);
		expect(nodes[0]).toEqual(
			expect.objectContaining({ tagName: "p", children: [expect.any(Object)] })
		);
		expect(body(fixture("html", "source-processor-the-streamed-walk-ends-a-walk-a-visitor-stopped-and-fires-its"))[0]).toEqual(
			expect.objectContaining({ tagName: "b" })
		);
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


});

describe("SourceProcessor — streamed walk recycling", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");






	it("materializes a streamed implied tag as the walked one does", () => {
		// The streamed path decides this where the node is known, the walked one on
		// the first piece emitted, so the two have to agree on the same document.
		/**
		 * @param {string} src source
		 * @returns {string} the minified document
		 */
		const minify = (src) =>
			new SourceProcessor().process(src, {
				mode: "minify",
				removeImpliedTags: true
			}).code;
		const walked = minify(fixture("html", "source-processor-streamed-walk-recycling-materializes-a-streamed-implied-tag-as"));
		const streamed = minify(fixture("html", "source-processor-streamed-walk-recycling-materializes-a-streamed-implied-tag-as-2"));
		expect(streamed.slice(0, walked.length)).toBe(walked);
	});







});

describe("SourceProcessor — streamed walk offsets", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");



	it("runs a walk a visitor starts on a tree of its own, and the outer walk goes on", () => {
		/** @type {string[]} */
		const outer = [];
		/** @type {string[]} */
		const inner = [];
		/** @type {string[]} */
		const innermost = [];
		/**
		 * @param {string[]} names where the element names go
		 * @param {(() => void)=} nested what to run on the first `li`
		 * @returns {import("../../../lib/html/syntax-printer").VisitorMap} visitors
		 */
		const collect = (names, nested) => ({
			[NodeType.Element]: (path) => {
				names.push(path.name());
				if (nested !== undefined && path.name() === "li" && names.length === 5) nested();
			}
		});
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Element]: {
						enter: (path) => {
							outer.push(path.name());
							if (path.name() !== "span") return;
							new SourceProcessor()
								.use(
									collect(inner, () => {
										new SourceProcessor().use(collect(innermost)).process(fixture("html", "source-processor-streamed-walk-offsets-refuses-a-nested-parse-rather-than-taking"));
									})
								)
								.process(fixture("html", "source-processor-a-run-inside-a-run-inner-list"));
							// The outer tree is the one read again once the nested walk is done.
							outer.push(`${path.source()} in ${A.name(/** @type {number} */ (path.parent))}`);
						},
						exit: (path) => {
							if (path.name() === "em") outer.push(`/${path.source()}`);
						}
					}
				})
			)
			.process(fixture("html", "source-processor-a-run-inside-a-run-outer-walk"));
		expect(innermost).toEqual(["html", "head", "body", "b"]);
		expect(inner).toEqual(["html", "head", "body", "ul", "li", "li"]);
		expect(outer).toEqual([
			"html",
			"head",
			"body",
			"div",
			"span",
			"<span>x</span> in div",
			"em",
			"/<em>y</em>",
			"p"
		]);
	});

	it("runs every visitor of a nested run on the processor whose outer run stopped", () => {
		/** @type {string[]} */
		const seen = [];
		/** @type {string[]} */
		let inner = [];
		const processor = new SourceProcessor().use(
			/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
				[NodeType.Element]: (path) => {
					seen.push(path.name());
					if (path.name() !== "p") return;
					path.stop();
					const before = seen.length;
					processor.process(fixture("html", "source-processor-a-run-inside-a-run-same-processor-inner"));
					inner = seen.slice(before);
				}
			})
		);
		processor.process(fixture("html", "source-processor-a-run-inside-a-run-same-processor-stop-outer"));
		expect(inner).toEqual(["html", "head", "body", "ul", "li"]);
		expect(seen).toEqual(["html", "head", "body", "p", ...inner]);
	});

	it("runs each visitor once in a run nested two deep on the processor whose outermost run stopped", () => {
		/** @type {string[]} */
		const seen = [];
		let depth = 0;
		const processor = new SourceProcessor().use(
			/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
				[NodeType.Element]: (path) => {
					seen.push(`${depth}:${path.name()}`);
					if (path.name() !== "p" || depth === 2) return;
					if (depth === 0) path.stop();
					depth++;
					processor.process(
						fixture(
							"html",
							depth === 1
								? "source-processor-a-run-inside-a-run-same-processor-middle"
								: "source-processor-a-run-inside-a-run-same-processor-inner"
						)
					);
					depth--;
				}
			})
		);
		processor.process(fixture("html", "source-processor-a-run-inside-a-run-same-processor-stop-outer"));
		expect(seen).toEqual([
			"0:html",
			"0:head",
			"0:body",
			"0:p",
			"1:html",
			"1:head",
			"1:body",
			"1:p",
			"2:html",
			"2:head",
			"2:body",
			"2:ul",
			"2:li",
			"1:i"
		]);
	});

	it("runs a walk the document's enter starts before the outer tokenizer does", () => {
		/** @type {string[]} */
		const outer = [];
		/** @type {string[]} */
		const inner = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Document]: () => {
						new SourceProcessor()
							.use(
								/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
									[NodeType.Element]: (path) => {
										inner.push(path.name());
									}
								})
							)
							.process(fixture("html", "source-processor-a-run-inside-a-run-document-enter-inner"));
					},
					[NodeType.Element]: (path) => {
						outer.push(`${path.name()}:${path.source()}`);
					}
				})
			)
			.process(fixture("html", "source-processor-a-run-inside-a-run-document-enter-outer"));
		expect(inner).toEqual(["html", "head", "body", "table", "tbody", "tr", "td"]);
		expect(outer).toEqual(["html:", "head:", "body:", "p:<p>outer</p>"]);
	});

	it("tokenizes the outer document with its own context after the document's enter nests a fragment run", () => {
		/** @type {string[]} */
		const outer = [];
		/** @type {string[]} */
		const inner = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
					[NodeType.Document]: () => {
						new SourceProcessor()
							.use(
								/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
									[NodeType.Element]: (path) => {
										inner.push(path.name());
									}
								})
							)
							.process(fixture("html", "source-processor-a-run-inside-a-run-textarea-fragment-inner"), {
								fragmentContext: "textarea"
							});
					},
					[NodeType.Element]: (path) => {
						outer.push(path.name());
					}
				})
			)
			.process(fixture("html", "source-processor-a-run-inside-a-run-document-enter-outer"));
		expect(inner).toEqual(["html"]);
		expect(outer).toEqual(["html", "head", "body", "p"]);
	});

	it("runs a walk and a print a streamed walk's visitor starts mid-parse", () => {
		const count = 30000;
		/**
		 * @param {boolean} nest whether the 25000th `p` starts runs of its own
		 * @returns {{ seen: string[], inner: string[] }} what the outer and nested runs saw
		 */
		const run = (nest) => {
			/** @type {string[]} */
			const seen = [];
			/** @type {string[]} */
			const inner = [];
			let paragraphs = 0;
			new SourceProcessor()
				.use(
					/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
						[NodeType.Element]: {
							exit: (path) => {
								if (path.name() !== "p") {
									seen.push(`${path.name()}:${path.end() - path.start()}`);
									return;
								}
								if (path.source() !== "<p>a</p>") seen.push(path.source());
								if (++paragraphs !== 25000 || !nest) return;
								new SourceProcessor()
									.use(
										/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
											[NodeType.Element]: (nested) => {
												inner.push(nested.name());
											}
										})
									)
									.process(fixture("html", "source-processor-a-run-inside-a-run-streamed-inner"));
								inner.push(
									new SourceProcessor().process(fixture("html", "source-processor-a-run-inside-a-run-streamed-minify"), {
										mode: "minify",
										collapseWhitespace: true
									}).code
								);
							}
						}
					})
				)
				.process(fixture("html", "source-processor-a-run-inside-a-run-streamed-outer"));
			seen.push(String(paragraphs));
			return { seen, inner };
		};
		const alone = run(false);
		const nested = run(true);
		expect(nested.inner).toEqual(["html", "head", "body", "ul", "li", "<p> y "]);
		expect(nested.seen).toEqual(alone.seen);
		expect(alone.seen).toEqual([
			"head:0",
			"div:" + (count * 8 + 11),
			"em:12",
			"body:0",
			"html:0",
			String(count)
		]);
	});

	it("refuses a parseHtml a visitor calls during a run, and the run goes on", () => {
		/**
		 * @param {boolean} attempt whether the `p` visitor calls `parseHtml`
		 * @returns {{ seen: string[], errors: string[] }} what the walk saw and threw
		 */
		const run = (attempt) => {
			/** @type {string[]} */
			const seen = [];
			/** @type {string[]} */
			const errors = [];
			new SourceProcessor()
				.use(
					/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
						[NodeType.Element]: {
							enter: (path) => {
								seen.push(path.name());
								if (!attempt || path.name() !== "p") return;
								try {
									parseHtmlRefs(fixture("html", "source-processor-a-run-inside-a-run-direct-parse-inner"));
								} catch (err) {
									errors.push(/** @type {Error} */ (err).message);
								}
							},
							exit: (path) => {
								seen.push(`/${path.source()}`);
							}
						}
					})
				)
				.process(fixture("html", "source-processor-a-run-inside-a-run-direct-parse-outer"));
			return { seen, errors };
		};
		const alone = run(false);
		const tried = run(true);
		expect(tried.errors).toEqual([
			"html syntax: parseHtml was called during an HTML process run; nest the work with a SourceProcessor process instead"
		]);
		expect(tried.seen).toEqual(alone.seen);
		// Outside a run it parses as ever.
		const document = parseHtmlRefs(fixture("html", "source-processor-a-run-inside-a-run-direct-parse-inner"));
		expect(A.name(A.child(0, A.child(1, A.child(0, document))))).toBe("i");
	});
});

describe("parseHtml — path accessor completeness", () => {

	it("exposes a doctype's identifier ranges through the accessors", () => {
		const source = fixture("html", "parse-html-path-accessor-completeness-exposes-a-doctype-s-identifier-ranges");
		const doctype = A.child(0, parseHtmlRefs(source, 0));
		expect(A.type(doctype)).toBe(NodeType.Doctype);
		expect(A.rangeOf(Part.publicId, doctype)).toEqual([23, 24]);
		expect(A.rangeOf(Part.systemId, doctype)).toEqual([27, 28]);
		expect(A.rangeOf(Part.content, doctype)).toBeNull();
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


	it("grows the node columns past the initial estimate", () => {
		// `len / 12` under-estimates a document of nothing but short start tags,
		// so the doubling growth path has to carry the rest. Walk the refs
		// directly — `materialize` recurses, and this tree is 5000 deep.
		let node = parseHtmlRefs(
			fixture(
				"html",
				"parse-html-quirks-and-foreign-content-arcs-grows-the-node-columns-past-the-initial"
			)
		);
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


describe("parseHtml — arcs the conformance corpus leaves out", () => {


	it("keeps character references literal in a plaintext opened in a table mode", () => {
		// The PLAINTEXT state outlives the table, cell or caption mode it opened in.
		for (const name of ["2", "3", "4"]) {
			const plaintext = find(
				fixture(
					"html",
					`parse-html-arcs-the-conformance-corpus-leaves-out-keeps-character-references-${name}`
				),
				"plaintext"
			);
			expect(plaintext.children).toEqual([
				expect.objectContaining({ type: NodeType.Text, data: "a&amp;b<p>" })
			]);
		}
		expect(treeOf(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-keeps-character-references"), "tbody")).toBe(
			['| "x"', "| <plaintext>", '|   "&amp;"'].join("\n")
		);
	});


	it("clears the whole name memo once a document filled every slot", () => {
		// 512 unknown names, one per memo slot (`z` repeated 1…512 times).
		expect(find(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-clears-the-whole-name-memo-3"), "z".repeat(512)).tagName).toBe("z".repeat(512));
		// the next parse reads every name afresh
		expect(body(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-clears-the-whole-name-memo")).map((n) => n.tagName)).toEqual(["zz"]);
		expect(find(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-clears-the-whole-name-memo-2"), "zzz").children[0]).toEqual(
			expect.objectContaining({ tagName: "zzz" })
		);
	});



	it("maps decoded text back to the raw offsets", () => {
		expect(decodeEntities(fixture("html", "tokenize-parse-error-callback-does-not-report-missing-semicolon-for-a-named"), true, true)).toEqual({
			text: "a&b",
			map: [0, 1, 6, 7]
		});
		expect(decodeEntities(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-maps-decoded-text-back-to-the"), false, true)).toEqual({
			text: "x<>",
			map: [0, 1, 5, 9]
		});
		expect(decodeEntities(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-maps-decoded-text-back-to-the-2"), true, true)).toEqual({
			text: "&zz;",
			map: undefined
		});
	});

	it("decodes a repeated named reference and a long one alike", () => {
		expect(decodeEntities(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-decodes-a-repeated-named-refer"))).toBe("&&<&");
		expect(decodeEntities(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-decodes-a-repeated-named-refer-3"))).toBe("\u2233\u2233&\u2233");
		expect(decodeEntities(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-decodes-a-repeated-named-refer-2"))).toBe("&&=&");
	});

	it("re-sizes the attribute columns a walk released from the next estimate", () => {
		const { SourceProcessor } = require("../../../lib/html/syntax");
		// Past the shrink threshold, the walk's release drops the columns, so the
		// next parse pre-sizes them from its own (small) estimate.
		let elements = 0;
		new SourceProcessor()
			.use({ [NodeType.Element]: () => elements++ })
			.process(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-re-sizes-the-attribute-columns-2"));
		expect(elements).toBe(33003);
		const nodes = body(fixture("html", "parse-html-arcs-the-conformance-corpus-leaves-out-re-sizes-the-attribute-columns"));
		expect(nodes[0].attributes[0].value).toBe("c");
	});
});
