"use strict";

const { fixture } = require("../../helpers/fixture");

// cspell:ignore apos scrip
// cspell:ignore selectedcontent mtext colgroups
// cspell:ignore contenteditable enterkeyhint formenctype formmethod formtarget
// cspell:ignore inputmode writingsuggestions
// cspell:ignore noembed noframes optgroup
// cspell:ignore bgsound doctypehtml iewport abcb axxb

/** @import { HtmlNodeRef, HtmlAttribute } from "../../../lib/html/syntax-parser" */

const { execFileSync } = require("child_process");
const {
	A,
	Field,
	NodeType,
	parseHtml: parseHtmlRefs
} = require("../../../lib/html/syntax-parser");

const {
	builtinEmbeddedRenderer
} = require("../../../lib/html/builtinEmbeddedRenderer");
const { childrenOf } = require("../../helpers/materializeHtmlTree");
const serializeHtmlTree = require("../../helpers/serializeHtmlTree");

describe("builtinEmbeddedRenderer — what it loads", () => {
	// Run in a fresh process, so `require.cache` holds only what this loaded.
	it("loads neither parser until a body needs one", () => {
		const script = `
			const loaded = (file) => require.cache[file] !== undefined;
			const cssParser = ${JSON.stringify(
				require.resolve("../../../lib/css/syntax-parser")
			)};
			const htmlParser = ${JSON.stringify(
				require.resolve("../../../lib/html/syntax-parser")
			)};
			const { builtinEmbeddedRenderer } = require(${JSON.stringify(
				require.resolve("../../../lib/html/builtinEmbeddedRenderer")
			)});
			let picked = 0;
			const render = builtinEmbeddedRenderer({
				svg: true,
				get transforms() {
					picked++;
					return require(cssParser).pickTransforms({ shortenColors: false });
				}
			});
			const states = [];
			const state = (code) =>
				states.push({ code, css: loaded(cssParser), html: loaded(htmlParser), picked });
			state(render('{ "a" : 1 }', { type: "json", hostType: "html" }));
			state(render("a { color : #ff0000 }", { type: "css", hostType: "html" }));
			state(render("color : #ff0000", { type: "css", hostType: "html", as: "block-contents" }));
			process.stdout.write(JSON.stringify(states));
		`;
		expect(
			JSON.parse(
				execFileSync(process.execPath, ["-e", script], { encoding: "utf8" })
			)
		).toEqual([
			{ code: '{"a":1}', css: false, html: false, picked: 0 },
			{ code: "a{color:#ff0000}", css: true, html: false, picked: 1 },
			{ code: "color:#ff0000", css: true, html: false, picked: 1 }
		]);
	});

	it("keeps the CSS parser out of an HTML or XML minify with no CSS", () => {
		const script = `
			const cssParser = ${JSON.stringify(
				require.resolve("../../../lib/css/syntax-parser")
			)};
			const webpack = require(${JSON.stringify(
				require.resolve("../../../lib/index")
			)});
			(async () => {
				const states = [];
				const state = ({ code }) =>
					states.push({ code, css: require.cache[cssParser] !== undefined });
				state(await webpack.html.xmlMinify({ "a.svg": ${JSON.stringify(fixture("xml", "builtin-embedded-renderer-what-it-loads-keeps-the-css-parser-out-of-an-html-or"))} }, undefined, { css: {} }));
				state(await webpack.html.htmlMinify({ "a.html": ${JSON.stringify(fixture("html", "builtin-embedded-renderer-what-it-loads-keeps-the-css-parser-out-of-an-html-or-2"))} }, undefined, { css: {} }));
				state(await webpack.html.htmlMinify({ "a.html": ${JSON.stringify(fixture("html", "builtin-embedded-renderer-what-it-loads-keeps-the-css-parser-out-of-an-html-or-3"))} }, undefined, { css: { shortenColors: false } }));
				process.stdout.write(JSON.stringify(states));
			})();
		`;
		expect(
			JSON.parse(
				execFileSync(process.execPath, ["-e", script], { encoding: "utf8" })
			)
		).toEqual([
			{
				code: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
				css: false
			},
			{ code: "<p>hi", css: false },
			{ code: "<style>a{color:#ff0000}</style>", css: true }
		]);
	});
});

describe("SourceProcessor — one print at a time", () => {
	it("refuses a parse a visitor starts while the print runs", () => {
		const { SourceProcessor } = require("../../../lib/html/syntax");

		expect(() =>
			new SourceProcessor()
				.use(
					/** @type {import("../../../lib/html/syntax-printer").VisitorMap} */ ({
						[NodeType.Element]: () => {
							new SourceProcessor().process(fixture("html", "source-processor-streamed-walk-offsets-refuses-a-nested-parse-rather-than-taking"), { mode: "minify" });
						}
					})
				)
				.process(fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints"), { mode: "minify" })
		).toThrow(/already running/);
	});
});

// The shapes a fold is declined for, which a build does not reach: webpack
// resolves an `@import` away long before the HTML minifier sees the sheet.
describe("SourceProcessor — merging adjacent <style>", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */


















	it("closes a sheet as its end of input closes it", () => {
		const { _sheetClosing } = require("../../../lib/html/syntax-parser");

		for (const [sheet, closing] of /** @type {[string, string | null][]} */ ([
			// §4.3.6: whitespace may open and end a url; a bad one runs to a `)`.
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input"), ")}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-2"), ")}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-3"), "}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-4"), ")}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-5"), "}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-6"), "){}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-7"), ")}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-8"), ")}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-9"), ")}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-10"), ")}"],
			// A quoted url is a function holding a string.
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-11"), '")}'],
			// Part of a longer name, `url(` is a function's name, not a url token.
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-12"), ")}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-13"), ")}"],
			// An escape starts a name, so `@` opens an at-rule; one before a
			// newline is no escape, and `@` a delimiter opening a prelude.
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-14"), ";"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-15"), ";"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-16"), "{}"],
			// Past whitespace and comments, a custom property's open value is kept.
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-17"), null],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-18"), null],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-19"), ")}"],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-20"), "*/}"],
			// A lone backslash escapes whatever would follow it.
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-21"), null],
			[fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-as-its-end-of-input-22"), null]
		])) {
			expect({ sheet, closing: _sheetClosing(sheet) }).toEqual({
				sheet,
				closing
			});
		}
	});

	it("minifies a joined run as one sheet on the asynchronous path too", async () => {
		const builtin = builtinEmbeddedRenderer();
		/** @type {string[]} */
		const offered = [];
		const { code } = await new SourceProcessor().processAsync(
			fixture("html", "source-processor-merging-adjacent-style-minifies-a-joined-run-as-one-sheet-on"),
			{
				mode: "minify",
				mergeStyles: true,
				renderEmbeddedSource: async (source, hole) => {
					offered.push(source);
					return builtin(source, hole);
				}
			}
		);
		expect(code).toBe("<style>a,b{color:red}</style>");
		// Once, joined as written: each ends at a rule, so no answer is waited for.
		expect(offered).toEqual(["a{color:red} b{color:red}"]);
	});
});

// Only what a unit test reaches better than a build does: the shapes a run is
// declined for. A real build is the `minimize-merge-scripts` config case.
describe("SourceProcessor — merging adjacent <script>", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	// `output.html.inline` prints a sentinel and swaps the chunk's code in after
	// the print, so what a guard would read there is not what ends up running.
	it("declines a run whose bodies the print does not itself write", () => {
		const html = fixture("html", "source-processor-merging-adjacent-script-folds-a-run-into-one-element");
		/** @type {import("../../../lib/util/dataURL").DeferredEmbeddedSource[]} */
		const holes = [];
		const printed = new SourceProcessor().process(html, {
			mode: "minify",
			mergeScripts: true,
			deferEmbeddedSource: holes
		}).code;
		expect(holes).toHaveLength(2);
		expect(holes.map((hole) => hole.source)).toEqual(["a()", "b()"]);
		expect(printed.match(/<script\b/g)).toHaveLength(2);
	});
});




describe("SourceProcessor — enumerated attribute values", () => {
	const { ENUMERATED_KEYWORDS } = require("../../../lib/html/data");

	// Written out rather than read off the table: generating the expectation from
	// the thing under test would pass just as happily with an entry deleted.
	const EXPECTED = [
		"* autocapitalize",
		"* contenteditable",
		"* dir",
		"* draggable",
		"* enterkeyhint",
		"* hidden",
		"* inputmode",
		"* popover",
		"* referrerpolicy",
		"* spellcheck",
		"* translate",
		"* writingsuggestions",
		"audio crossorigin",
		"audio preload",
		"button formenctype",
		"button formmethod",
		"button popovertargetaction",
		"button type",
		"dialog closedby",
		"form autocomplete",
		"form enctype",
		"form method",
		"iframe loading",
		"img crossorigin",
		"img decoding",
		"img fetchpriority",
		"img loading",
		"input formenctype",
		"input formmethod",
		"input popovertargetaction",
		"input type",
		"link crossorigin",
		"link fetchpriority",
		"script crossorigin",
		"script fetchpriority",
		"td scope",
		"template shadowrootmode",
		"th scope",
		"track kind",
		"video crossorigin",
		"video preload"
	];

	it("enumerates exactly the attributes it claims to", () => {
		/** @type {string[]} */
		const actual = [];
		for (const element of Object.keys(ENUMERATED_KEYWORDS)) {
			for (const attribute of Object.keys(ENUMERATED_KEYWORDS[element])) {
				actual.push(`${element} ${attribute}`);
			}
		}
		expect(actual.sort()).toEqual(EXPECTED);
	});
});

describe("SourceProcessor — an enumerated value naming no keyword", () => {
	const {
		ENUMERATED_KEYWORDS,
		INVALID_VALUE_DEFAULT_DIFFERS,
		REDUNDANT_DEFAULT_ATTRIBUTES
	} = require("../../../lib/html/data");

	// The pairs both tables name are the only ones the drop can reach: it needs a
	// default to fall to, and a keyword set to know the value names none of them.
	/** @type {[string, string][]} */
	const PAIRS = [];
	for (const element of Object.keys(REDUNDANT_DEFAULT_ATTRIBUTES)) {
		const enumerated = ENUMERATED_KEYWORDS[element];
		if (enumerated === undefined) continue;
		for (const attribute of Object.keys(
			REDUNDANT_DEFAULT_ATTRIBUTES[element]
		)) {
			if (enumerated[attribute] !== undefined) {
				PAIRS.push([element, attribute]);
			}
		}
	}

	it("reaches exactly the pairs both tables name", () => {
		expect(
			PAIRS.map(([element, attribute]) => `${element} ${attribute}`).sort()
		).toEqual([
			"button type",
			"form enctype",
			"form method",
			"input type",
			"track kind"
		]);
	});

	it("names no pair the drop cannot reach", () => {
		const reachable = new Set(
			PAIRS.map(([element, attribute]) => `${element} ${attribute}`)
		);
		for (const entry of INVALID_VALUE_DEFAULT_DIFFERS) {
			expect(reachable.has(entry)).toBe(true);
		}
	});
});

describe("SourceProcessor — removeRedundantAttributes and script charset", () => {
	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */

	it("reads nothing past a tag, comment or declaration left open", () => {
		const { declaresUtf8 } = require("../../../lib/html/syntax-parser");

		for (const html of [
			fixture("html", "source-processor-remove-redundant-attributes-and-script-charset-reads-nothing"),
			fixture("html", "source-processor-remove-redundant-attributes-and-script-charset-reads-nothing-2"),
			fixture("html", "source-processor-remove-redundant-attributes-and-script-charset-reads-nothing-3"),
			fixture("html", "source-processor-remove-redundant-attributes-and-script-charset-reads-nothing-4"),
			fixture("html", "source-processor-remove-redundant-attributes-and-script-charset-reads-nothing-5"),
			fixture("html", "source-processor-remove-redundant-attributes-and-script-charset-reads-nothing-6")
		]) {
			expect(declaresUtf8(html)).toBe(false);
		}
		expect(declaresUtf8(fixture("html", "source-processor-remove-redundant-attributes-and-script-charset-reads-nothing-7"))).toBe(true);
		expect(declaresUtf8(fixture("html", "source-processor-remove-redundant-attributes-and-script-charset-reads-nothing-8"))).toBe(true);
	});
});


describe("SourceProcessor — renderEmbeddedSource", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {import("../../../lib/html/syntax-printer").EmbeddedSourceRenderer=} renderEmbeddedSource the renderer
	 * @returns {string} the minified serialization
	 */
	const minify = (html, renderEmbeddedSource) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			renderEmbeddedSource
		}).code;



	it("is usable again after a deferred print throws", async () => {
		// The throw never reaches where `process` clears the deferred callback, so
		// without a teardown the next ordinary print returns nothing.
		let explode = true;
		const processor = new SourceProcessor().use({
			[NodeType.Element]: () => {
				if (explode) throw new Error("boom");
			}
		});

		await expect(
			processor.processAsync(fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints"), {
				mode: "minify",
				renderEmbeddedSource: () => undefined
			})
		).rejects.toThrow("boom");

		explode = false;

		expect(processor.process(fixture("html", "source-processor-render-embedded-source-is-usable-again-after-a-deferred-print"), { mode: "minify" }).code).toBe("<p>y");
	});



	it("prints again where an answer overturns a choice made on the source", async () => {
		// Each choice is one a deferred print makes on the source: the emptied
		// sheet and list go with their elements; the sheet the input left open
		// in a custom property's value is kept as written, on its own.
		const html = fixture("html", "source-processor-render-embedded-source-prints-again-where-an-answer-overturns-a");
		const options = {
			mode: /** @type {"minify"} */ ("minify"),
			mergeStyles: true,
			removeEmptyAttributes: true,
			removeEmptyElements: true
		};
		const builtin = builtinEmbeddedRenderer();
		/** @type {string[]} */
		const offered = [];
		const now = new SourceProcessor().process(html, {
			...options,
			renderEmbeddedSource: builtin
		});
		const later = await new SourceProcessor().processAsync(html, {
			...options,
			renderEmbeddedSource: async (source, hole) => {
				offered.push(source);
				return builtin(source, hole);
			}
		});

		expect(now.code).toBe(
			"<p>x</p><style>.a{--x:f(</style><style>.b{color:red}</style><script>1</script>"
		);
		expect(later.code).toBe(now.code);
		// The second print reads the first one's answers rather than asking again.
		expect(offered).toEqual([
			"a{}",
			"color:",
			".a{--x:f(",
			".b{color:red}",
			"1"
		]);
	});



















































	it("writes a rendered srcdoc back so it parses to what came out", () => {
		const payload = "<p class=\"a\" data-x='y'>a & b < c > d</p>";
		const out = minify(
			fixture("html", "source-processor-render-embedded-source-writes-a-rendered-srcdoc-back-so-it"),
			(source, info) => (info.type === "html" ? payload : source)
		);
		/** @type {string | undefined} */
		let readBack;
		new SourceProcessor()
			.use({
				[NodeType.Element]: (path) => {
					if (path.name() !== "iframe") return;
					const srcdoc = path.fieldNamed(Field.attributes, "srcdoc");
					if (srcdoc !== 0) readBack = path.value(srcdoc);
				}
			})
			.process(out, {});
		expect(readBack).toBeDefined();
		expect(readBack).toBe(payload);
	});

	it("keeps the body when the renderer answers with something other than text", () => {
		// `srcdoc` is written back escaped, so a non-string would reach the escaper.
		const doc =
			fixture("html", "source-processor-render-embedded-source-keeps-the-body-when-the-renderer-answers");
		const untouched = minify(doc);
		for (const answer of [undefined, null, 42, {}]) {
			expect(minify(doc, () => /** @type {EXPECTED_ANY} */ (answer))).toBe(
				untouched
			);
		}
	});


});

describe("SourceProcessor — inline CSS honors the target's abilities", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * A `style=""` is serialized while the walk streams the open tag, before that
	 * element's printer runs, so its options must stay bound for the whole print —
	 * otherwise the attribute reads the previous print's target. `#rrggbbaa`
	 * landed in Chrome 62, so the two selections sit either side of that one
	 * ability and the browsers decide it rather than a flag.
	 * @param {string} browser the browserslist selection to minify for
	 * @returns {string} the minified serialization
	 */
	const minifyFor = (browser) =>
		new SourceProcessor().process(
			fixture("html", "source-processor-inline-css-honors-the-target-s-abilities-shortens-both-the"),
			{
				mode: "minify",
				renderEmbeddedSource: builtinEmbeddedRenderer({
					environment: { browsers: [browser] }
				})
			}
		).code;



	it("does not carry one print's target into the next", () => {
		minifyFor("chrome 62");
		expect(minifyFor("chrome 50")).toBe(
			"<p style=color:rgba(255,0,0,.5)>x</p><style>.a{color:rgba(255,0,0,.5)}</style>"
		);
	});





});



describe("htmlMinify — embedded code a minifier fails on", () => {
	const htmlMinify = require("../../../lib/html/htmlMinify");

	const page =
		fixture("html", "html-minify-embedded-code-a-minifier-fails-on-reports-what-webpack-s-own-css");



	it("keeps a body the caller's minifier fails on, reported once", async () => {
		const { code, errors } = await htmlMinify({ "page.html": page }, undefined, {
			renderEmbeddedSource: (
				/** @type {string} */ _source,
				/** @type {{ type: string }} */ info
			) => {
				if (info.type === "css") throw new Error("failing CSS minifier");
				return undefined;
			}
		});
		// Webpack's own CSS minifier is not asked after the caller's failed.
		expect(code).toBe(
			'<style>a { b : c }</style><p style="b : c">x</p><script type=application/json>{"a":1}</script>'
		);
		expect(errors).toEqual([
			expect.objectContaining({ message: "failing CSS minifier" }),
			expect.objectContaining({ message: "failing CSS minifier" })
		]);
	});

	it("keeps a body the caller's minifier answers with errors beside code", async () => {
		const { code, errors } = await htmlMinify(
			{ "page.html": fixture("html", "html-minify-embedded-code-a-minifier-fails-on-keeps-a-body-the-caller-s-minifier") },
			undefined,
			{
				renderEmbeddedSource: () => ({
					code: "broken",
					errors: [new Error("failing CSS minifier")]
				})
			}
		);
		expect(code).toBe("<style>a { b : c }</style>");
		expect(errors).toHaveLength(1);
	});
});


describe("SourceProcessor — print modes", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} source html source
	 * @param {import("../../../lib/util/SourceProcessor").PrintOptions["mode"]} mode print mode
	 * @returns {string} its serialization
	 */

	it("prints nothing unless output is asked for", () => {
		expect(new SourceProcessor().process(fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints"))).toBeUndefined();
	});
});

describe("SourceProcessor — the leading newline of `<pre>`", () => {
	// Run in a heap far smaller than a copy of every subtree would take, which a
	// per-element read of the composed children's first character used to make.
	it.each([
		["<pre>", "<pre>", "</pre>"],
		["<svg> under a renderer", "<svg><g>", "</g></svg>"]
	])("prints %s nested 20000 deep in a small heap", (_, open, close) => {
		const script = `
			const { SourceProcessor } = require(${JSON.stringify(
				require.resolve("../../../lib/html/syntax")
			)});
			const source = ${JSON.stringify(open)}.repeat(20000) + "x" +
				${JSON.stringify(close)}.repeat(20000);
			const { code } = new SourceProcessor().process(source, {
				mode: "minify",
				renderEmbeddedSource: () => undefined
			});
			process.stdout.write(String(code === source));
		`;
		expect(
			execFileSync(
				process.execPath,
				["--max-old-space-size=128", "-e", script],
				{ encoding: "utf8", stdio: "pipe" }
			)
		).toBe("true");
	});
});


describe("SourceProcessor — reusing work across a print", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {Partial<import("../../../lib/html/syntax-parser").HtmlProcessOptions>=} options extra process options
	 * @returns {string} the minified serialization
	 */
	const minify = (html, options) =>
		new SourceProcessor().process(html, { mode: "minify", ...options }).code;



	it("does not carry a style attribute's result into a renderer with other options", () => {
		const html = fixture("html", "source-processor-reusing-work-across-a-print-does-not-carry-a-style-attribute-s");
		const plain = { renderEmbeddedSource: builtinEmbeddedRenderer() };
		expect(minify(html, plain)).toBe("<p style=width:16px>");
		expect(
			minify(html, {
				renderEmbeddedSource: builtinEmbeddedRenderer({
					convertLengthUnits: true
				})
			})
		).toBe("<p style=width:1pc>");
		expect(minify(html, plain)).toBe("<p style=width:16px>");
	});

	/**
	 * @param {string} html input markup
	 * @returns {string} the tag name of the document's deepest element
	 */
	const deepestTagName = (html) => {
		let node = parseHtmlRefs(html);
		for (;;) {
			const children = childrenOf(node);
			if (children.length === 0) return A.name(node);
			node = children[children.length - 1];
		}
	};

	it("reads back every name of a document that dirties the whole memo", () => {
		// A slot is picked by first character and length, so 512 consecutive
		// lengths reach every one — the parse that drops the memo whole.
		const SLOTS = 512;
		/** @type {string[]} */
		const names = [];
		/**
		 * @param {import("../../../lib/html/syntax-parser").HtmlNodeRef} node node
		 * @returns {void}
		 */
		const walk = (node) => {
			for (const child of childrenOf(node)) {
				if (A.type(child) === NodeType.Element) {
					names.push(A.name(child));
					walk(child);
				}
			}
		};
		walk(parseHtmlRefs(fixture("html", "source-processor-reusing-work-across-a-print-reads-back-every-name-of-a-document")));
		expect(names).toHaveLength(SLOTS + 3);
		expect(names[3]).toBe("x-a");
		expect(names[names.length - 1]).toBe(`x-${"a".repeat(SLOTS)}`);
		// A second parse must not be handed anything the first left in a slot.
		expect(deepestTagName(fixture("html", "source-processor-reusing-work-across-a-print-reads-back-the-name-it-was-given"))).toBe("my-widget");
	});
});




describe("htmlMinify export", () => {
	it("is the minifier itself, reachable from the public entry", () => {
		const webpack = require("../../..");

		expect(webpack.html.htmlMinify).toBe(
			require("../../../lib/html/htmlMinify")
		);
	});

	it("carries the minimizer contract minimizer-webpack-plugin dispatches on", () => {
		const webpack = require("../../..");

		const { htmlMinify } = webpack.html;

		expect(htmlMinify.getTypes()).toEqual(["html"]);
		expect(htmlMinify.getEmbeddedTypes()).toContain("css");
		expect(htmlMinify.supportsWorkerThreads()).toBe(true);
		expect(htmlMinify.filter("a.html")).toBe(true);
		expect(htmlMinify.filter("a.css")).toBe(false);
	});

	it("minifies through the public entry", async () => {
		const webpack = require("../../..");

		const { htmlMinify } = webpack.html;

		const { code } = await htmlMinify({
			"a.html": fixture("html", "html-minify-export-minifies-through-the-public-entry")
		});

		// `</p>` is an optional end tag, so minifying drops it.
		expect(code).toMatchInlineSnapshot('"<p class=x>  a  "');
	});

	it("writes the extracted comments' banner as an HTML comment, at the end", () => {
		const htmlMinify = require("../../../lib/html/htmlMinify");

		expect(htmlMinify.formatBanner("see a.LICENSE.txt")).toBe(
			"<!-- see a.LICENSE.txt -->"
		);
		// A filename spelling `-->` or `--!>` must not end the comment early.
		expect(htmlMinify.formatBanner("see p-->x--!>y--->z.LICENSE.txt")).toBe(
			"<!-- see p- ->x- -!>y-- ->z.LICENSE.txt -->"
		);
		expect(htmlMinify.getBannerPosition()).toBe("end");
	});

});




describe("SourceProcessor — parseError while printing", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	it("reports the source's errors, not the printed form's", () => {
		// Foster parenting makes the print read itself back, and the printed form
		// opens with text: an error of its own that the source does not have.
		const html = fixture("html", "source-processor-parse-error-while-printing-reports-the-source-s-errors-not-the");
		/** @type {string[]} */
		const parsed = [];
		parseHtmlRefs(html, 0, {
			parseError: (input, code, start) => {
				parsed.push(`${code}@${start}`);
			}
		});
		/** @type {string[]} */
		const printed = [];
		const { code } = new SourceProcessor().process(html, {
			mode: "minify",
			parseError: (input, code, start) => {
				printed.push(`${code}@${start}`);
			}
		});
		expect(code).toBe("x<table><tr><td>a</table>");
		expect(printed).toEqual(parsed);
		expect(printed).not.toContain("expected-doctype-but-got-chars@0");
	});
});

/** @typedef {import("../../../lib/html/syntax-printer").HtmlProcessOptions & import("../../../lib/html/syntax-printer").HtmlPrintOptions & { mode: "minify" | "beautify" }} HtmlPrint */


// Prints read back as a browser reads them: with scripting on, as `grammar`
// parses the source it prints, and in the fragment context it was parsed in.
describe("SourceProcessor — printing what re-parses to the same tree", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} source html source
	 * @param {HtmlPrint} options print options
	 * @returns {string} the printed document
	 */
	const print = (source, options) =>
		new SourceProcessor().process(source, options).code;






	describe("a fragment", () => {


		it("reads a checked print back as the options leave it, reporting nothing twice", () => {
			// A foreign context is read back, with what the options drop dropped there
			// too, and the read back reports no error of its own.
			const source =
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-reads-a");
			/** @type {string[]} */
			const errors = [];
			const options = {
				mode: /** @type {const} */ ("minify"),
				fragmentContext: "svg path",
				removeRedundantAttributes: /** @type {const} */ ("all"),
				parseError: (
					/** @type {string} */ _input,
					/** @type {string} */ code
				) => {
					errors.push(code);
				}
			};
			const printed = print(source, options);
			const once = [...errors];
			errors.length = 0;
			expect(print(source, options)).toBe(printed);
			expect(printed).toMatchInlineSnapshot(
				`"<p><script>a()</script><input value class><span></span><b>x& y</b>"`
			);
			expect(errors).toEqual(once);
			expect(errors).toContain("missing-semicolon-after-character-reference");
			expect(errors).toContain(
				"non-void-html-element-start-tag-with-trailing-solidus"
			);
		});
	});


});

describe("SourceProcessor — attribute values the minifier rewrites", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");


	/**
	 * @param {string} source html source
	 * @returns {{ name: string, value: string }[][]} each element's attributes, decoded
	 */
	const attributes = (source) => {
		/** @type {{ name: string, value: string }[][]} */
		const out = [];
		new SourceProcessor()
			.use({
				[NodeType.Element]: (path) => {
					/** @type {{ name: string, value: string }[]} */
					const list = [];
					for (let i = 0, n = path.fieldCount(Field.attributes); i < n; i++) {
						const attribute = path.field(i, Field.attributes);
						list.push({
							name: path.name(attribute),
							value: path.value(attribute)
						});
					}
					out.push(list);
				}
			})
			.process(source);
		return out;
	};

	it.each([
		// The shortest spelling of a value carrying references, `=` keeping it
		// quoted and the `&` that opens nothing left bare.
		[fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-p-title-a-amp-b-c"), fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-p-title-a-amp-b-c-2")],
		// `&#` opens a numeric reference whatever follows it.
		[
			fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-p-amp-x-p-a-title"),
			fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-p-amp-x-p-a-title-2")
		],
		// A rewrite holding both quotes and no reference cannot take other quotes, so
		// the source spelling stands.
		[fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-img-srcset-a-b"), fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-img-srcset-a-b")],
		[
			fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-p-class-a-x-p"),
			fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-p-class-a-x-p-2")
		],
		[
			fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-p-class-a-quot-b"),
			fixture("html", "source-processor-attribute-values-the-minifier-rewrites-writes-p-class-a-quot-b-2")
		]
	])("writes %s in the shortest quoting", (source, expected) => {
		// Respelled, not changed: every value but a rewritten list reads the same.
		/**
		 * @param {{ name: string, value: string }[][]} elements attributes per element
		 * @returns {{ name: string, value: string }[][]} the ones no list rewrite touches
		 */
		const unlisted = (elements) =>
			elements.map((list) =>
				list.filter((a) => a.name !== "class" && a.name !== "srcset")
			);
		expect(unlisted(attributes(expected))).toEqual(
			unlisted(attributes(source))
		);
	});


});


describe("SourceProcessor — the markup generators", () => {
	const {
		baseTag,
		buildHeadTags,
		escapeAttribute,
		escapeText,
		metaTag,
		parseHtml,
		pickTransforms
	} = require("../../../lib/html/syntax-parser");

	/**
	 * @param {string} html generated markup
	 * @returns {string} its tree
	 */
	const tree = (html) => serializeHtmlTree(parseHtml(html));

	it("escapes text so that it reads back as written", () => {
		const text = "a & b < c > d e\nf\rg";
		expect(escapeText("plain")).toBe("plain");
		expect(escapeText(text)).toBe("a &amp; b &lt; c &gt; d&nbsp;e&#10;f&#13;g");
		expect(tree(`<p>${escapeText(text)}`)).toBe(
			tree(fixture("html", "source-processor-the-markup-generators-escapes-text-so-that-it-reads-back-as"))
		);
	});

	it("escapes an attribute value for the quote it is written in", () => {
		expect(escapeAttribute("a b\rc\n\"x'")).toBe("a&nbsp;b&#13;c&#10;&quot;x'");
		expect(escapeAttribute('it\'s "q"', 39)).toBe('it&#39;s "q"');
		// Minimal: NBSP literal and an `&` no reference starts after left bare.
		expect(escapeAttribute("a b", 39, true)).toBe("a b");
		expect(escapeAttribute("&c &amp", 34, true)).toBe("&c &amp;amp");
	});

	it("builds head tags in spec order", () => {
		expect(
			buildHeadTags({
				meta: { charset: "utf-8", viewport: "width=device-width", "og:x": "1" },
				base: "/",
				title: "A & B"
			})
		).toBe(
			'<meta charset="utf-8"><base href="/"><meta name="viewport" content="width=device-width"><meta property="og:x" content="1"><title>A &amp; B</title>'
		);
		expect(buildHeadTags({})).toBe("");
		expect(buildHeadTags({ meta: { author: "me" }, title: "" })).toBe(
			'<meta name="author" content="me">'
		);
		expect(metaTag("og:title", 'A "B"')).toBe(
			'<meta property="og:title" content="A &quot;B&quot;">'
		);
		expect(metaTag("description", "x&y")).toBe(
			'<meta name="description" content="x&amp;y">'
		);
		expect(baseTag("/x/")).toBe('<base href="/x/">');
		expect(baseTag({ href: "/y", target: "_top" })).toBe(
			'<base href="/y" target="_top">'
		);
		expect(baseTag({ href: "/z" })).toBe('<base href="/z">');
	});

	it("picks the transforms an options object names", () => {
		expect(
			pickTransforms({ collapseBooleanAttributes: false, comments: false })
		).toEqual({ collapseBooleanAttributes: false, comments: false });
		expect(pickTransforms({})).toBeUndefined();
	});
});


describe("SourceProcessor — the streamed walk", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");













	it("ends a walk a visitor stopped, and fires its visitors on the next", () => {
		const processor = new SourceProcessor();
		/** @type {string[]} */
		const log = [];
		processor.use({
			[NodeType.Element]: (path) => {
				log.push(path.name());
				if (path.name() === "b") path.stop();
			}
		});
		processor.process(fixture("html", "source-processor-the-streamed-walk-ends-a-walk-a-visitor-stopped-and-fires-its-2"));
		expect(log.slice(-2)).toEqual(["p", "b"]);
		log.length = 0;
		processor.process(fixture("html", "source-processor-the-streamed-walk-ends-a-walk-a-visitor-stopped-and-fires-its"));
		expect(log).toEqual(["html", "head", "body", "b"]);
	});

});



