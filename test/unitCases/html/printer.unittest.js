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
				state(await webpack.html.xmlMinify({ "a.svg": "<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>" }, undefined, { css: {} }));
				state(await webpack.html.htmlMinify({ "a.html": "<p>hi</p>" }, undefined, { css: {} }));
				state(await webpack.html.htmlMinify({ "a.html": "<style>a { color : #ff0000 }</style>" }, undefined, { css: { shortenColors: false } }));
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
							new SourceProcessor().process("<b>nested</b>", { mode: "minify" });
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
			["a{b:url( x", ")}"],
			["a{b:url(  ", ")}"],
			["a{b:url( x )", "}"],
			["a{b:url(x ", ")}"],
			["a{b:url(x  )", "}"],
			["url(x", "){}"],
			["a{b:url(x y(", ")}"],
			["a{b:url(x\\)y", ")}"],
			["a{b:url(x\\\ny(", ")}"],
			["a{b:url(x\\\ny\\\nz", ")}"],
			// A quoted url is a function holding a string.
			['a{b:url("x', '")}'],
			// Part of a longer name, `url(` is a function's name, not a url token.
			["a{b:image-url(x", ")}"],
			["a{b:\\url(x", ")}"],
			// An escape starts a name, so `@` opens an at-rule; one before a
			// newline is no escape, and `@` a delimiter opening a prelude.
			["x{}@\\61 b", ";"],
			["x{}@-\\61", ";"],
			["x{}@-\\\n", "{}"],
			// Past whitespace and comments, a custom property's open value is kept.
			["a{/*c*/--x:f(", null],
			["a{\t--x:[1", null],
			["a{ /*c*/ b:f(", ")}"],
			["a{b:1;/*", "*/}"],
			// A lone backslash escapes whatever would follow it.
			["a{b:url(x\\", null],
			["x{}@\\", null]
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



describe("SourceProcessor — which comments survive", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {import("../../../lib/html/syntax-parser").HtmlTransformOptions["comments"]=} comments which comments to keep
	 * @returns {string} the minified serialization
	 */
	const minify = (html, comments) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			transforms: { comments }
		}).code;

	const html = fixture("html", "source-processor-which-comments-survive-absent-drops-every-inert-comment");
	const licensed = "<div><!-- @license MIT --></div>";

	// The six forms terser's `format.comments` takes, on an element whose own
	// tags stay put either way.
	it.each([
		[
			"a predicate keeps what it accepts",
			/** @type {(comment: string) => boolean} */ (
				(comment) => comment.includes("@license")
			),
			licensed
		]
	])("%s", (_name, comments, expected) => {
		expect(minify(html, /** @type {EXPECTED_ANY} */ (comments))).toBe(expected);
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
			'<div title="<meta charset=utf-8>',
			"<!-- <meta charset=utf-8>",
			"<!doctype <meta charset=utf-8>",
			"<?x <meta charset=utf-8>",
			"<?x <meta charset=utf-8",
			'</div x="><meta charset=utf-8>'
		]) {
			expect(declaresUtf8(html)).toBe(false);
		}
		expect(declaresUtf8('<!-->x<meta charset="utf-8">')).toBe(true);
		expect(declaresUtf8('</ x><meta charset="utf-8">')).toBe(true);
	});
});

describe("SourceProcessor — a frameset document", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {(boolean | "smart" | "all")=} removeImpliedTags the mode
	 * @returns {string} the minified serialization
	 */
	const minify = (html, removeImpliedTags) =>
		new SourceProcessor().process(html, { mode: "minify", removeImpliedTags })
			.code;

	it("keeps the `</html>` it spelled unless every implied tag goes", () => {
		const page = fixture("html", "source-processor-a-frameset-document-keeps-the-html-end-tag-it-spelled");
		expect(minify(page)).toBe("<frameset><frame src=a></frameset></html>");
		expect(minify(page, "all")).toBe("<frameset><frame src=a></frameset>");
	});

	it("prints no end tag for an element tree construction pops at once", () => {
		// §13.3 serializes no end tag for `frame`, `basefont` or `bgsound`.
		expect(minify(fixture("html", "source-processor-a-frameset-document-prints-no-end-tag-for-an-element-popped-at-once"))).toBe(
			"<head><basefont><bgsound></head><frameset><frame><frame src=b></frameset>"
		);
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

	it("keeps `srcdoc` off the deferred path when the caller says so", () => {
		// Both renderers set: `deferSrcdoc: false` asks for the attribute on the
		// normal path, so it is answered synchronously and collected nowhere.
		/** @type {import("../../../lib/html/syntax-parser").DeferredEmbeddedSource[]} */
		const holes = [];
		const { code } = new SourceProcessor().process(
			fixture("html", "source-processor-render-embedded-source-keeps-srcdoc-off-the-deferred-path-when"),
			{
				mode: "minify",
				renderEmbeddedSource: (
					/** @type {string} */ _source,
					/** @type {{ type: string }} */ info
				) => (info.type === "html" ? "<p>answered</p>" : undefined),
				deferEmbeddedSource: holes,
				deferSrcdoc: false
			}
		);

		expect(holes).toEqual([]);
		expect(code).toBe('<iframe srcdoc="<p>answered</p>"></iframe>');
	});


	it("prints again where an answer overturns a choice made on the source", async () => {
		// Each choice is one a deferred print makes on the source: the emptied
		// sheet and list go with their elements; the sheet the input left open
		// in a custom property's value is kept as written, on its own.
		const html =
			'<p>x<style>a{}</style><div style="color:"></div>' +
			"<style>.a{--x:f(</style><style>.b{color:red}</style><script>1</script>";
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




































	it("names html as the host of every body it offers", () => {
		const hosts = new Set();
		minify(fixture("html", "source-processor-render-embedded-source-names-html-as-the-host-of-every-body-it"), (s, i) => {
			hosts.add(i.hostType);
			return s;
		});
		expect([...hosts]).toEqual(["html"]);
	});










	it("offers only the outermost `<svg>`, its nested bodies already rendered", () => {
		/** @type {string[]} */
		const svg = [];
		const out = minify(
			fixture("html", "source-processor-render-embedded-source-offers-only-the-outermost-svg-its-nested"),
			(source, info) => {
				if (info.type === "css") return source.replace(/\s+/g, "");
				svg.push(source);
				return source.replace(" viewBox", " v");
			}
		);
		// One offer for the whole subtree — the inner `<svg>` is part of it — and
		// the CSS inside it is what the renderer just returned.
		expect(svg).toEqual([
			'<svg viewBox="0 0 2 2"><style>.s{fill:red}</style><svg><rect/></svg></svg>'
		]);
		expect(out).toBe(
			'<svg v="0 0 2 2"><style>.s{fill:red}</style><svg><rect/></svg></svg>'
		);
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

describe("htmlMinify — one document reaching every embedded site", () => {
	const htmlMinify = require("../../../lib/html/htmlMinify");

	// One document per site the print offers, down to two `<iframe srcdoc>` —
	// one quoted, one written bare.
	const DOCUMENT = fixture("html", "html-minify-one-document-reaching-every-embedded-site-offers-every-body-to-a");

	it("offers every body to a caller's renderer, and prints each answer", async () => {
		/** @type {string[]} */
		const offered = [];
		/**
		 * @param {string} source the body offered
		 * @param {{ type: string, as?: string }} info what it is
		 * @returns {string} a marker naming what was asked for
		 */
		const render = (source, info) => {
			const name =
				info.as === undefined ? info.type : `${info.type}/${info.as}`;

			offered.push(name);

			return `ANSWER(${name})`;
		};

		const { code } = await htmlMinify({ "page.html": DOCUMENT }, undefined, {
			renderEmbeddedSource: render
		});

		// Every site, once each: the `style=""` as the block-contents production
		// it is, and one `html/srcdoc` per `<iframe srcdoc>`.
		expect(offered).toEqual([
			"css",
			"json",
			"javascript/script",
			"css/block-contents",
			"javascript/event-handler",
			"svg/foreign-element",
			"html/srcdoc",
			"html/srcdoc"
		]);
		expect(code).toMatchSnapshot();
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


	it("runs a caller's renderer for every style attribute, repeats included", () => {
		// The renderer is handed every `style=""`, so a memo keyed on the value
		// alone would hand the second attribute the first one's result. It is
		// offered the declaration list itself — `as` says so — and answers with one.
		let calls = 0;
		const code = minify(fixture("html", "source-processor-reusing-work-across-a-print-runs-a-caller-s-renderer-for-every"), {
			renderEmbeddedSource: (source, info) =>
				info.type === "css" ? `--call:${++calls}` : source
		});
		expect(calls).toBe(2);
		expect(code).toBe("<p style=--call:1><b style=--call:2></b>");
	});

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
		let markup = "<body>";
		for (let i = 1; i <= SLOTS; i++) {
			markup += `<x-${"a".repeat(i)}></x-${"a".repeat(i)}>`;
		}
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
		walk(parseHtmlRefs(markup));
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

	describe("extractComments", () => {
		const page =
			"<!--! one --><p>a</p><!-- plain --><!-- @license two -->" +
			"<!--! one --><!--[if IE]><b>x</b><![endif]--><!--#include virtual=x -->";

		/**
		 * @param {EXPECTED_ANY} extractComments the plugin's option
		 * @param {Record<string, EXPECTED_ANY>=} options `minimize.html`
		 * @param {string=} html the document
		 * @returns {Promise<{ code: string, extractedComments?: string[] }>} what the minifier answers
		 */
		const run = async (extractComments, options = {}, html = page) => {
			const htmlMinify = require("../../../lib/html/htmlMinify");

			const { code, extractedComments } = await htmlMinify(
				{ "a.html": html },
				undefined,
				options,
				extractComments
			);
			return { code, extractedComments };
		};
		// A conditional comment and a server-side include are code, never taken.
		const rest =
			"<p>a</p><!--[if IE]><b>x</b><![endif]--><!--#include virtual=x -->";

		it.each([
			[
				(/** @type {{ value: string }} */ comment) =>
					comment.value.includes("one"),
				["<!--! one -->"]
			]
		])(
			"takes out what `minimize.html.extractComments: %p` names, over the plugin's",
			async (extractComments, extracted) => {
				expect(await run(false, { extractComments })).toEqual({
					code: rest,
					extractedComments: extracted
				});
			}
		);





		it("hands a predicate the comment's text, line and column", async () => {
			/** @type {{ value: string, line: number, col: number }[]} */
			const seen = [];
			await run(
				false,
				{
					extractComments: (
						/** @type {{ value: string, line: number, col: number }} */ comment
					) => {
						seen.push(comment);
						return false;
					}
				},
				fixture("html", "html-minify-export-extract-comments-hands-a-predicate-the-comment-s-text-line")
			);
			expect(seen).toEqual([
				{ value: "! a ", line: 1, col: 0 },
				{ value: " b ", line: 3, col: 1 },
				{ value: " c ", line: 3, col: 20 }
			]);
		});

	});
});


describe("SourceProcessor — the dropped-duplicate flag is per tag", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	/**
	 * Markup allocating more attributes than the columns are kept at, so the
	 * release after it drops the name column instead of clearing it.
	 * @returns {string} the markup
	 */
	const oversizedDocument = () => {
		let src = "";
		for (let i = 0; i < 660; i++) {
			src += "<i";
			for (let j = 0; j < 100; j++) src += ` data-${i}-${j}="1"`;
			src += "></i>";
		}
		return src;
	};

	it("clears it on a start tag that dropped one", () => {
		const src = `${oversizedDocument()}<b class="c" class="d"></b>`;
		expect(minify(src)).toContain("<b class=c></b>");
	});

	it("clears it on an end tag, which drops every attribute it parsed", () => {
		const src = `${oversizedDocument()}</b class="c" class="d">`;
		expect(minify(src)).toContain("data-659-99=1></i>");
	});

	it("clears it on a start tag the tokenizer only emitted at EOF", () => {
		const src = `${oversizedDocument()}<b class="c" class="d"`;
		expect(minify(src)).toContain("data-659-99=1></i>");
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



	const MINIFY = /** @type {const} */ ({ mode: "minify" });



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


	describe("a print that skips what a visitor skipped", () => {
		/**
		 * @param {string} source html source
		 * @param {HtmlPrint} options print options
		 * @param {number} skipped the node type whose `enter` skips its children
		 * @returns {{ code: string, log: string[] }} the print and what the visitors saw
		 */
		const skipping = (source, options, skipped) => {
			/** @type {string[]} */
			const log = [];
			const code = new SourceProcessor()
				.use({
					[NodeType.Document]: {
						enter: (path) => {
							if (skipped === NodeType.Document) path.skipChildren();
						},
						exit: () => log.push("-doc")
					},
					[NodeType.Element]: {
						enter: (path) => {
							log.push(`+${path.name()}`);
							if (skipped === NodeType.Element && path.name() === "div") {
								path.skipChildren();
							}
						},
						exit: (path) => log.push(`-${path.name()}`)
					}
				})
				.process(source, options).code;
			return { code, log };
		};


		it("still prints a document whose root skipped its children", () => {
			const { code, log } = skipping(
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-print-that-skips"),
				MINIFY,
				NodeType.Document
			);
			expect(code).toBe("<div><b>x</b></div><p>y");
			expect(log).toEqual(["-doc"]);
			expect(
				skipping(
					fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-print-that-skips-3"),
					{ xml: true, mode: "minify" },
					NodeType.Document
				).code
			).toBe("<a><b/></a>");
		});
	});
});

describe("SourceProcessor — attribute values the minifier rewrites", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const R = builtinEmbeddedRenderer();

	/**
	 * @param {string} source html source
	 * @param {import("../../../lib/html/syntax-printer").HtmlPrintOptions=} options print options on top of `mode: "minify"`
	 * @returns {string} the minified document
	 */
	const minify = (source, options) =>
		new SourceProcessor().process(source, { mode: "minify", ...options }).code;

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


	it("leaves a body as written where the answer is no text", () => {
		expect(
			minify(fixture("html", "source-processor-attribute-values-the-minifier-rewrites-leaves-a-body-as-written"), {
				embeddedAnswers: () => undefined
			})
		).toBe("<style>a { color : red }</style><p style='a : b'>x");
		expect(
			minify(fixture("html", "source-processor-attribute-values-the-minifier-rewrites-leaves-a-body-as-written-2"), {
				renderEmbeddedSource: () => undefined
			})
		).toBe("<p style='a : b'>x<svg/>");
		expect(minify(fixture("html", "source-processor-attribute-values-the-minifier-rewrites-leaves-a-body-as-written-3"), { renderEmbeddedSource: R })).toBe(
			"<p style=a:b>x"
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

	// Past `_STREAM_MIN_NODES` (49152) the walk follows the open element stack,
	// entering what is still open and recycling what finished under it.
	const BIG = 40000;

	/**
	 * @param {string} source html source
	 * @param {string=} skip the element whose `enter` calls `skipChildren()`
	 * @returns {string[]} `+name` / `-name` in visit order
	 */
	const walk = (source, skip) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Element]: {
					enter: (path) => {
						log.push(`+${path.name()}`);
						if (path.name() === skip) path.skipChildren();
					},
					exit: (path) => log.push(`-${path.name()}`)
				}
			})
			.process(source);
		return log;
	};

	/**
	 * @param {string[]} log a walk's log
	 * @param {string} entry one entry
	 * @returns {number} how often it occurs
	 */
	const count = (log, entry) => log.filter((e) => e === entry).length;

	/**
	 * @param {string[]} log a walk's log
	 */
	const balanced = (log) => {
		/** @type {string[]} */
		const open = [];
		for (const entry of log) {
			if (entry.startsWith("+")) open.push(entry.slice(1));
			else expect(open.pop()).toBe(entry.slice(1));
		}
		expect(open).toEqual([]);
	};

	it("closes an entered element when the next one ends it", () => {
		// The `<p>` was entered while open; the `<div>` that closes it diverges the
		// open stack from the entered one below the top.
		const log = walk(`<p>${"<span>x</span>".repeat(BIG)}<div>y</div>`);
		expect(count(log, "+span")).toBe(BIG);
		expect(log.slice(-5)).toEqual(["-p", "+div", "-div", "-body", "-html"]);
		balanced(log);
	});

	it("flushes a body whose first child is the text a head left", () => {
		// The text ends the head and opens the body on one token, so the body
		// already holds it when the walk first catches up.
		const log = walk(`<head>${"<meta>".repeat(50000)}x<p>y</p>`);
		expect(count(log, "+meta")).toBe(50000);
		expect(log.slice(-4)).toEqual(["+p", "-p", "-body", "-html"]);
		balanced(log);
	});

	it("does not start streaming on an open stack a `</form>` broke", () => {
		// The nodes piled up with no stack change until `</form>` took the form off
		// the middle of it, which is where the walk would first sync: entering the
		// stack then entered the `<div>` with its form never entered, and visited
		// the form after its own child had exited.
		const log = walk(`<form><div>${"a<!---->".repeat(25000)}b</form>c`);
		expect(log).toEqual([
			"+html",
			"+head",
			"-head",
			"+body",
			"+form",
			"+div",
			"-div",
			"-form",
			"-body",
			"-html"
		]);
	});

	it("finishes a skipped element the input left open", () => {
		const log = walk(`<div><section>${"<p><b>x</b></p>".repeat(BIG)}`, "div");
		expect(log).toEqual([
			"+html",
			"+head",
			"-head",
			"+body",
			"+div",
			"-div",
			"-body",
			"-html"
		]);
	});

	it("closes a body a frameset took out of the tree", () => {
		const log = walk(`${fixture("html", "source-processor-node-path-hands-every-visitor-the-run-s-state-typed-by-the-2").repeat(50000)}<frameset>`);
		expect(count(log, "+p")).toBe(50000);
		// The body still exits, detached, ahead of the frameset that replaced it.
		expect(log.slice(-4)).toEqual(["-body", "+frameset", "-frameset", "-html"]);
		balanced(log);
	});

	it("streams forms the end tag takes off the top of the stack", () => {
		const log = walk(
			`<!DOCTYPE html><html><body>${"<form><p>x</p></form>".repeat(
				BIG
			)}</body></html>`
		);
		expect(count(log, "+form")).toBe(BIG);
		expect(count(log, "-form")).toBe(BIG);
		balanced(log);
	});

	it("stops streaming where a `</form>` takes an entered form off mid-stack", () => {
		// The `<div>` inside stays open, so nothing has finished: reconciling there
		// would close and re-enter it.
		const log = walk(
			`<!DOCTYPE html><html><body><form>${fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints").repeat(
				BIG
			)}<div></form><p>y</p></div></body></html>`
		);
		expect(count(log, "+div")).toBe(1);
		expect(log.indexOf("-form")).toBeGreaterThan(log.lastIndexOf("-div"));
		balanced(log);
	});

	it("exits a skipped element that closes while streaming", () => {
		const log = walk(
			`<div><section>${"<p><b>x</b></p>".repeat(
				BIG
			)}</section></div><p>after</p>`,
			"div"
		);
		expect(log).toEqual([
			"+html",
			"+head",
			"-head",
			"+body",
			"+div",
			"-div",
			"+p",
			"-p",
			"-body",
			"-html"
		]);
	});

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
		processor.process(`${fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints").repeat(BIG)}<b>y</b><i>z</i>`);
		expect(log.slice(-2)).toEqual(["p", "b"]);
		log.length = 0;
		processor.process(fixture("html", "source-processor-the-streamed-walk-ends-a-walk-a-visitor-stopped-and-fires-its"));
		expect(log).toEqual(["html", "head", "body", "b"]);
	});

});



