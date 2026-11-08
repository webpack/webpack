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
