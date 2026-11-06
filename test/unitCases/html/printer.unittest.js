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
	const minify = (html) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			mergeStyles: true,
			renderEmbeddedSource: builtinEmbeddedRenderer()
		}).code;

	it("writes a style attribute whose declarations all drop as bare", () => {
		expect(minify(fixture("html", "source-processor-merging-adjacent-style-writes-a-style-attribute-whose"))).toBe("<p style>x");
		expect(minify(fixture("html", "source-processor-merging-adjacent-style-writes-a-style-attribute-whose-2"))).toBe("<p style>x");
		// Spelled with a reference, the list is minified from its decoded text.
		expect(minify(fixture("html", "source-processor-merging-adjacent-style-writes-a-style-attribute-whose-3"))).toBe("<p style>x");
		expect(minify(fixture("html", "source-processor-merging-adjacent-style-writes-a-style-attribute-whose-4"))).toBe("<p style=color:red>x");
	});

	it("folds a run into one element", () => {
		expect(
			minify(fixture("html", "source-processor-merging-adjacent-style-folds-a-run-into-one-element"))
		).toBe("<style>a{color:red}b{color:#00f}</style>");
	});

	it("keeps every element, minified, unless asked to fold", () => {
		const html =
			fixture("html", "source-processor-merging-adjacent-style-keeps-every-element-minified-unless");
		expect(
			new SourceProcessor().process(html, {
				mode: "minify",
				renderEmbeddedSource: builtinEmbeddedRenderer()
			}).code
		).toBe("<style>a{color:red}</style><style>b{color:#00f}</style>");
	});

	it("declines a sheet whose `@import` would stop applying", () => {
		// `@import` is only honored at the top of a sheet, so appending this one
		// to the sheet before it silently drops the import.
		const html =
			fixture("html", "source-processor-merging-adjacent-style-declines-a-sheet-whose-import-would-stop");
		expect(minify(html)).toBe(html);
	});

	it("still absorbs into a sheet whose own `@import` leads", () => {
		expect(
			minify(
				fixture("html", "source-processor-merging-adjacent-style-still-absorbs-into-a-sheet-whose-own")
			)
		).toBe("<style>@import url(x.css);a{color:red}b{color:#00f}</style>");
	});

	it("closes a sheet ending inside a comment before joining it", () => {
		// Appending to text the comment swallows would comment the next sheet out,
		// so it is closed first, as its own end of input closed it.
		const open = fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-ending-inside-a-comment");
		expect(minify(open)).toBe("<style>a{color:red}b{color:#00f}</style>");
		expect(
			minify(fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-ending-inside-a-comment-2"))
		).toBe("<style>a{color:red}b{color:#00f}</style>");
	});

	it("closes a sheet ending inside a string before joining it", () => {
		const open = fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-ending-inside-a-string");
		expect(minify(open)).toBe('<style>a{content:"x"}b{color:#00f}</style>');
		// A newline ends a bad string, so this one is over where the sheet is.
		expect(
			minify(fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-ending-inside-a-string-2"))
		).toBe('<style>a{content:"x\n}b{color:#00f}</style>');
		// An escaped quote is a character of the string, not its end.
		expect(
			minify(fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-ending-inside-a-string-3"))
		).toBe("<style>a{content:'x\"y'}b{color:#00f}</style>");
	});

	it.each(["\n", "\r", "\r\n", "\f"])(
		"keeps the next sheet after a string ended by %j",
		(newline) => {
			const html = `<style>a{content:"x${newline};color:blue}</style><style>b{color:red}</style>`;
			// CSS preprocessing makes each newline equivalent to LF, including
			// where it ends a bad string before the next sheet is joined.
			expect(minify(html)).toBe(
				minify(
					fixture("html", "source-processor-merging-adjacent-style-keeps-the-next-sheet-after-a-string-2")
				)
			);
		}
	);

	it("reads an escape outside a string as one too", () => {
		// Were the quote not escaped it would open a string running to the end; as
		// it is, the escape starts a rule the sheet does not finish, closed with `{}`.
		expect(
			minify(fixture("html", "source-processor-merging-adjacent-style-reads-an-escape-outside-a-string-as-one"))
		).toBe("<style>a{color:red}b{color:#00f}</style>");
	});

	it("closes a sheet left inside a bracket before joining it", () => {
		const block = fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-left-inside-a-bracket");
		const call =
			fixture("html", "source-processor-merging-adjacent-style-closes-a-sheet-left-inside-a-bracket-2");
		expect(minify(block)).toBe("<style>a{color:red}b{color:#00f}</style>");
		expect(minify(call)).toBe(
			"<style>a{color:rgb(1,2,3})}b{color:#00f}</style>"
		);
	});

	it("closes a sheet the CSS minifier could not read before joining it", () => {
		// Deep enough to overflow the CSS parser's stack, so the run is written as
		// it stands — the blocks it left open closed, or the next sheet is in them.
		const unreadable = "a{".repeat(20000);
		const head = minify(
			`<style>${unreadable}</style><style>b{color:#00f}</style>`
		);
		expect(head).toContain(`${"}".repeat(20000)}b{color:#00f}</style>`);
		const tail = minify(
			`<style>a{color:red}</style><style>${unreadable}</style>`
		);
		expect(tail).toContain("<style>a{color:red}a{a{");
	});

	it("minifies a joined run as the one sheet it prints", () => {
		// Each sheet minified on its own, the joined text still holds two rules a
		// second pass folds into one.
		const once = minify(
			fixture("html", "source-processor-merging-adjacent-style-minifies-a-joined-run-as-the-one-sheet")
		);
		expect(once).toBe("<style>a,b{color:red}</style>");
		expect(minify(once)).toBe(once);
	});

	it("joins a blank sheet as nothing", () => {
		const once = minify(fixture("html", "source-processor-merging-adjacent-style-joins-a-blank-sheet-as-nothing"));
		expect(once).toBe("<style>b{color:red}</style>");
		expect(minify(once)).toBe(once);
		expect(minify(fixture("html", "source-processor-merging-adjacent-style-joins-a-blank-sheet-as-nothing-3"))).toBe(
			"<style>   </style>"
		);
	});

	it("reads the attributes each sheet will print, not the ones it holds", () => {
		const html =
			fixture("html", "source-processor-merging-adjacent-style-reads-the-attributes-each-sheet-will");
		const print = (/** @type {boolean} */ removeRedundantAttributes) =>
			new SourceProcessor().process(html, {
				mode: "minify",
				mergeStyles: true,
				removeRedundantAttributes,
				renderEmbeddedSource: builtinEmbeddedRenderer()
			}).code;
		expect(print(true)).toBe("<style>a{color:red}b{color:#00f}</style>");
		expect(print(false)).toBe(
			"<style type=text/css>a{color:red}</style><style>b{color:#00f}</style>"
		);
	});

	it("declines a run parted by text", () => {
		expect(
			minify(fixture("html", "source-processor-merging-adjacent-style-declines-a-run-parted-by-text"))
		).toBe(
			"<body><style>a{color:red}</style>x<style>b{color:#00f}</style></body>"
		);
	});

	it("reads a sheet's closed comment, escape and escaped quote as closed", () => {
		// Minified, each of those is closed as its end of input closed it, and joined.
		for (const [sheet, printed] of [
			["a{color:red}b", "a{color:red}"],
			["a{color:red}}", "a{color:red}"],
			// An unquoted url is one token, a bad one to the first `)`: its brackets
			// are not blocks to close, and one the input ran out in is closed.
			["a{b:url(x(.png);color:red", "a{b:url(x(.png);color:red}"],
			["a{background:url(x", "a{background:url(x)}"],
			// A lone `@` is a delimiter opening a rule's prelude, not an at-rule.
			["a{color:red}@", "a{color:red}"],
			["a{color:red}@-", "a{color:red}"],
			["@import url(x.css)", "@import url(x.css);"],
			["a[x", ""]
		]) {
			expect(
				minify(`<style>${sheet}</style><style>c{color:#00f}</style>`)
			).toBe(`<style>${printed}c{color:#00f}</style>`);
		}
		// A lone backslash is closed as end of input reads it: U+FFFD outside a
		// string, nothing inside one.
		expect(minify(fixture("html", "source-processor-merging-adjacent-style-reads-a-sheet-s-closed-comment-escape-21"))).toBe(
			"<style>c{color:#00f}</style>"
		);
		expect(
			minify(fixture("html", "source-processor-merging-adjacent-style-reads-a-sheet-s-closed-comment-escape-22"))
		).toBe('<style>a{b:"x"}c{color:#00f}</style>');
	});

	it("drops a run's first element only where every sheet in it prints nothing", () => {
		/**
		 * @param {string} html input markup
		 * @returns {string} the minified serialization
		 */
		const emptying = (html) =>
			new SourceProcessor().process(html, {
				mode: "minify",
				mergeStyles: true,
				removeEmptyElements: true,
				renderEmbeddedSource: builtinEmbeddedRenderer()
			}).code;
		expect(emptying(fixture("html", "source-processor-merging-adjacent-style-drops-a-run-s-first-element-only-where"))).toBe(
			"<style>b{color:red}</style>"
		);
		expect(emptying(fixture("html", "source-processor-merging-adjacent-style-drops-a-run-s-first-element-only-where-2"))).toBe("");
		expect(
			emptying(fixture("html", "source-processor-merging-adjacent-style-reads-a-sheet-s-closed-comment-escape-7"))
		).toBe("<style>@import url(x.css);</style>");
		expect(emptying(fixture("html", "source-processor-merging-adjacent-style-reads-a-sheet-s-closed-comment-escape-6"))).toBe(
			'<style>b{c:"d"}</style>'
		);
		// A sheet printed open is not joined, so it prints in its own element.
		const { code } = new SourceProcessor().process(
			fixture("html", "source-processor-merging-adjacent-style-drops-a-run-s-first-element-only-where-2"),
			{
				mode: "minify",
				mergeStyles: true,
				removeEmptyElements: true,
				renderEmbeddedSource: (source) => (source === "a{}" ? "" : 'b{c:"d')
			}
		);
		expect(code).toBe('<style>b{c:"d</style>');
		// Unjoined, each sheet is judged alone.
		expect(
			new SourceProcessor().process(
				fixture("html", "source-processor-merging-adjacent-style-drops-a-run-s-first-element-only-where"),
				{
					mode: "minify",
					removeEmptyElements: true,
					renderEmbeddedSource: builtinEmbeddedRenderer()
				}
			).code
		).toBe("<style>b{color:red}</style>");
	});

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

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify", mergeScripts: true })
			.code;

	/**
	 * @param {string} html input markup
	 * @returns {number} how many `<script>` elements the print left
	 */
	const scriptCount = (html) => (minify(html).match(/<script\b/g) || []).length;

	it("declines a run carrying any attribute at all", () => {
		for (const attribute of [
			"src=x.js",
			"type=module",
			'type="text/javascript"',
			"nonce=n",
			"async",
			"defer",
			"id=q",
			"class=c",
			"data-x=1",
			"integrity=sha256-x",
			"crossorigin"
		]) {
			// Two elements still, whichever side carries it.
			expect(
				scriptCount(`<script ${attribute}>a()</script><script>b()</script>`)
			).toBe(2);
			expect(
				scriptCount(`<script>a()</script><script ${attribute}>b()</script>`)
			).toBe(2);
		}
	});

	it("declines anything but whitespace between them", () => {
		expect(
			scriptCount(
				fixture("html", "source-processor-merging-adjacent-script-declines-anything-but-whitespace-3")
			)
		).toBe(2);
	});

	it("declines a body that leaves something open", () => {
		// Each would swallow the next body whole.
		for (const open of [
			"a() /* open",
			'var s = "open',
			"var s = 'open",
			"var s = `open",
			// eslint-disable-next-line no-template-curly-in-string
			"var s = `open${1}",
			'var s = "a" + "open'
		]) {
			expect(scriptCount(`<script>${open}</script><script>b()</script>`)).toBe(
				2
			);
		}
	});

	it("declines a body that opens a script of its own", () => {
		// A line comment ends at every line terminator, so a string opened past
		// one is really open.
		for (const terminator of ["\u2028", "\u2029"]) {
			for (const opener of ['var s = "open', "var s = 'open", "/* open"]) {
				const html = `<script>a() // c${terminator}${opener}</script><script>b()</script>`;
				expect(scriptCount(html)).toBe(2);
			}
		}
		// ECMAScript's whitespace is wider than HTML's, and all of it may sit
		// before a directive: a form feed, a BOM, U+2028.
		for (const space of ["\f", "\v", "\uFEFF", "\u00A0", "\u2028", "\u2029"]) {
			const spaced = `<script>a()</script><script>${space}"use strict";x = 1</script>`;
			expect(minify(spaced)).toBe(spaced);
		}
		// The same set ends a line comment, so a directive behind one is found.
		// Counted, not compared: the parser reads a `\r` in as a `\n`.
		for (const terminator of ["\n", "\r", "\u2028", "\u2029"]) {
			expect(
				scriptCount(
					`<script>a()</script><script>// c${terminator}"use strict";b()</script>`
				)
			).toBe(2);
		}
		expect(
			scriptCount(fixture("html", "source-processor-merging-adjacent-script-declines-a-body-that-opens-a-script-of-22"))
		).toBe(2);
	});

	// `-->` is a line comment only where nothing but whitespace and same-line
	// comments precede it, and an appended body no longer starts a line.
	it("declines a body opening with `-->` still on its first line", () => {
		for (const second of ["--> b()", "   --> b()", "/* c */ --> b()"]) {
			expect(
				scriptCount(`<script>a()</script><script>${second}</script>`)
			).toBe(2);
		}
	});

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

	it("keeps no state between two documents", () => {
		const processor = new SourceProcessor();
		expect(
			processor.process(fixture("html", "source-processor-merging-adjacent-script-folds-a-run-into-one-element"), {
				mode: "minify",
				mergeScripts: true
			}).code
		).toBe("<script>a()\n;b()</script>");
		const off = fixture("html", "source-processor-merging-adjacent-script-keeps-no-state-between-two-documents");
		expect(processor.process(off, { mode: "minify" }).code).toBe(off);
	});

});

describe("SourceProcessor — JSON <script> bodies", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			renderEmbeddedSource: builtinEmbeddedRenderer()
		}).code;

	/**
	 * @param {string} type the `<script type>` value
	 * @param {string} body the raw body
	 * @returns {string} the minified body
	 */
	const minifyBody = (type, body) => {
		const out = minify(`<script type="${type}">${body}</script>`);
		// Sliced, not matched: the wrapper is known, and none of the types below
		// carries a `>`, so the first one ends the open tag.
		const start = out.indexOf(">") + 1;
		const end = out.lastIndexOf("</script>");
		if (start === 0 || end === -1) throw new Error(`no <script> in ${out}`);
		return out.slice(start, end);
	};

	it.each([
		"application/json",
		"application/ld+json",
		"importmap",
		"speculationrules",
		"application/vnd.api+json"
	])("strips the whitespace between the tokens of %s", (type) => {
		expect(minifyBody(type, '{ "a" : [ 1 , 2 ] }')).toBe('{"a":[1,2]}');
	});

	it("reads the type case- and whitespace-insensitively", () => {
		expect(minifyBody(" APPLICATION/LD+JSON ", '{ "a" : 1 }')).toBe('{"a":1}');
	});

	it("leaves a body that is not JSON alone", () => {
		expect(minifyBody("application/json", "{{ t }}")).toBe("{{ t }}");
		expect(minifyBody("application/json", "  ")).toBe("  ");
	});

	it("leaves a type that is not JSON alone", () => {
		expect(minifyBody("text/template", '{ "a" : 1 }')).toBe('{ "a" : 1 }');
	});

	it("copies every literal byte for byte", () => {
		// Re-serializing would round the number through a double, drop the
		// duplicate key and rewrite the escape.
		expect(
			minifyBody(
				"application/json",
				'{ "n" : 1e400 , "s" : "a\\u0041" , "d" : 1 , "d" : 2 }'
			)
		).toBe('{"n":1e400,"s":"a\\u0041","d":1,"d":2}');
	});

	it("keeps the whitespace inside a string", () => {
		expect(minifyBody("application/json", '{ "a" : " x " }')).toBe(
			'{"a":" x "}'
		);
	});

	// Re-serializing unescapes `\u003c`, so `</script>` closes the element early
	// — the swc `minifyJson` vulnerability. Copying keeps the escape.
	it.each(["application/json", "application/ld+json"])(
		"keeps an escaped `</script>` escaped in %s",
		(type) => {
			for (const escape of ['"\\u003c/script\\u003e"', '"<\\/script>"']) {
				const body = minifyBody(type, `{ "a" : ${escape} }`);
				expect(body).toBe(`{"a":${escape}}`);
				expect(body).not.toMatch(/<\/script/i);
			}
		}
	);

	it("cannot splice a `<script` across a string boundary", () => {
		// Only whitespace *outside* a string is removed, and `<` never appears
		// there — the closing quote always breaks the run.
		expect(minifyBody("application/json", '[ "<!--<scrip" , true ]')).toBe(
			'["<!--<scrip",true]'
		);
	});

	it("keeps a literal `</script>` the double-escaped state carried through", () => {
		// `<!--` then `<script` puts the tokenizer in script-data-double-escaped,
		// where `</script>` no longer closes — so the parser hands one through.
		const out = minify(
			fixture("html", "source-processor-json-script-bodies-keeps-a-literal-script-the-double-escaped")
		);
		expect(out).toBe(
			'<script type=application/ld+json>{"a":"<!--<script>","b":"</script>"}</script>'
		);
		// Re-parsing must reach the same DOM, or the run moved the close.
		expect(minify(out)).toBe(out);
	});
});

describe("SourceProcessor — inline <script> type", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} type the `<script type>` value
	 * @param {string} body the raw body
	 * @returns {string} the body, minified
	 */
	const minifyBody = (type, body) => {
		const out = new SourceProcessor().process(
			`<script type="${type}">${body}</script>`,
			{ mode: "minify", renderEmbeddedSource: builtinEmbeddedRenderer() }
		).code;
		return out.slice(out.indexOf(">") + 1, out.lastIndexOf("</script>"));
	};

	it.each([
		"application&#47;ld&#43;json",
		"application&#x2F;json",
		"application/json&#32;"
	])("reads %s as JSON, since the parser decodes it", (type) => {
		expect(minifyBody(type, '  { "a" :  1 }  ')).toBe('{"a":1}');
	});

	it.each(["text&#47;x-template", "text&#47;yaml", "unknown&#47;thing"])(
		"leaves the body of the data block %s alone",
		(type) => {
			// Its own syntax is not ours to read, and its whitespace can be part of it.
			expect(minifyBody(type, "  <div> x </div>  ")).toBe("  <div> x </div>  ");
		}
	);

	it("keeps the indentation a payload's own language may count", () => {
		const yaml = "\n    a: 1\n    b: 2\n  ";
		expect(minifyBody("text/yaml", yaml)).toBe(yaml);
	});

	it("reads the type case- and whitespace-insensitively through a reference", () => {
		expect(minifyBody(" APPLICATION&#47;JSON ", '  { "a" : 1 }  ')).toBe(
			'{"a":1}'
		);
		expect(minifyBody(" TEXT&#47;X-TEMPLATE ", "  x  ")).toBe("  x  ");
	});

	/**
	 * Minify with a renderer, recording the bodies it was offered.
	 * @param {string} html input markup
	 * @returns {{ code: string, offered: string[] }} the output and each body offered
	 */
	const withRenderer = (html) => {
		/** @type {string[]} */
		const offered = [];
		const { code } = new SourceProcessor().process(html, {
			mode: /** @type {"minify"} */ ("minify"),
			renderEmbeddedSource: (/** @type {string} */ source) => {
				offered.push(source);
				return "rendered";
			}
		});
		return { code, offered };
	};

	it("offers the body of a script whose type is spelled with a reference", () => {
		// Chrome runs this one, so it is program text and not a data block.
		const { code, offered } = withRenderer(
			fixture("html", "source-processor-inline-script-type-offers-the-body-of-a-script-whose-type-is")
		);

		expect(offered).toEqual(["var a = 1"]);
		expect(code).toBe("<script type=text/javascript>rendered</script>");
	});

	it("offers no data block whose type is spelled with a reference", () => {
		const { code, offered } = withRenderer(
			fixture("html", "source-processor-inline-script-type-offers-no-data-block-whose-type-is-spelled")
		);

		expect(offered).toEqual([]);
		expect(code).toBe("<script type=text/x-template>  x  </script>");
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
		["absent drops every inert comment", undefined, "<div></div>"],
		[
			'"some" drops them too, HTML having no banner rule',
			"some",
			"<div></div>"
		],
		["false drops them", false, "<div></div>"],
		["true keeps every comment", true, html],
		['"all" keeps every comment', "all", html],
		["a string is read as a pattern", "@license", licensed],
		["a RegExp keeps what it matches", /^\s*@license/, licensed],
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

	// A conditional comment, a server-side include and a `<?…?>` directive are
	// code rather than comments, so no level drops one.
	it.each([
		[
			"a conditional comment",
			fixture("html", "source-processor-which-comments-survive-keeps-a-conditional-comment-whatever-the"),
			"[if IE]"
		],
		["a server-side include", fixture("html", "source-processor-which-comments-survive-keeps-a-server-side-include-whatever-the"), "#include"],
		["a template directive", fixture("html", "source-processor-which-comments-survive-keeps-a-template-directive-whatever-the"), "php"]
	])("keeps %s whatever the level", (_name, input, held) => {
		for (const comments of [false, "some", "nothing-matches"]) {
			expect(minify(input, /** @type {EXPECTED_ANY} */ (comments))).toContain(
				held
			);
		}
	});
});

describe("SourceProcessor — enumerated attribute values", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const { ENUMERATED_KEYWORDS } = require("../../../lib/html/data");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

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

	it("folds every keyword of every entry, and nothing else", () => {
		for (const [element, attributes] of Object.entries(ENUMERATED_KEYWORDS)) {
			// A global entry is exercised on a `<div>`, which owns none of its own.
			const tag = element === "*" ? "div" : element;
			// A cell outside a table is dropped by tree construction, so it needs
			// somewhere to live before its attributes can be read back.
			const open = tag === "td" || tag === "th" ? "<table><tr>" : "";
			for (const [attribute, keywords] of Object.entries(attributes)) {
				for (const keyword of keywords) {
					const shouted = keyword.toUpperCase();
					// Skip a keyword with no letters to shout — folding is a no-op.
					if (shouted === keyword) continue;
					const out = minify(`${open}<${tag} ${attribute}="${shouted}">`);
					expect(`${element} ${attribute}=${shouted} -> ${out}`).toBe(
						`${element} ${attribute}=${shouted} -> ${minify(
							`${open}<${tag} ${attribute}="${keyword}">`
						)}`
					);
				}
				// A value the spec does not enumerate keeps its case exactly.
				expect(minify(`${open}<${tag} ${attribute}="ZzCustomZz">`)).toContain(
					"ZzCustomZz"
				);
			}
		}
	});

	it("leaves a case-sensitive value alone", () => {
		// `<ol type>` is two keywords that differ only in case, so it is not in
		// the table at all; `id` / `class` are not enumerated.
		expect(minify(fixture("html", "source-processor-enumerated-attribute-values-leaves-a-case-sensitive-value-alone"))).toContain("type=A");
		expect(minify(fixture("html", "source-processor-enumerated-attribute-values-leaves-a-case-sensitive-value-alone-2"))).toContain(
			"id=MyId class=MyClass"
		);
	});

	it("leaves a keyword the engine reflects verbatim alone", () => {
		// `target` / `formtarget`, `<area shape>` and `<textarea wrap>` are
		// enumerated, but their IDL members reflect what was written rather than
		// the canonical keyword, so a script reading one back would see the fold.
		expect(minify(fixture("html", "source-processor-enumerated-attribute-values-leaves-a-keyword-the-engine"))).toContain("target=_TOP");
		expect(minify(fixture("html", "source-processor-enumerated-attribute-values-leaves-a-keyword-the-engine-2"))).toContain("target=_BLANK");
		expect(minify(fixture("html", "source-processor-enumerated-attribute-values-leaves-a-keyword-the-engine-3"))).toContain(
			"formtarget=_SELF"
		);
		expect(minify(fixture("html", "source-processor-enumerated-attribute-values-leaves-a-keyword-the-engine-4"))).toContain("shape=RECT");
		expect(minify(fixture("html", "source-processor-enumerated-attribute-values-leaves-a-keyword-the-engine-5"))).toContain("wrap=SOFT");
	});
});

describe("SourceProcessor — an enumerated value naming no keyword", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const {
		ENUMERATED_KEYWORDS,
		INVALID_VALUE_DEFAULT_DIFFERS,
		REDUNDANT_DEFAULT_ATTRIBUTES
	} = require("../../../lib/html/data");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization, spec defaults dropped
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			removeRedundantAttributes: "all"
		}).code;

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

	it.each(PAIRS)(
		"drops it on <%s %s> unless the two defaults part",
		(element, attribute) => {
			// A track outside a media element is dropped by tree construction.
			const open = element === "track" ? "<video>" : "";
			const out = minify(`${open}<${element} ${attribute}="ZzCustomZz">`);
			if (INVALID_VALUE_DEFAULT_DIFFERS.has(`${element} ${attribute}`)) {
				expect(out).toContain(`${attribute}=ZzCustomZz`);
			} else {
				expect(out).not.toContain(attribute);
			}
		}
	);

	it("keeps one the element states no default for", () => {
		// `<img decoding>` is enumerated but has no entry to fall to, and
		// `<area shape>` has one but reflects whatever was written.
		expect(minify(fixture("html", "source-processor-an-enumerated-value-naming-no-keyword-keeps-one-the-element"))).toContain(
			"decoding=ZzCustomZz"
		);
		expect(minify(fixture("html", "source-processor-an-enumerated-value-naming-no-keyword-keeps-one-the-element-2"))).toContain(
			"shape=ZzCustomZz"
		);
	});

	it("keeps it where the switch is not `all`", () => {
		const out = new SourceProcessor().process(fixture("html", "source-processor-enumerated-attribute-values-folds-every-keyword-of-every-entry-269"), {
			mode: "minify",
			removeRedundantAttributes: "smart"
		}).code;
		expect(out).toContain("type=ZzCustomZz");
	});
});

describe("SourceProcessor — removeRedundantAttributes and script charset", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			removeRedundantAttributes: "smart"
		}).code;

	const SCRIPT = '<script charset="utf-8" src="a.js"></script>';

	it("drops it on a page that declares UTF-8", () => {
		for (const head of [
			'<meta charset="utf-8">',
			"<meta charset=UTF8>",
			'<meta http-equiv="Content-Type" content="text/html; charset=utf-8">'
		]) {
			expect(
				minify(`<!doctype html><head>${head}<title>t</title>${SCRIPT}`)
			).toContain("<script src=a.js></script>");
		}
		expect(minify(`\uFEFF<!doctype html><title>t</title>${SCRIPT}`)).toContain(
			"<script src=a.js></script>"
		);
		// The limit is in bytes: 400 `é` and 200 emoji are 800 bytes each, so
		// both leave the `<meta>` inside it.
		for (const title of ["é".repeat(400), "\u{1F600}".repeat(200)]) {
			expect(
				minify(
					`<!doctype html><title>${title}</title><meta charset="utf-8">${SCRIPT}`
				)
			).toContain("<script src=a.js></script>");
		}
	});

	it("keeps it where the encoding of the page is not declared as UTF-8", () => {
		for (const html of [
			`<!doctype html><title>t</title>${SCRIPT}`,
			`<!doctype html><head><meta charset="gbk"><title>t</title>${SCRIPT}`,
			`<!doctype html><!-- <meta charset="utf-8"> --><title>t</title>${SCRIPT}`,
			`<!doctype html><title>t</title><style>${"a{}".repeat(400)}</style><meta charset="utf-8">${SCRIPT}`,
			`<!doctype html><title>${"价".repeat(400)}</title><meta charset="utf-8">${SCRIPT}`,
			SCRIPT
		]) {
			expect(minify(html)).toContain(
				'<script charset=utf-8 src=a.js></script>'
			);
		}
	});

	it("keeps a charset naming another encoding", () => {
		expect(
			minify(
				'<!doctype html><meta charset="utf-8"><script charset="gbk" src="a.js"></script>'
			)
		).toContain("<script charset=gbk src=a.js></script>");
	});
});

describe("SourceProcessor — removeImpliedTags", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	const PAGE =
		fixture("html", "source-processor-remove-implied-tags-leaves-out-only-the-html-start-tag-by");

	/**
	 * @param {(boolean | "smart" | "all")=} removeImpliedTags the mode
	 * @returns {string} the minified serialization
	 */
	const minify = (removeImpliedTags) =>
		new SourceProcessor().process(PAGE, { mode: "minify", removeImpliedTags })
			.code;

	it("materializes an implied tag whose content opens with a comment", () => {
		// A comment there goes further out than a head element does: the modes put
		// it in the element above the body, so it leaves the body altogether.
		expect(
			new SourceProcessor().process(fixture("html", "source-processor-remove-implied-tags-materializes-an-implied-tag-whose-content-2"), {
				mode: "minify",
				removeImpliedTags: true,
				transforms: { comments: /c/ }
			}).code
		).toBe("<body><!--c--><p>x");
	});

});

describe("SourceProcessor — the per-transform switches", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {import("../../../lib/html/syntax-parser").HtmlTransformOptions=} transforms which rewrites to make
	 * @returns {string} the minified serialization
	 */
	const minify = (html, transforms) =>
		new SourceProcessor().process(html, { mode: "minify", transforms }).code;

	// A table group the parser inserted has an end tag to print once the switch
	// is off, so its start tag has to print with it — the pair, or neither.
	it.each([
		[fixture("html", "source-processor-the-per-transform-switches-keeps-a-parser-inserted-table-group-5"), fixture("html", "source-processor-attribute-quote-spelling-leaves-an-implied-tag-out-on-the-first-4")],
		[fixture("html", "source-processor-the-per-transform-switches-keeps-a-parser-inserted-table-group"), fixture("html", "source-processor-the-per-transform-switches-keeps-a-parser-inserted-table-group")],
		[
			fixture("html", "source-processor-the-per-transform-switches-keeps-a-parser-inserted-table-group-4"),
			fixture("html", "source-processor-attribute-quote-spelling-leaves-an-implied-tag-out-on-the-first-4")
		],
		[fixture("html", "source-processor-the-per-transform-switches-keeps-a-parser-inserted-table-group-2"), fixture("html", "source-processor-the-per-transform-switches-keeps-a-parser-inserted-table-group")],
		// §4.13: the second group's start tag has to stay once the first has lost
		// its end tag, or its columns would join the group before it.
		[
			fixture("html", "source-processor-the-per-transform-switches-keeps-a-parser-inserted-table-group-3"),
			"<table><col><colgroup><col></table>"
		]
	])("keeps a parser-inserted table group balanced: %s", (doc, on) => {
		const off = new SourceProcessor().process(doc, {
			mode: "minify",
			transforms: { removeOptionalTags: false }
		}).code;
		for (const name of ["tbody", "colgroup"]) {
			expect(off.includes(`<${name}>`)).toBe(off.includes(`</${name}>`));
		}
	});

});

describe("SourceProcessor — attribute quote spelling", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html a document
	 * @returns {string} its minified form
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	it("reads a style type by what it decodes to", () => {
		// The same rule `_scriptType` follows: the value the spec matches is the
		// one the parser read, so a `type` spelled with references still names CSS.
		const css = (/** @type {string} */ html) =>
			new SourceProcessor().process(html, {
				mode: "minify",
				renderEmbeddedSource: builtinEmbeddedRenderer()
			}).code;
		const spelled = "&#x74;&#x65;&#x78;&#x74;&#x2f;&#x63;&#x73;&#x73;";
		expect(css(`<style type="${spelled}">.a {  color : red ; }</style>`)).toBe(
			"<style type=text/css>.a{color:red}</style>"
		);
		// A type that names something else is still left alone.
		expect(css(fixture("html", "source-processor-attribute-quote-spelling-reads-a-style-type-by-what-it-decodes-2"))).toBe(
			"<style type=text/foo>.a {  color : red ; }</style>"
		);
	});

	it("merges across an attribute the print drops", () => {
		const once = (
			/** @type {string} */ html,
			/** @type {EXPECTED_ANY} */ opts = undefined
		) => new SourceProcessor().process(html, { mode: "minify", ...opts }).code;
		const drops = { removeRedundantAttributes: /** @type {"all"} */ ("all") };
		// One it keeps is still a difference.
		expect(
			once(
				fixture("html", "source-processor-attribute-quote-spelling-merges-across-an-attribute-the-print-3"),
				{
					...drops,
					mergeStyles: true
				}
			)
		).toContain("</style><style>");
		expect(
			once(fixture("html", "source-processor-attribute-quote-spelling-merges-across-an-attribute-the-print-4"), {
				...drops,
				mergeScripts: true
			})
		).toContain("</script><script>");
	});

	it("rewrites a referenced value with the quoting switch off", () => {
		// The switch freezes the quoting, not the value: a rewrite that changes
		// what the value says leaves the source spelling of it unusable.
		const frozen = (/** @type {string} */ html) =>
			new SourceProcessor().process(html, {
				mode: "minify",
				transforms: { normalizeAttributeQuotes: false }
			}).code;
		expect(frozen(fixture("html", "source-processor-attribute-quote-spelling-rewrites-a-referenced-value-with-the"))).toContain('href="/a"');
		expect(frozen(fixture("html", "source-processor-attribute-quote-spelling-rewrites-a-referenced-value-with-the-2"))).toContain(
			'type="text"'
		);
		// The `&` a decoded URL holds is written out bare: `y=` is no reference,
		// and an attribute would not read one there even if it were.
		expect(frozen(fixture("html", "source-processor-attribute-quote-spelling-rewrites-a-referenced-value-with-the-3"))).toContain(
			'href="/a?x=1&y=2"'
		);
	});

});

describe("SourceProcessor — a duplicate attribute name", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	it("preserves case-sensitive template names", () => {
		for (const condition of ["isRequired", "Foo", "options.isRequired"]) {
			const printed = minify(
				`<input type="text"{% if ${condition} %} required{% endif %}>`
			);
			const match = /\{% if ([^ ]+) %\}/.exec(printed);
			expect(match && match[1]).toBe(condition);
		}
	});

	it("preserves source attribute names on a template tag", () => {
		expect(
			minify(fixture("html", "source-processor-a-duplicate-attribute-name-preserves-source-attribute-names-on"))
		).toMatchSnapshot();
	});

});

describe("SourceProcessor — token list values", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	it("collapses the separators of every list", () => {
		expect(minify(fixture("html", "source-processor-token-list-values-collapses-the-separators-of-every-list"))).toContain('class="a b"');
		expect(minify(fixture("html", "source-processor-token-list-values-collapses-the-separators-of-every-list-2"))).toContain(
			'ping="/p1 /p2"'
		);
	});

	it("trims a list whose separators are otherwise already collapsed", () => {
		// Padding at either end is all the rewriting these need — the scan that
		// decides whether a list is already collapsed has to see it.
		expect(minify(fixture("html", "source-processor-token-list-values-trims-a-list-whose-separators-are-otherwise"))).toContain('class="a b"');
		expect(minify(fixture("html", "source-processor-token-list-values-trims-a-list-whose-separators-are-otherwise-2"))).toContain('class="a b"');
		expect(minify(fixture("html", "source-processor-token-list-values-trims-a-list-whose-separators-are-otherwise-3"))).toContain("class=ab");
	});

	it("drops a repeated token only where the DOM folds it away", () => {
		// `class` / `rel` reflect a `DOMTokenList`, which is an ordered set.
		expect(minify(fixture("html", "source-processor-token-list-values-drops-a-repeated-token-only-where-the-dom"))).toContain('class="a b"');
		expect(minify(fixture("html", "source-processor-token-list-values-drops-a-repeated-token-only-where-the-dom-2"))).toContain(
			"rel=preload"
		);
		// `ping` is read back as written and sends one request per token; the
		// other two reflect no token list either.
		expect(minify(fixture("html", "source-processor-token-list-values-drops-a-repeated-token-only-where-the-dom-3"))).toContain('ping="/p /p"');
		expect(minify(fixture("html", "source-processor-token-list-values-drops-a-repeated-token-only-where-the-dom-4"))).toContain(
			'headers="h h"'
		);
		expect(minify(fixture("html", "source-processor-token-list-values-drops-a-repeated-token-only-where-the-dom-5"))).toContain('accesskey="k k"');
	});

	it("reads a list holding a foreign delimiter as text, not as a set", () => {
		// A `{% … %}` statement tokenizes as list tokens, so folding the repeated
		// `%}` away would lose a delimiter the template needs.
		for (const list of [
			'class="btn{% if active %} btn-active{% endif %}"',
			'class="a {{ if x }} a {{ endif }}"',
			'rel="preload {{extra}} preload {{extra}}"'
		]) {
			expect(minify(`<link ${list} href=x>`)).toContain(list);
		}
		// The separators between them still collapse: that keeps every token.
		expect(minify(fixture("html", "source-processor-token-list-values-reads-a-list-holding-a-foreign-delimiter-as-4"))).toContain(
			'class="btn{% if x %}"'
		);
	});
});

describe("SourceProcessor — sortAttributes / sortTokenLists", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {object=} options extra print options
	 * @returns {string} the minified serialization
	 */
	const minify = (html, options) =>
		new SourceProcessor().process(html, { mode: "minify", ...options }).code;

	// `serializeHtmlTree` sorts attributes, so attribute order cannot hide in it;
	// `class` is a set the option reorders on purpose, so sort it here too.
	/**
	 * @param {string} html markup
	 * @returns {string} its DOM, spelled so neither order can show through
	 */
	const canonical = (html) =>
		serializeHtmlTree(parseHtmlRefs(html)).replace(
			/^(\|\s*class=")([^"]*)(")$/gm,
			(_m, open, value, close) =>
				open + value.split(" ").sort().join(" ") + close
		);

	// Attribute and class order vary per element: that is the repetition the
	// options exist to create.
	const PAGE = `<!doctype html><html lang=en><head><meta charset=utf-8><title>t</title></head><body>${[
		'<div class="c b a" data-z="1" id="n1" hidden>',
		'<div id="n2" hidden class="a c b" data-z="1">',
		'<div data-z="1" class="b c a" hidden id="n3">'
	].join(
		"<span class=x>t</span></div>"
	)}<span class=x>t</span></div><svg viewBox="0 0 1 1"><rect zz="1" aa="2"/></svg><table><tr><td colspan=2>c</table><a href="/x" ping="/p1 /p2">l</a></body></html>`;

	it("ranks on the attributes that reach the output, not the dropped ones", () => {
		// `<input type=text>` is redundant and goes, so counting it would rank
		// `type` above `checked` on the first pass and tie them on the second.
		const options = { removeRedundantAttributes: "all", sortAttributes: true };
		const once = minify(
			fixture("html", "source-processor-sort-attributes-sort-token-lists-ranks-on-the-attributes-that"),
			options
		);
		expect(once).toBe("<input><input checked type=checkbox>");
	});

	it("leaves foreign content alone, where a name is not case-folded", () => {
		expect(
			minify(fixture("html", "source-processor-sort-attributes-sort-token-lists-leaves-foreign-content-alone"), { sortAttributes: true })
		).toContain("zz=1 aa=2");
	});

	it("keeps the DOM identical, whichever is on", () => {
		const expected = canonical(minify(PAGE));
		// A check against an empty serialization would pass no matter what.
		expect(expected.split("\n").length).toBeGreaterThan(20);
		for (const options of [
			{ sortAttributes: true },
			{ sortTokenLists: true },
			{ sortAttributes: true, sortTokenLists: true }
		]) {
			expect(canonical(minify(PAGE, options))).toBe(expected);
		}
	});

	it("reorders rather than rewrites: the byte count is unchanged", () => {
		const base = minify(PAGE);
		for (const options of [
			{ sortAttributes: true },
			{ sortTokenLists: true },
			{ sortAttributes: true, sortTokenLists: true }
		]) {
			expect(minify(PAGE, options)).toHaveLength(base.length);
		}
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

	/**
	 * @param {string} html input markup
	 * @returns {[string, string, string][]} each body offered, as `[type, as, source]`
	 */
	const offered = (html) => {
		/** @type {[string, string, string][]} */
		const seen = [];
		minify(html, (source, info) => {
			seen.push([info.type, info.as || "stylesheet", source]);
			return source;
		});
		return seen;
	};

	/**
	 * Print with a renderer that answers asynchronously, as a caller reaching a
	 * worker pool does.
	 * @param {string} html input markup
	 * @param {(source: string, type: string) => string | undefined} answer what the renderer makes of one body
	 * @returns {Promise<{ code: string, offered: [string, string, string][] }>} the output and each body offered
	 */
	const deferred = async (html, answer) => {
		/** @type {[string, string, string][]} */
		const offered = [];
		const { code } = await new SourceProcessor().processAsync(html, {
			mode: "minify",
			renderEmbeddedSource: (
				/** @type {string} */ source,
				/** @type {import("../../../lib/html/syntax-parser").DeferredEmbeddedSource} */ hole
			) => {
				offered.push([hole.type, hole.as || "stylesheet", source]);
				return Promise.resolve(answer(source, hole.type));
			}
		});

		return { code, offered };
	};

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

	it("writes a `srcdoc` answered empty as the bare name, on either path", async () => {
		// `srcdoc=""` is what a second pass reads as the bare name, so the first
		// writes that rather than leaving the second to.
		const html = fixture("html", "source-processor-render-embedded-source-keeps-srcdoc-off-the-deferred-path-when");
		const empty = (
			/** @type {string} */ _source,
			/** @type {{ type: string }} */ info
		) => (info.type === "html" ? "" : undefined);
		const now = new SourceProcessor().process(html, {
			mode: "minify",
			renderEmbeddedSource: empty
		});
		const later = await new SourceProcessor().processAsync(html, {
			mode: "minify",
			renderEmbeddedSource: async (source, hole) => empty(source, hole)
		});

		expect(now.code).toBe("<iframe srcdoc></iframe>");
		expect(later.code).toBe(now.code);
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

	it("joins sheets on their sources, where no answer can leave one open", async () => {
		// Were answers joined, this one's open string would take in the next sheet;
		// sources ending at a rule are joined first and the run is asked for once.
		const html = fixture("html", "source-processor-render-embedded-source-joins-sheets-on-their-sources-where-no");
		const open = (/** @type {string} */ source) =>
			source === "a{b:c}" ? 'a{b:"c' : source;
		const options = {
			mode: /** @type {"minify"} */ ("minify"),
			mergeStyles: true
		};
		const now = new SourceProcessor().process(html, {
			...options,
			renderEmbeddedSource: open
		});
		const later = await new SourceProcessor().processAsync(html, {
			...options,
			renderEmbeddedSource: async (source) => open(source)
		});

		expect(now.code).toBe("<style>a{b:c}d{e:f}</style>");
		expect(later.code).toBe(now.code);
	});

	it("leaves a NUL the source carried where it stands", async () => {
		// An RCDATA element and an attribute value keep the NUL they were written
		// with, so one reaches printed output — where a write's marker also stands.
		const nul = String.fromCharCode(0);
		const { code, offered } = await deferred(
			`<textarea>raw${nul}text</textarea><p title="a${nul}b" style="color: red">x`,
			() => "color:blue"
		);

		expect(offered).toEqual([["css", "block-contents", "color: red"]]);
		expect(code).toBe(
			`<textarea>raw${nul}text</textarea><p title=a${nul}b style=color:blue>x`
		);
	});

	it("leaves a NUL run spelling a write's own marker alone", async () => {
		// The source carries exactly what a marker looks like. The infix is chosen
		// to occur nowhere in the input, so this spells no write of ours.
		const nul = String.fromCharCode(0);
		const { code } = await deferred(
			`<textarea>${nul}0:0${nul}${nul}0${nul}</textarea><p style="color: red">x`,
			() => "color:blue"
		);

		expect(code).toBe(
			`<textarea>${nul}0:0${nul}${nul}0${nul}</textarea><p style=color:blue>x`
		);
	});

	it("offers a `style` attribute to a deferring caller, and keeps it as written when declined", async () => {
		const declined = await deferred(
			fixture("html", "source-processor-render-embedded-source-offers-a-style-attribute-to-a-deferring"),
			() => undefined
		);

		expect(declined.offered).toEqual([
			// Still CSS — `as` says which production, the same word
			// `module.parser.css.as` uses.
			["css", "block-contents", "  color : #ff0000 ; margin : 0px  "]
		]);
		// Nothing answered and the printer minifies no CSS itself — byte for byte
		// what a run with no renderer at all writes.
		expect(declined.code).toBe(
			'<p style="  color : #ff0000 ; margin : 0px  ">x'
		);
		expect(declined.code).toBe(
			minify(fixture("html", "source-processor-render-embedded-source-offers-a-style-attribute-to-a-deferring"))
		);
		// Webpack's own renderer, put behind a declining one, is what answers.
		expect(
			minify(
				fixture("html", "source-processor-render-embedded-source-offers-a-style-attribute-to-a-deferring"),
				builtinEmbeddedRenderer()
			)
		).toBe("<p style=color:red;margin:0>x");
	});

	it("writes a deferred `style` attribute back in whatever shape its answer needs", async () => {
		expect(
			(await deferred(fixture("html", "source-processor-render-embedded-source-writes-a-deferred-style-attribute-back"), () => "color:red"))
				.code
		).toBe("<p style=color:red>x");
		// Only a foreign element's `/>` reads whether a value left the tag ending
		// unquoted, so on an html element an answer needing quotes is taken.
		expect(
			(
				await deferred(
					fixture("html", "source-processor-render-embedded-source-writes-a-deferred-style-attribute-back"),
					() => 'content:"a b"'
				)
			).code
		).toBe("<p style='content:\"a b\"'>x");
	});

	it("gives a `style` attribute the transforms a block's contents get", () => {
		// Webpack's own renderer composes a block-contents list the way the CSS
		// printer composes a rule's block: longhands merge into their shorthand.
		const own = builtinEmbeddedRenderer();
		expect(minify(fixture("html", "source-processor-render-embedded-source-gives-a-style-attribute-the-transforms-a"), own)).toBe(
			"<p style=inset:0>x"
		);
		expect(
			minify(
				fixture("html", "source-processor-render-embedded-source-gives-a-style-attribute-the-transforms-a-2"),
				own
			)
		).toBe("<p style=margin:1px>x");
		// Foreign content is the same declaration list.
		expect(
			minify(
				fixture("html", "source-processor-render-embedded-source-gives-a-style-attribute-the-transforms-a-3"),
				own
			)
		).toBe("<svg><rect style=padding:0 /></svg>");
		// Nothing opened a block, so a `}` closes none: it is a parse error whose
		// bad declaration runs to the next `;` — two properties, so both survive it.
		expect(minify(fixture("html", "source-processor-render-embedded-source-gives-a-style-attribute-the-transforms-a-4"), own)).toBe(
			"<p style=color:red;background:blue>x"
		);
		// No `;` after it, so the bad declaration runs to the end.
		expect(
			minify(fixture("html", "source-processor-render-embedded-source-gives-a-style-attribute-the-transforms-a-5"), own)
		).toBe("<p style=background:red>x");
		// Inside a value it is a token like any other, leaving a declaration a
		// browser drops — so it is handed back exactly as written.
		expect(
			minify(fixture("html", "source-processor-render-embedded-source-gives-a-style-attribute-the-transforms-a-6"), own)
		).toBe("<p style=background:red};background:blue>x");
	});

	it("minifies and offers a `style` attribute carrying character references", () => {
		// `&quot;` is a quote to CSS, not an entity, so the list is minified from the
		// decoded text and spelled back from there — a reference the source only
		// needed for its own delimiter does not survive as one.
		const html = fixture("html", "source-processor-render-embedded-source-minifies-and-offers-a-style-attribute");

		expect(offered(html)).toEqual([
			["css", "block-contents", 'content: "x" ; color : red']
		]);
		const own = builtinEmbeddedRenderer();
		expect(minify(html, own)).toBe("<p style='content:\"x\";color:red'>y");
		// Foreign content too: SVG and MathML `style` is the same declaration list.
		expect(minify(fixture("html", "source-processor-render-embedded-source-minifies-and-offers-a-style-attribute-2"), own)).toBe(
			"<svg><rect style='fill:\"a\"'/></svg>"
		);
	});

	it("offers an inline `<style>`, a `style` attribute and a `<script>`", () => {
		expect(
			offered(
				fixture("html", "source-processor-render-embedded-source-offers-an-inline-style-a-style-attribute")
			)
		).toEqual([
			// The attribute is CSS too — `as` is what says it is a block's contents
			// rather than a stylesheet.
			["css", "block-contents", "color : red"],
			["css", "stylesheet", ".a { color : red }"],
			["javascript", "script", "var a = 1"]
		]);
	});

	it("offers a classic script as the production it is", () => {
		// Every classic spelling is the same production, and the value is matched
		// the way the parser matched it — trimmed, and ASCII case-insensitively.
		expect(offered(fixture("html", "source-processor-render-embedded-source-offers-a-classic-script-as-the"))).toEqual([
			["javascript", "script", "var a = 1"]
		]);
		expect(
			offered(fixture("html", "source-processor-inline-script-type-drops-a-redundant-type-spelled-with-a"))
		).toEqual([["javascript", "script", "var a = 1"]]);
		expect(
			offered(fixture("html", "source-processor-render-embedded-source-offers-a-classic-script-as-the-2"))
		).toEqual([["javascript", "script", "var a = 1"]]);
	});

	it("offers a module script as the module production", () => {
		// The goal symbol is not readable off the body: this one parses under
		// both, and only the element says which it is.
		expect(offered(fixture("html", "source-processor-render-embedded-source-offers-a-module-script-as-the-module"))).toEqual([
			["javascript", "module", "var a = 1"]
		]);
		expect(offered(fixture("html", "source-processor-render-embedded-source-offers-a-module-script-as-the-module-2"))).toEqual([
			["javascript", "module", 'import "x"']
		]);
	});

	it("offers a run of both, each under its own production", () => {
		expect(
			offered(
				fixture("html", "source-processor-render-embedded-source-offers-a-run-of-both-each-under-its-own")
			)
		).toEqual([
			["javascript", "script", "a()"],
			["javascript", "module", 'import "x"'],
			["javascript", "script", "b()"]
		]);
	});

	it("carries the production onto the deferred path", async () => {
		const { code, offered: holes } = await deferred(
			fixture("html", "source-processor-render-embedded-source-carries-the-production-onto-the-deferred"),
			() => undefined
		);

		expect(holes).toEqual([
			["javascript", "script", "a()"],
			["javascript", "module", 'import "x"']
		]);
		expect(code).toBe(
			'<script>a()</script><script type=module>import "x"</script>'
		);
	});

	// Stands in for a JS minifier: comments and whitespace out, everything else
	// as written.
	const squeeze = (/** @type {string} */ source) =>
		source
			.replace(/\/\/[^\n]*/g, "")
			.replace(/\s+/g, " ")
			.replace(/\s*([(){};,])\s*/g, "$1")
			.trim();

	it("offers an event handler attribute and writes the answer back", () => {
		const html = fixture("html", "source-processor-render-embedded-source-offers-an-event-handler-attribute-and");

		// `as` says which production of JavaScript the value is, the way a
		// `style=""` is offered as the block contents it is rather than a sheet.
		expect(offered(html)).toEqual([
			["javascript", "event-handler", "  foo( 1 , 2 )  "]
		]);
		expect(minify(html, squeeze)).toBe("<button onclick=foo(1,2)>x</button>");
	});

	it("offers a handler whose top level is a `return`", () => {
		// A handler body is a function body, where the `return` cancelling an
		// event lives — which is why `as` is on the offer: no script holds one.
		const html = fixture("html", "source-processor-render-embedded-source-offers-a-handler-whose-top-level-is-a");

		expect(offered(html)).toEqual([
			["javascript", "event-handler", "return  false"]
		]);
		expect(minify(html, () => "return!1")).toBe(
			"<form onsubmit=return!1><input></form>"
		);
	});

	it("offers a handler no JavaScript production could hold", () => {
		// The printer reads none of it: what parses is the renderer's business,
		// exactly as it is for an inline `<script>`.
		expect(offered(fixture("html", "source-processor-render-embedded-source-offers-a-handler-no-java-script"))).toEqual([
			["javascript", "event-handler", "var = broken("]
		]);
	});

	it("offers a handler only where the name is one on that element", () => {
		// `onunload` is a handler on `<body>` and text a script may read anywhere
		// else, so only one of these two holds JavaScript.
		expect(offered(fixture("html", "source-processor-render-embedded-source-offers-a-handler-only-where-the-name-is"))).toEqual([]);
		expect(offered(fixture("html", "source-processor-render-embedded-source-offers-a-handler-only-where-the-name-is-2"))).toEqual([
			["javascript", "event-handler", "a( 1 )"]
		]);
		// Foreign content carries the global ones too.
		expect(offered(fixture("html", "source-processor-render-embedded-source-offers-a-handler-only-where-the-name-is-3"))[0]).toEqual([
			"javascript",
			"event-handler",
			"f( 1 )"
		]);
	});

	it("never offers an empty handler", () => {
		// A reference spelling whitespace stays as written, so nothing is offered
		// for it either — writing it out would make the attribute read as empty.
		expect(
			offered(fixture("html", "source-processor-render-embedded-source-never-offers-an-empty-handler"))
		).toEqual([]);
	});

	it("keeps a minified handler through the print's own re-parse", () => {
		// The adoption agency makes this print verify itself by re-parsing, which
		// reads a renderer's answer as a value the print got wrong unless told.
		expect(minify(fixture("html", "source-processor-render-embedded-source-keeps-a-minified-handler-through-the"), squeeze)).toBe(
			'<p>1<b>2<i onclick=f(1)>3</i></b><i onclick="f( 1 )">4</i>5'
		);
	});

	it("offers every handler the document holds", () => {
		expect(
			offered(fixture("html", "source-processor-render-embedded-source-offers-every-handler-the-document-holds"))
		).toEqual([
			["javascript", "event-handler", "f( 1 )"],
			["javascript", "event-handler", "f( 1 )"]
		]);
	});

	it("offers a handler carrying character references decoded", () => {
		// `&amp;&amp;` is an operator to JavaScript rather than an entity, and the
		// answer is escaped back for the value it lands in.
		const html = fixture("html", "source-processor-render-embedded-source-offers-a-handler-carrying-character");

		expect(offered(html)).toEqual([
			["javascript", "event-handler", "a&&b( 1 )"]
		]);
		expect(minify(html, squeeze)).toBe("<button onclick=a&&b(1)>x</button>");
	});

	it("quotes a handler answer that needs it", () => {
		expect(
			minify(fixture("html", "source-processor-render-embedded-source-quotes-a-handler-answer-that-needs-it"), squeeze)
		).toBe("<button onclick='f(\"a\")'>x</button>");
	});

	it("keeps a handler the renderer answered longer than the source", () => {
		// A minifier ends a statement it was handed without one, so the shortest
		// handlers come back a byte longer than they were written.
		expect(minify(fixture("html", "source-processor-render-embedded-source-keeps-a-handler-the-renderer-answered"), () => "x;")).toBe("<p onclick=x>a");
	});

	it("leaves a handler alone where the renderer declines it", () => {
		// Exactly what an untapped run writes, down to the quoting — and a renderer
		// answering with what it was handed spells the same thing.
		const html = fixture("html", "source-processor-render-embedded-source-leaves-a-handler-alone-where-the");
		const written = fixture("html", "source-processor-render-embedded-source-leaves-a-handler-alone-where-the");

		expect(minify(html, () => undefined)).toBe(minify(html));
		expect(minify(html, () => undefined)).toBe(written);
		expect(minify(html, (source) => source)).toBe(written);
	});

	it("answers a handler on a deferred print, `/>`-spelled tag included", async () => {
		expect(
			await deferred(fixture("html", "source-processor-render-embedded-source-offers-an-event-handler-attribute-and"), squeeze)
		).toEqual({
			code: "<button onclick=foo(1,2)>x</button>",
			offered: [["javascript", "event-handler", "  foo( 1 , 2 )  "]]
		});
		// A foreign `/>` reads back whether the last value ended unquoted, which an
		// answer that has not arrived cannot decide: the source's quoting stands.
		expect(
			(await deferred(fixture("html", "source-processor-render-embedded-source-offers-a-handler-only-where-the-name-is-3"), squeeze)).code
		).toBe('<svg><circle onclick="f(1)"/></svg>');
		// There the answer is written only where it is shorter than the source: the
		// quoting is already decided, so an equal one would only be a rewrite.
		expect(
			(await deferred(fixture("html", "source-processor-render-embedded-source-answers-a-handler-on-a-deferred-print"), squeeze)).code
		).toBe('<svg><circle onclick="f(1)"/></svg>');
	});

	// Stands in for a JSON minifier.
	const compactJson = (/** @type {string} */ source) =>
		JSON.stringify(JSON.parse(source));

	it("offers a URL attribute's `data:` payload as its media type's language", () => {
		const html =
			'<img src="data:image/svg+xml,<svg>  </svg>">' +
			'<iframe src="  data:text/html,<p>  a  </p>  "></iframe>' +
			fixture("html", "source-processor-render-embedded-source-answers-a-data-payload-on-a-deferred");

		expect(offered(html)).toEqual([
			["svg", "stylesheet", "<svg>  </svg>"],
			["html", "stylesheet", "<p>  a  </p>"],
			["json", "stylesheet", '{ "a" : 1 }']
		]);
		expect(
			minify(html, (source, { type }) =>
				type === "json" ? compactJson(source) : source.replace(/\s+/g, "")
			)
		).toBe(
			'<img src="data:image/svg+xml,<svg></svg>">' +
				'<iframe src="data:text/html,<p>a</p>"></iframe>' +
				"<object data='data:application/json,{\"a\":1}'></object>"
		);
	});

	it("offers a `data:` payload only where the attribute is a URL on that element", () => {
		// `title` holds text, and `href` is no URL on a `<div>`.
		expect(
			offered(
				"<p title='data:application/json,{ }'>a</p>" +
					"<div href='data:application/json,{ }'>b</div>"
			)
		).toEqual([]);
	});

	it("declines a `data:` payload it cannot read back as written", () => {
		// A media type naming no language, an empty payload, and a newline the
		// URL parser drops before anything reads it.
		expect(
			offered(
				'<img src="data:image/png;base64,AAAA">' +
					'<a href="data:application/json,">b</a>' +
					'<a href="data:application/json,{\n}">c</a>'
			)
		).toEqual([]);
	});

	it("offers a percent-escaped `data:` payload decoded, but not one a raw `#` cuts short", () => {
		const html =
			'<a href="data:application/json,%7B%20%22a%22%20:%201%20%7D">a</a>' +
			'<a href="data:application/json,{ &quot;b&quot; : &quot;#&quot; }">b</a>';

		expect(offered(html)).toEqual([["json", "stylesheet", '{ "a" : 1 }']]);
		// A browser loads only what precedes the `#`, so that URL stays as written.
		expect(minify(html, compactJson)).toBe(
			"<a href='data:application/json,{\"a\":1}'>a</a>" +
				'<a href=\'data:application/json,{ "b" : "#" }\'>b</a>'
		);
	});

	it("offers a `data:` payload decoded and escapes the answer back", () => {
		// `&quot;` is how the attribute spells a quote, not part of the JSON, and
		// what the rebuilt URL carries is escaped for the value it lands in.
		const html =
			fixture("html", "source-processor-render-embedded-source-offers-a-data-payload-decoded-and");

		expect(offered(html)).toEqual([["json", "stylesheet", '{ "a" : "\'" }']]);
		expect(minify(html, compactJson)).toBe(
			'<a href=\'data:application/json,{"a":"&#39;"}\'>x</a>'
		);
		// A `#` the answer brings is escaped, or it would start a fragment.
		expect(minify(html, () => '{"a":"#"}')).toBe(
			'<a href=\'data:application/json,{"a":"%23"}\'>x</a>'
		);
	});

	it("rebuilds a base64 `data:` payload as base64", () => {
		const payload = Buffer.from('{ "a" : 1 }').toString("base64");

		expect(
			minify(
				`<a href="data:application/json;base64,${payload}">x</a>`,
				compactJson
			)
		).toBe(
			`<a href="data:application/json;base64,${Buffer.from('{"a":1}').toString(
				"base64"
			)}">x</a>`
		);
	});

	it("keeps the parameters a `data:` URL was written with", () => {
		expect(
			minify(
				fixture("html", "source-processor-render-embedded-source-keeps-the-parameters-a-data-url-was"),
				compactJson
			)
		).toBe("<a href='data:application/json;charset=utf-8,{\"a\":1}'>x</a>");
	});

	it("keeps a `data:` URL the renderer declined or answered no shorter", () => {
		const html = fixture("html", "source-processor-render-embedded-source-keeps-a-data-url-the-renderer-declined");

		expect(minify(html, () => undefined)).toBe(minify(html));
		expect(minify(html, (source) => source)).toBe(minify(html));
		expect(minify(html, (source) => `${source}   `)).toBe(minify(html));
	});

	it("answers a `data:` payload on a deferred print", async () => {
		expect(
			await deferred(
				fixture("html", "source-processor-render-embedded-source-answers-a-data-payload-on-a-deferred"),
				compactJson
			)
		).toEqual({
			code: "<object data='data:application/json,{\"a\":1}'></object>",
			offered: [["json", "stylesheet", '{ "a" : 1 }']]
		});
		expect(
			(
				await deferred(
					"<svg><image href='data:application/json,{ }'/></svg>" +
						"<a href='data:application/json,{ }'>x</a>",
					() => undefined
				)
			).code
		).toBe(
			"<svg><image href='data:application/json,{ }'/></svg><a href='data:application/json,{ }'>x</a>"
		);
	});

	it("names html as the host of every body it offers", () => {
		const hosts = new Set();
		minify(fixture("html", "source-processor-render-embedded-source-names-html-as-the-host-of-every-body-it"), (s, i) => {
			hosts.add(i.hostType);
			return s;
		});
		expect([...hosts]).toEqual(["html"]);
	});

	it("offers every language `EMBEDDED_LANGUAGES` names, and prints each answer", () => {
		const { EMBEDDED_LANGUAGES } = require("../../../lib/html/syntax-parser");

		// One document reaching every offer site, an `<iframe srcdoc>` among them.
		const html =
			"<style>  .a { color : red }  </style>" +
			"<script>  var  a  =  1  </script>" +
			'<script type="application/json">  { "a" :  1 }  </script>' +
			fixture("html", "source-processor-render-embedded-source-writes-a-deferred-style-attribute-back") +
			'<svg viewBox="0 0 2 2">   <rect/>   </svg>' +
			'<iframe srcdoc="&lt;p&gt;   inner   &lt;/p&gt;"></iframe>';

		// Every entry needs a live offer site behind it, and nothing may arrive
		// that the list does not name.
		expect([...new Set(offered(html).map(([type]) => type))].sort()).toEqual(
			[...EMBEDDED_LANGUAGES].sort()
		);

		// Being offered a body is only half of minifying it.
		expect(minify(html, (source, { type }) => `/*${type}*/`)).toBe(
			"<style>/*css*/</style>" +
				"<script>/*javascript*/</script>" +
				"<script type=application/json>/*json*/</script>" +
				"<p style=/*css*/>x</p>" +
				"/*svg*/" +
				'<iframe srcdoc="/*html*/"></iframe>'
		);
	});

	it("offers a JSON `<script>` as json, by type and by `+json` subtype", () => {
		expect(
			offered(
				fixture("html", "source-processor-render-embedded-source-offers-a-json-script-as-json-by-type-and")
			)
		).toEqual([
			["json", "stylesheet", '{ "a": 1 }'],
			["json", "stylesheet", '{ "b": 2 }']
		]);
	});

	it("replaces the built-in CSS and JSON minifiers", () => {
		expect(
			minify(
				fixture("html", "source-processor-render-embedded-source-replaces-the-built-in-css-and-json"),
				(source) => source.toUpperCase()
			)
		).toBe(
			'<style>.A { COLOR : RED }</style><script type=application/json>{ "A" : 1 }</script>'
		);
	});

	it("declines a body the renderer returns unchanged", () => {
		const source = fixture("html", "source-processor-render-embedded-source-declines-a-body-the-renderer-returns");
		expect(minify(source, (s) => s)).toBe(source);
	});

	it("keeps the body when the renderer throws", () => {
		expect(
			minify(fixture("html", "source-processor-render-embedded-source-keeps-the-body-when-the-renderer-throws"), () => {
				throw new Error("nope");
			})
		).toBe("<style>.a{color:red}</style>");
	});

	it("writes a `style` attribute back as its renderer answered", () => {
		expect(
			minify(fixture("html", "source-processor-render-embedded-source-writes-a-style-attribute-back-as-its"), () => "color:red")
		).toBe("<p style=color:red>x");
		// Whatever it answers is quoted and escaped to stay one attribute, so a
		// renderer cannot spell its way out of the value.
		expect(
			minify(fixture("html", "source-processor-render-embedded-source-writes-a-style-attribute-back-as-its"), () => 'content:"a" b')
		).toBe("<p style='content:\"a\" b'>x");
	});

	it("never offers an empty body", () => {
		expect(
			offered(fixture("html", "source-processor-render-embedded-source-never-offers-an-empty-body"))
		).toEqual([]);
	});

	it("offers what an inline `<svg>` nests, its `style` attribute included", () => {
		// Foreign content: every other attribute there is adjusted or means
		// something else, but `style` is a declaration list exactly like HTML's.
		expect(
			offered(
				fixture("html", "source-processor-render-embedded-source-offers-what-an-inline-svg-nests-its")
			)
		).toEqual([
			["css", "stylesheet", ".s { fill : red }"],
			["css", "block-contents", "fill : red"],
			["javascript", "script", "var b = 2"],
			// The subtree comes last: children print before their parent, so it
			// carries whatever the renderer just made of them.
			[
				"svg",
				"foreign-element",
				fixture("html", "source-processor-render-embedded-source-offers-what-an-inline-svg-nests-its")
			]
		]);
	});

	it("offers each body exactly once, including on a `/>`-spelled tag", () => {
		// A tag the source spells `/>` is serialized twice — once by the streaming
		// walk, once by the printer — and a renderer must not see it twice.
		expect(
			offered(fixture("html", "source-processor-render-embedded-source-offers-each-body-exactly-once-including"))
		).toEqual([
			["css", "block-contents", "fill : red"],
			[
				"svg",
				"foreign-element",
				fixture("html", "source-processor-render-embedded-source-offers-each-body-exactly-once-including")
			]
		]);
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

	it("offers a self-closing `<svg>`", () => {
		expect(offered(fixture("html", "source-processor-render-embedded-source-offers-a-self-closing-svg"))).toEqual([["svg", "foreign-element", fixture("html", "source-processor-render-embedded-source-offers-a-self-closing-svg")]]);
	});

	it("keeps a map the renderer attached to an inline `<style>` / `<script>`", () => {
		// A `sourceMappingURL` in the body is the only map a browser honours for
		// inline content, so a renderer attaches its own and nothing composes it.
		const out = minify(
			fixture("html", "source-processor-render-embedded-source-keeps-a-map-the-renderer-attached-to-an"),
			(source, info) =>
				info.type === "css"
					? ".a{color:red}\n/*# sourceMappingURL=data:application/json;base64,e30= */"
					: info.type === "javascript"
					? "var a=1\n//# sourceMappingURL=data:application/json;base64,e30="
					: source
		);
		expect(out).toContain(
			"/*# sourceMappingURL=data:application/json;base64,e30= */</style>"
		);
		expect(out).toContain(
			"//# sourceMappingURL=data:application/json;base64,e30=</script>"
		);
	});

	it("quotes a `style` attribute the renderer put a comment in", () => {
		// There is no way to carry a map on an attribute, but whatever the renderer
		// answers is still written as one well-formed value.
		expect(
			minify(
				fixture("html", "source-processor-render-embedded-source-writes-a-style-attribute-back-as-its"),
				(s) => `${s}/*# sourceMappingURL=data:application/json;base64,e30= */`
			)
		).toBe(
			'<p style="  color : red ;  /*# sourceMappingURL=data:application/json;base64,e30= */">x'
		);
	});

	it("offers the document an `<iframe srcdoc>` holds, decoded", () => {
		expect(
			offered(fixture("html", "source-processor-render-embedded-source-offers-the-document-an-iframe-srcdoc"))
		).toEqual([["html", "srcdoc", "<p>   hello   </p>"]]);
		// Empty carries no document, and a foreign-content `<iframe>` is an SVG
		// element that happens to share the name.
		expect(offered(fixture("html", "source-processor-render-embedded-source-offers-the-document-an-iframe-srcdoc-2"))).toEqual([]);
		expect(
			offered(fixture("html", "source-processor-render-embedded-source-offers-the-document-an-iframe-srcdoc-3"))
		).toEqual([
			["svg", "foreign-element", '<svg><iframe srcdoc="<p>x</p>"/></svg>']
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

	it("does not offer a non-CSS `<style>` or a data-block `<script>`", () => {
		expect(
			offered(
				fixture("html", "source-processor-render-embedded-source-does-not-offer-a-non-css-style-or-a-data")
			)
		).toEqual([]);
	});

	it("quotes a bare `srcdoc` a synchronous renderer answered", () => {
		// An unquoted value carries no delimiter to keep, so the answer alone
		// decides one — and it needs quotes whatever it holds.
		expect(
			minify(fixture("html", "source-processor-render-embedded-source-quotes-a-bare-srcdoc-a-synchronous"), () => '<p a="b">')
		).toBe("<p><iframe srcdoc='<p a=\"b\">'></iframe>");
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

	it("shortens both the attribute and the element when the target reads it", () => {
		expect(minifyFor("chrome 62")).toBe(
			"<p style=color:#ff000080>x</p><style>.a{color:#ff000080}</style>"
		);
	});

	it("shortens neither when it does not", () => {
		expect(minifyFor("chrome 50")).toBe(
			"<p style=color:rgba(255,0,0,.5)>x</p><style>.a{color:rgba(255,0,0,.5)}</style>"
		);
	});

	it("does not carry one print's target into the next", () => {
		minifyFor("chrome 62");
		expect(minifyFor("chrome 50")).toBe(
			"<p style=color:rgba(255,0,0,.5)>x</p><style>.a{color:rgba(255,0,0,.5)}</style>"
		);
	});

	/**
	 * @param {string} html input markup
	 * @returns {string} the markup minified for a target `hwb()` needs a fallback for
	 */
	const minifyLegacy = (html) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			renderEmbeddedSource: builtinEmbeddedRenderer({
				environment: { browsers: ["chrome 100"] }
			})
		}).code;

	it("keeps a lowered list however the source spelled it", () => {
		const lowered = '<p style="background:#00c3ff;background:hwb(194 0% 0%)">x';
		expect(minifyLegacy(fixture("html", "source-processor-inline-css-honors-the-target-s-abilities-keeps-a-lowered-list"))).toBe(
			lowered
		);
		expect(minifyLegacy(fixture("html", "source-processor-inline-css-honors-the-target-s-abilities-keeps-a-lowered-list-2"))).toBe(
			lowered
		);
	});

	it("keeps a lowered list that holds both quotes", () => {
		expect(
			minifyLegacy(fixture("html", "source-processor-inline-css-honors-the-target-s-abilities-keeps-a-lowered-list-3"))
		).toBe(
			`<p style="content:'\\'';background:#00c3ff;background:hwb(194 0% 0%)">x`
		);
	});

	it("keeps the source's delimiter for a lowered list where quotes are frozen", () => {
		expect(
			new SourceProcessor().process(
				fixture("html", "source-processor-inline-css-honors-the-target-s-abilities-keeps-the-source-s"),
				{
					mode: "minify",
					transforms: { normalizeAttributeQuotes: false },
					renderEmbeddedSource: builtinEmbeddedRenderer({
						environment: { browsers: ["chrome 100"] }
					})
				}
			).code
		).toBe("<p style='background:#00c3ff;background:hwb(194 0% 0%)'>x");
	});

	it("writes a list the same whichever references the source spelled", () => {
		const plain = minifyLegacy(fixture("html", "source-processor-inline-css-honors-the-target-s-abilities-writes-a-list-the-same"));
		expect(plain).toBe(`<p style="content:'\\'';color:red">x`);
		expect(
			minifyLegacy(fixture("html", "source-processor-inline-css-honors-the-target-s-abilities-writes-a-list-the-same-2"))
		).toBe(plain);
	});
});

describe("htmlMinify — assets webpack only passes through", () => {
	const htmlMinify = require("../../../lib/html/htmlMinify");

	/**
	 * @param {string} src html source
	 * @returns {Promise<string>} the minified serialization
	 */
	const min = async (src) => (await htmlMinify({ "page.html": src })).code;

	it("minifies an HTML `data:` URL an attribute holds with no renderer passed", async () => {
		// A nested document takes the asynchronous pass, which the synchronous
		// built-in cannot answer for.
		expect(
			await min(fixture("html", "html-minify-assets-webpack-only-passes-through-minifies-an-html-data-url-an"))
		).toBe('<iframe src="data:text/html,<p>a"></iframe>');
		expect(
			await min(fixture("html", "html-minify-assets-webpack-only-passes-through-minifies-an-html-data-url-an-3"))
		).toBe("<a href='data:application/json,{\"a\":1}'>x</a>");
	});

	it("minifies an SVG `data:` URL under `svg`, and leaves it as written without", async () => {
		const page = fixture("html", "html-minify-assets-webpack-only-passes-through-minifies-an-svg-data-url-under");
		const svg = await htmlMinify({ "page.html": page }, undefined, {
			svg: true
		});

		expect(svg.code).toBe('<img src="data:image/svg+xml,<svg/>">');
		expect(await min(page)).toBe(page);
	});

	it("drops the comments `some` names, as no comment it reaches carries anything", async () => {
		const result = await htmlMinify(
			{ "page.html": fixture("html", "html-minify-assets-webpack-only-passes-through-drops-the-comments-some-names-as") },
			undefined,
			{ extractComments: /foo/, comments: "some" }
		);

		expect(result.code).toBe("<p>a");
		expect(result.extractedComments).toEqual(["<!-- foo -->"]);
	});

	describe("minifyConditionalComments", () => {
		/**
		 * @param {string} page html source
		 * @returns {Promise<string>} it minified, conditional comments' bodies too
		 */
		const conditional = async (page) =>
			(
				await htmlMinify({ "page.html": page }, undefined, {
					minifyConditionalComments: true
				})
			).code;

		it("minifies a body that reads alike where the comment sits", async () => {
			expect(
				await conditional(
					fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments-3")
				)
			).toBe(
				"<!--[if lt IE 9]><script src=h.js></script><link rel=stylesheet href=a.css><![endif]-->"
			);
		});

		it.each([
			[
				"a wrapper one opens and another closes",
				fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments-keeps-3")
			],
			["the `<html>` it spells", fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments-keeps-6")],
			["a row of the table it sits in", fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments-keeps")]
		])("keeps %s as written", async (_, page) => {
			const body = page.slice(page.indexOf("<!--["), page.lastIndexOf("-->") + 3);

			expect(await conditional(page)).toContain(body);
		});

		it("keeps the end tags what follows the comment reads", async () => {
			expect(
				await conditional(fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments-keeps-8"))
			).toBe("<!--[if IE]><p class=a>a</p><![endif]--><span>b</span>");
		});

		it.each([
			[
				"a block moved out of a table before the comment the table holds",
				fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments-6"),
				"<div><!--[if IE]><i class=y>2</i><![endif]--></div><table><!--[if IE]><b class=x>1</b><![endif]--><tr><td title=t>c</table><p title=x>kept"
			],
			[
				"a comment after `</body>` with body content following it",
				fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments-7"),
				"<body><p>a<p><!--[if IE]><i class=y>2</i><![endif]--><p title=x>kept</body><!--[if IE]><b class=x>1</b><![endif]-->"
			],
			[
				"an option `<selectedcontent>` copies",
				fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments-8"),
				"<select><button><selectedcontent></selectedcontent></button><option selected><!--[if IE]><b class=x>1</b><![endif]--></select><p title=x>kept"
			]
		])("minifies each body in place for %s", async (_, page, expected) => {
			const code = await conditional(page);

			expect(code).toBe(expected);
			expect(code).toContain("<p title=x>kept");
		});

		it("leaves a comment that only starts like one, and a plain one, to the document", async () => {
			expect(
				await conditional(fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments"))
			).toBe("<p>a</p><!--[if IE]> no end -->");
			expect(await conditional(fixture("html", "html-minify-assets-webpack-only-passes-through-minify-conditional-comments-2"))).toBe("<p>a");
		});
	});

	it("reads a Buffer input as UTF-8", async () => {
		const { code } = await htmlMinify({
			"page.html": Buffer.from(
				fixture("html", "html-minify-assets-webpack-only-passes-through-reads-a-buffer-input-as-utf-8"),
				"utf8"
			)
		});

		expect(code).toBe("<body><p>ça va à Zürich</body></html>");
	});

	it("keeps server-side template tags", async () => {
		// `<?php … ?>` is a bogus comment per §13.2.5.42, so the inert-comment rule
		// would delete the whole directive from a copied template.
		expect(
			await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-server-side-template-tags"))
		).toBe("<?php echo $t; ?><body><p>a</body></html>");
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-server-side-template-tags-2"))).toBe(
			"<body><p>a</body></html>"
		);
	});

	it("keeps text-level template placeholders unescaped", async () => {
		// Escaping these to `&lt;%= t %&gt;` breaks the server-side render.
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-text-level-template"))).toBe(
			"<div>   <%= t %>   </div>"
		);
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-text-level-template-2"))).toBe("<div>{{ t }}</div>");
	});

	it("still escapes text that would re-parse as markup", async () => {
		// `a &lt;b&gt;c` decodes to `a <b>c`; emitting the `<` raw would build a
		// real `<b>` element, so that one stays escaped. A bare `>` is only ever a
		// character in text.
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-still-escapes-text-that-would-re"))).toBe("<p>a &lt;b>c");
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-still-escapes-text-that-would-re-2"))).toBe("<p>a&amp;b");
		// Foster-parented text merges into one node whose range no longer covers
		// its data — the source slice would drop the `c`.
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-still-escapes-text-that-would-re-3"))).toBe(
			"ac<table><tr><td>b</table>"
		);
		// A trailing `<` has to stay escaped: dropping a comment after it would
		// let it fuse with the next sibling into a tag.
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-still-escapes-text-that-would-re-4"))).toBe("<p>a&lt;");
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-still-escapes-text-that-would-re-5"))).toBe("<p>a&lt;");
	});

	it("keeps template expressions containing ampersands", async () => {
		// `&&` is everywhere in EJS/PHP conditionals; escaping it to `&amp;&amp;`
		// breaks the server-side render just as escaping `<` does.
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-template-expressions"))).toBe(
			"<div><%= a && b %></div>"
		);
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-template-expressions-2"))).toBe(
			"<div><% if (a && b) { %>x<% } %></div>"
		);
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-template-expressions-3"))).toBe("<p>a & b");
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-template-expressions-4"))).toBe("<p>a &foo; b");
	});

	it("escapes a character reference left open at the end", async () => {
		// The next sibling could complete it (`a &am` + `p;`) once a comment
		// between them is dropped, so only a closed tail passes through.
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-escapes-a-character-reference"))).toBe("<p>a &amp;");
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-escapes-a-character-reference-2"))).toBe("<p>a &amp;am");
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-escapes-a-character-reference-3"))).toBe("<p>a &amp;amp;");
	});

	it("keeps the body of literal-text elements raw", async () => {
		// `script` / `style` bodies are not markup, so `<` must not be escaped —
		// `a &lt; b` would change what the script does. A `<style>` body is still
		// run through the CSS minifier, which is not an escaping pass.
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-the-body-of-literal-text"))).toBe(
			"<script>if (a < b) { x(); }</script>"
		);
		expect(await min(fixture("html", "html-minify-assets-webpack-only-passes-through-keeps-the-body-of-literal-text-2"))).toBe(
			'<style>.a[x="<"]{color:red}</style>'
		);
	});
});

describe("htmlMinify — embedded bodies with no renderer", () => {
	const htmlMinify = require("../../../lib/html/htmlMinify");

	/**
	 * @param {string} src html source
	 * @returns {Promise<string>} the minified serialization
	 */
	const min = async (src) => (await htmlMinify({ "page.html": src })).code;

	it("minifies the document an `<iframe srcdoc>` holds", async () => {
		// Nothing is configured here, so what a caller would have answered for
		// this one webpack minifies itself, as in a document of its own.
		expect(
			await min(
				fixture("html", "html-minify-embedded-bodies-with-no-renderer-minifies-the-document-an-iframe")
			)
		).toBe('<p><iframe srcdoc="<p>a"></iframe>');
	});

	it("reaches a `srcdoc` the source wrote bare", async () => {
		// An unquoted value holds a document too, and gets quotes back: a space
		// or a `>` in the minified text would otherwise end the attribute.
		expect(await min(fixture("html", "html-minify-embedded-bodies-with-no-renderer-reaches-a-srcdoc-the-source-wrote"))).toBe(
			'<p><iframe srcdoc="<p>a"></iframe>'
		);
	});

	it("leaves a `srcdoc` in foreign content alone", async () => {
		// An `<iframe>` in SVG is an SVG element that shares the name, and its
		// `srcdoc` is not the HTML attribute.
		expect(
			await min(fixture("html", "html-minify-embedded-bodies-with-no-renderer-leaves-a-srcdoc-in-foreign-content"))
		).toBe('<p><svg><iframe srcdoc="<!-- k -->"></iframe></svg>');
	});
});

describe("htmlMinify — embedded code a minifier fails on", () => {
	const htmlMinify = require("../../../lib/html/htmlMinify");

	const page =
		fixture("html", "html-minify-embedded-code-a-minifier-fails-on-reports-what-webpack-s-own-css");

	it("keeps the placeholder `output.html.inline` fills in after it", async () => {
		const placeholder = "__WEBPACK_HTML_INLINE__30__css__END__";
		const { code } = await htmlMinify(
			{ "page.html": `<style>${placeholder}</style>` },
			undefined,
			{ renderEmbeddedSource: () => undefined }
		);
		expect(code).toBe(`<style>${placeholder}</style>`);
	});

	it("reports what webpack's own CSS minifier throws and keeps the body", async () => {
		// `unusedSymbols` that is no list stands in for anything that makes it throw.
		const unreadable = /** @type {string[]} */ (/** @type {unknown} */ (42));
		const { code, errors } = await htmlMinify({ "page.html": page }, undefined, {
			css: { unusedSymbols: unreadable }
		});
		expect(code).toBe(
			'<style>a { b : c }</style><p style="b : c">x</p><script type=application/json>{"a":1}</script>'
		);
		expect(errors).toHaveLength(2);
	});

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

	it("minifies with webpack's own minifiers when no renderer is given", async () => {
		// What webpack ships a minifier for is minified here; a `<script>` of
		// JavaScript, an `<svg>` subtree and every `data:` payload are not.
		const { code } = await htmlMinify({ "page.html": DOCUMENT });

		expect(code).toMatchSnapshot();
	});
});

describe("SourceProcessor — minify serialization edge cases", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} source html source
	 * @returns {string} minified serialization
	 */
	const minify = (source) =>
		new SourceProcessor().process(source, { mode: "minify" }).code;

	describe("style attributes the css minifier cannot read", () => {
		it("keeps one the css parser runs out of stack on", () => {
			// Balanced, so nothing is left open for the wrapper to lose — the parser
			// still recurses per block, and the value has to come back as written.
			const deep = `--x:${"(".repeat(20000)}${")".repeat(20000)}`;
			expect(minify(`<p style="${deep}">x</p>`)).toContain(deep);
		});
	});

	describe("<noscript> content", () => {

		it("prints a nested <noscript> as written where minifying would move what follows it", () => {
			// With scripting on, the outer body is text up to the first end tag and
			// the next one closes nothing; with it off, that one closes the outer.
			for (const source of [
				fixture("html", "source-processor-minify-serialization-edge-cases-noscript-content-prints-a"),
				fixture("html", "source-processor-minify-serialization-edge-cases-noscript-content-prints-a-2"),
				fixture("html", "source-processor-minify-serialization-edge-cases-noscript-content-prints-a-3"),
				fixture("html", "source-processor-minify-serialization-edge-cases-noscript-content-prints-a-4"),
				fixture("html", "source-processor-minify-serialization-edge-cases-noscript-content-prints-a-5"),
				// `</noscript-x>` ends no raw text, so the nested one after it counts.
				fixture("html", "source-processor-minify-serialization-edge-cases-noscript-content-prints-a-6"),
				// A comment hides an end tag from a reader with scripting off only.
				fixture("html", "source-processor-minify-serialization-edge-cases-noscript-content-prints-a-7"),
				fixture("html", "source-processor-minify-serialization-edge-cases-noscript-content-prints-a-8")
			]) {
				expect(minify(source)).toBe(source);
			}
		});

		it("drops `</head>` once collapsing drops the whitespace behind it, in one print", () => {
			// That whitespace is body text to a reader with scripting off, so the
			// active collapse tier decides it, as it does for any body text.
			const options = /** @type {const} */ ({
				mode: "minify",
				collapseWhitespace: "all",
				removeImpliedTags: "all"
			});
			const once = new SourceProcessor().process(
				fixture("html", "source-processor-minify-serialization-edge-cases-noscript-content-drops-head"),
				options
			).code;
			expect(once).toBe(
				"<!doctype html><title>t</title><noscript>a</noscript><p>x"
			);
		});

	});

	describe("opening-tag whitespace", () => {

		it("unquotes a value carrying a vertical tab, which is no whitespace", () => {
			// \u000B ends no unquoted value: §13.1.2.3 admits every code point but
			// ASCII whitespace — tab, line feed, form feed, carriage return, space.
			const VT = String.fromCharCode(0x0b);
			expect(minify(`<p data-x="a${VT}b">t</p>`)).toBe(`<p data-x=a${VT}b>t`);
			// The five that are whitespace keep the quotes they need.
			for (const code of [0x09, 0x0a, 0x0c, 0x0d, 0x20]) {
				const ws = String.fromCharCode(code);
				expect(minify(`<p data-x="a${ws}b">t</p>`)).toBe(
					`<p data-x="a${ws}b">t`
				);
			}
		});

	});

});

describe("SourceProcessor — print modes", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} source html source
	 * @param {import("../../../lib/util/SourceProcessor").PrintOptions["mode"]} mode print mode
	 * @returns {string} its serialization
	 */
	const print = (source, mode) =>
		new SourceProcessor().process(source, { mode }).code;

	it("prints nothing unless output is asked for", () => {
		expect(new SourceProcessor().process(fixture("html", "html-syntax-the-facade-holds-no-printer-until-something-prints"))).toBeUndefined();
	});

	it("keeps a `<` that stands as a character, so a second pass adds nothing", () => {
		// The comment splits the text in two, and dropping it merges them: escaping
		// per node rather than per `<` would then escape what the first pass kept.
		const once = print(fixture("html", "source-processor-print-modes-keeps-a-that-stands-as-a-character-so-a-second-pass"), "minify");
		expect(once).toBe("<boo>hay\n<<<<>foo\n>>&lt;</boo>");
	});

	it("beautifies to something that minifies back the same", () => {
		for (const source of [
			fixture("html", "source-processor-print-modes-beautifies-to-something-that-minifies-back-the-same"),
			fixture("html", "source-processor-minify-serialization-edge-cases-cloned-reconstructed-formatting-9"),
			fixture("html", "source-processor-print-modes-beautifies-to-something-that-minifies-back-the-same-3"),
			fixture("html", "source-processor-print-modes-beautifies-to-something-that-minifies-back-the-same-4"),
			fixture("html", "source-processor-minify-serialization-edge-cases-cloned-reconstructed-formatting-4")
		]) {
			expect(print(print(source, "beautify"), "minify")).toBe(
				print(source, "minify")
			);
		}
	});
});

describe("SourceProcessor — the leading newline of `<pre>`", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

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

describe("SourceProcessor — re-serializing keeps the tree", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const { parseHtml } = require("../../../lib/html/syntax-parser");

	/**
	 * @param {string} source html source
	 * @returns {string} the tree the printed output re-parses to
	 */
	const reparsed = (source) =>
		serializeHtmlTree(
			parseHtml(
				new SourceProcessor().process(source, { mode: "beautify" }).code
			)
		);

	// §4.13 lets an `html` or `body` end tag go only when no comment follows, and
	// a `head` one only when neither a comment nor whitespace does.
	it.each([
		["whitespace between head and body", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-whitespace-between-head-and")],
		["a space between head and body", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-space-between-head-and")],
		["a comment after body", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-comment-after-body")],
		["a comment after html", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-comment-after-html")],
		// Serializing writes back the newline the parser drops — in HTML only, so a
		// MathML `textarea`, which keeps its own, must not gain one.
		["a foreign textarea's leading newline", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-foreign-textarea-s")],
		["an html textarea's leading newline", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-an-html-textarea-s-leading")],
		["a pre's leading newline", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-pre-s-leading-newline")],
		// §4.13 pairs the `<colgroup>` tags, and a `<template>` behind one does not
		// close it: the head rules take it where it stands.
		["two colgroups a col each", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-two-colgroups-a-col-each")],
		["a template behind a colgroup", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-template-behind-a")],
		// A `<select>` inserts no active-formatting marker, so `</marquee>` clears
		// the `<b>` rather than stopping short and rebuilding it behind the marquee.
		["formatting a marquee cleared", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-formatting-a-marquee")],
		// §13.2.6.4.7 ignores a `<form>` start tag while the pointer is set, so a
		// nested one needs the end tag that cleared it written back in front.
		["a form inside a form", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-form-inside-a-form")],
		["a form a button holds", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-form-a-button-holds")],
		// Foster parenting puts a node before the table it was written inside, so in
		// tree order its start tag reaches what the table had kept out of scope.
		["a list fostered out of a table", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-list-fostered-out-of-a")],
		["a definition fostered out of one", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-definition-fostered-out")],
		["an option fostered out of one", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-an-option-fostered-out-of")],
		["a heading fostered out of one", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-heading-fostered-out-of")],
		["ruby fostered out of one", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-ruby-fostered-out-of-one")],
		["a form the table kept", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-form-the-table-kept")],
		["an input that ends a select", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-an-input-that-ends-a-select")],
		["a foreign element fostered out of one", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-foreign-element-fostered-2")],
		["a style the fostered element holds", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-style-the-fostered")],
		["a newline the fostered pre kept", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-newline-the-fostered-pre")],
		// A `<template>` anywhere above suspends the form element pointer, so the
		// end tag that a nested form otherwise needs would only close the outer one.
		["a form a template holds", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-form-a-template-holds")],
		// A scope rule ends the nearest match on the stack rather than the parent,
		// so what a fostered run would close can sit any number of elements above.
		["an input under a fostered div", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-an-input-under-a-fostered")],
		["a button under a fostered list", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-button-under-a-fostered")],
		["a select above what holds the table", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-select-above-what-holds")],
		// Whitespace a table kept and text it fostered stay two nodes: moved back in
		// beside each other they would fuse into one.
		["text beside whitespace a table kept", fixture("html", "parse-html-path-accessor-completeness-clears-the-foster-region-marks-a-print")],
		["a comment behind a column group", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-comment-behind-a-column")],
		["a form a foreign element holds", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-form-a-foreign-element")],
		["a hidden input the table keeps", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-hidden-input-the-table")],
		["an input the table fosters", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-an-input-the-table-fosters")],
		["a fostered list of several items", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-fostered-list-of-several")],
		["a run fostered inside template content", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-run-fostered-inside")],
		["a foreign run with children", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-foreign-run-with-children")],
		["a run a template's content holds", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-run-a-template-s-content")],
		["a second column group behind a run", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-second-column-group")],
		[
			"a run that moves beside one that cannot",
			fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-run-that-moves-beside-one")
		],
		// And where tree order already re-parses, it is left alone.
		["a paragraph fostered out of one", fixture("html", "source-processor-optional-end-tags-read-the-output-keeps-a-p-a-quirks-mode-table")],
		// Every scope stops at a table, so a formatting element written inside one
		// reaches an ancestor of the same name only once printed outside it.
		["a formatting element the table held out of scope", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-formatting-element-the")],
		["one under a run that closes the holder", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-one-under-a-run-that-closes")],
		[
			"a foreign element fostered out of a table",
			fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-foreign-element-fostered")
		],
		// §13.2.6.5 inserts a foreign `<form>` without consulting the form pointer.
		["a form in foreign content inside another", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-form-in-foreign-content")],
		// §13.2.4.3 rebuilds these from the list of active formatting elements, so
		// no tag placement reaches them and the source is what prints.
		[
			"a run holding a rebuilt formatting element",
			fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-run-holding-a-rebuilt")
		],
		[
			"one rebuilt behind a row group",
			fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-one-rebuilt-behind-a-row")
		],
		["a rebuilt one an end tag closed", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-rebuilt-one-an-end-tag")],
		["two the source never closed", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-two-the-source-never-closed")],
		["a second table inside the run's own", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-second-table-inside-the")],
		// The run's holder is read back off its own tag, which the source may have
		// spaced out before the `>`.
		["a spaced-out tag holding a run", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-spaced-out-tag-holding-a")],
		[
			"an end tag the region already carries",
			fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-an-end-tag-the-region")
		],
		["a run under an implied body", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-run-under-an-implied-body")],
		// The table keeps whitespace-only text and fosters the rest, so the run
		// cannot come back beside it without the two fusing.
		["a run beside whitespace the table kept", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-run-beside-whitespace-the")],
		["text the table kept before a run", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-text-the-table-kept-before")],
		// §13.2.6.4.7 gives `a` and `nobr` a start-tag rule of their own, so writing
		// a rebuilt one back is not the same as never having removed it.
		["a rebuilt nobr a heading left on the list", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-rebuilt-nobr-a-heading")],
		["a rebuilt a behind a marker", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-rebuilt-a-behind-a-marker")],
		// A marquee's marker hides the outer `<b>` from the list, so the rebuilt one
		// inside it is a second element of the same name rather than the same one.
		["a name repeated below a marker", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-name-repeated-below-a")],
		// §13.2.6.4.7 stops the dd/dt loop at a special element, and generates
		// implied end tags for an `<hr>` while a `<select>` is in scope.
		["a list item a select held open", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-list-item-a-select-held")],
		// §13.2.6.4.7 stops the `li` loop at a special element that is not
		// `address`/`div`/`p`, leaving the item below it open.
		["an item a section kept open", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-an-item-a-section-kept-open")],
		["an hr the table held out of a select's scope", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-an-hr-the-table-held-out-of")],
		// The `</form>` a nested form needs generates implied end tags of its own.
		[
			"a nested form behind something implied",
			fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-nested-form-behind")
		],
		// §13.2.6.4.7's close-a-p list is not §4.13's tag-omission list.
		["a p closed by a start tag only the parser lists", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-p-closed-by-a-start-tag")],
		// The run and the table's own children only read in source order while the
		// two do not overlap.
		[
			"a run written inside a sibling's span",
			fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-run-written-inside-a")
		],
		[
			"a run beside a table a template holds",
			fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-run-beside-a-table-a")
		],
		// A parser-implied element carries attributes once a later tag merges them
		// on, so it prints its tags — and it has no name in the source to echo.
		[
			"a comment behind an implied html the source gave attributes",
			fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-comment-behind-an-implied")
		],
		["one behind an implied body", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-one-behind-an-implied-body")]
	])("keeps %s", (_name, source) => {
		expect(reparsed(source)).toBe(serializeHtmlTree(parseHtml(source)));
	});

	// From wpt's `html/syntax/serializing-html-fragments`. Held to the tree, not
	// to §13.3's text: this printer echoes the source rather than re-serializing.
	describe("wpt serialization cases", () => {
		it.each([
			["a bare ampersand in an attribute", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-a")],
			["a no-break space in an attribute", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-a-7")],
			["a quote in an attribute", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-a-8")],
			["a less-than in an attribute", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-a-4")],
			["a greater-than in an attribute", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-a-3")],
			[
				"an escaped javascript url",
				fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-an-2")
			],
			[
				"a namespaced attribute on svg",
				fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-a-6")
			],
			[
				"an xmlns attribute on svg",
				fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-an-4")
			],
			// Raw-text and escapable-raw-text elements: the markup inside them is
			// text, and printing it back must not let it become tags again.
			["markup inside style", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-6")],
			["markup inside xmp", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-7")],
			["markup inside iframe", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-2")],
			["markup inside noembed", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-3")],
			["markup inside noframes", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-4")],
			["a comment", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-a-2")],
			[
				"nested elements",
				fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-8")
			],
			["an unquoted attribute value", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-an-3")],
			// Scripting is off in webpack, so `<noscript>` holds markup rather than
			// text — wpt's escaping.html is the case that says so.
			["markup inside noscript", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-5")],
			["unescaped noscript content", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-9")],
			["escaped noscript content", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps")],
			["an element inside noscript", fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-an")],
			[
				"a link inside noscript in head",
				fixture("html", "source-processor-re-serializing-keeps-the-tree-wpt-serialization-cases-keeps-a-5")
			]
		])("keeps %s", (_name, source) => {
			expect(reparsed(source)).toBe(serializeHtmlTree(parseHtml(source)));
		});
	});
});

// Beautifying is no pretty-printer: it completes the tags the source left out
// and echoes the rest byte for byte, so what it writes is snapshotted.
describe("SourceProcessor — beautifying", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const { parseHtml } = require("../../../lib/html/syntax-parser");

	/**
	 * @param {string} source html source
	 * @returns {string} its beautified serialization
	 */
	const beautify = (source) =>
		new SourceProcessor().process(source, { mode: "beautify" }).code;

	const CASES = [
		// End tags §4.13 lets a source omit are written back.
		["implied list items", fixture("html", "source-processor-the-per-transform-switches-remove-optional-tags")],
		["implied table sections", fixture("html", "source-processor-beautifying-should-beautify-implied-table-sections")],
		["an implied paragraph", fixture("html", "source-processor-beautifying-should-beautify-an-implied-paragraph")],
		// Nothing the author wrote is rewritten: quoting, case and the spacing
		// inside a tag all survive.
		["attribute spelling", fixture("html", "source-processor-beautifying-should-beautify-attribute-spelling")],
		["an unquoted attribute", fixture("html", "source-processor-beautifying-should-beautify-an-unquoted-attribute")],
		// The round-trip fallback: shapes no tag placement reproduces print from
		// the source that built them.
		["a fostered formatting run", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-run-holding-a-rebuilt")],
		["a list fostered out of a table", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-list-fostered-out-of-a")],
		["a form the table kept", fixture("html", "source-processor-re-serializing-keeps-the-tree-keeps-a-form-the-table-kept")],
		// Raw text keeps its content, and a comment survives.
		["raw text", fixture("html", "source-processor-beautifying-should-beautify-raw-text")],
		// The same two names in a foreign subtree hold character data, not raw
		// text, so what they carry stays escaped.
		["a foreign script", fixture("html", "source-processor-beautifying-should-beautify-a-foreign-script")],
		["a foreign style", fixture("html", "source-processor-beautifying-should-beautify-a-foreign-style")],
		["a comment", fixture("html", "source-processor-remove-empty-elements-reads-the-output-drops-one-left-empty-by")]
	];

	for (const [name, source] of CASES) {
		it(`should beautify ${name}`, () => {
			expect(beautify(source)).toMatchSnapshot();
		});
	}

	it("should keep the tree every case was parsed from", () => {
		/** @type {string[]} */
		const moved = [];
		for (const [name, source] of CASES) {
			const printed = beautify(source);
			if (
				serializeHtmlTree(parseHtml(printed)) !==
				serializeHtmlTree(parseHtml(source))
			) {
				moved.push(name);
			}
		}
		expect(moved).toEqual([]);
	});

	// A tag the printer supplies is source the next pass reads, and a written one
	// gets its pair back — so echoing settles on the second pass, not the first.
	it("should settle on the second pass", () => {
		/** @type {string[]} */
		const unsettled = [];
		for (const [name, source] of [
			...CASES,
			["a body implied before leading whitespace", fixture("html", "source-processor-beautifying-should-settle-on-the-second-pass-5")]
		]) {
			const twice = beautify(beautify(source));
			if (beautify(twice) !== twice) unsettled.push(name);
		}
		expect(unsettled).toEqual([]);
	});
});

// A nested list item, a second `<form>`, a fostered run: shapes whose print the
// round-trip guard checks. It reads both trees as minifying leaves them, so only
// a node that moved hands the source back.
describe("SourceProcessor — minifying what the round-trip guard checks", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} source html source
	 * @returns {string} its minified serialization
	 */
	const minify = (source) =>
		new SourceProcessor().process(source, {
			mode: /** @type {"minify"} */ ("minify"),
			collapseWhitespace: /** @type {"smart"} */ ("smart"),
			mergeStyles: true,
			removeEmptyAttributes: true,
			removeEmptyElements: true,
			removeRedundantAttributes: /** @type {"all"} */ ("all"),
			sortAttributes: true,
			sortTokenLists: true,
			renderEmbeddedSource: builtinEmbeddedRenderer()
		}).code;

	/** @type {[string, string][]} */
	const CASES = [
		[
			"a list nested in a list item",
			fixture("html", "source-processor-minifying-what-the-round-trip-guard-checks-minifies-a-list")
		],
		["a term nested behind a division", fixture("html", "source-processor-minifying-what-the-round-trip-guard-checks-minifies-a-term")],
		["a link inside a link", fixture("html", "source-processor-minifying-what-the-round-trip-guard-checks-minifies-a-link")],
		["a second form", fixture("html", "source-processor-minifying-what-the-round-trip-guard-checks-minifies-a-second")],
		["a run fostered out of a table", fixture("html", "source-processor-minifying-what-the-round-trip-guard-checks-minifies-a-run")],
		[
			"an inline sheet under a nested list",
			fixture("html", "source-processor-minifying-what-the-round-trip-guard-checks-minifies-an-inline")
		]
	];

	it.each(CASES)("minifies %s", (_name, source) => {
		expect(minify(source)).toMatchSnapshot();
	});

	it("gives none of them back as their source", () => {
		// The fallback is the whole document verbatim, so a case reading as its own
		// input is one the guard stopped minifying altogether.
		expect(
			CASES.filter(([, source]) => minify(source) === source).map(
				([name]) => name
			)
		).toEqual([]);
	});

	it("settles on the second pass", () => {
		/** @type {string[]} */
		const unsettled = [];
		for (const [name, source] of CASES) {
			const once = minify(source);
			if (minify(once) !== once) unsettled.push(name);
		}
		expect(unsettled).toEqual([]);
	});

	it("still hands back the source where the print would move a node", () => {
		// The shape no arrangement of tags reproduces: printed as the tree says, it
		// parses back somewhere else, so the guard has to refuse the whole print.
		const source = fixture("html", "source-processor-minifying-what-the-round-trip-guard-checks-still-hands-back-the");
		expect(minify(source)).toBe(source);
	});

	it("minifies a document whose deferred svg the guard reads back", async () => {
		// An `<svg>` subtree is offered whole, so the print holds a marker where it
		// stood; this document also fosters, so the guard re-parses the print.
		const source =
			fixture("html", "source-processor-minifying-what-the-round-trip-guard-checks-minifies-a-document");
		const { code } = await new SourceProcessor().processAsync(source, {
			mode: /** @type {"minify"} */ ("minify"),
			renderEmbeddedSource: (
				/** @type {string} */ body,
				/** @type {import("../../../lib/html/syntax-parser").DeferredEmbeddedSource} */ hole
			) => Promise.resolve(hole.type === "svg" ? body : undefined)
		});

		expect(code).not.toBe(source);
		expect(code).toMatchSnapshot();
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

	it("minifies a repeated style attribute to the same declarations", () => {
		// The same raw value twice, which is what webpack's own renderer keys its
		// memo on — a value that merely minifies to the same text is another entry.
		expect(
			minify(fixture("html", "source-processor-reusing-work-across-a-print-minifies-a-repeated-style-attribute"), {
				renderEmbeddedSource: builtinEmbeddedRenderer()
			})
		).toBe("<p style=color:red><b style=color:red></b>");
	});

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

	it("reads back the name it was given, whatever the memo holds", () => {
		// These three take the same memo slot — it is keyed by first character and
		// length — so each is handed the one before it and must reject it.
		expect(deepestTagName(fixture("html", "source-processor-reusing-work-across-a-print-reads-back-the-name-it-was-given"))).toBe("my-widget");
		expect(deepestTagName(fixture("html", "source-processor-reusing-work-across-a-print-reads-back-the-name-it-was-given-2"))).toBe("my-gadget");
		expect(deepestTagName(fixture("html", "source-processor-reusing-work-across-a-print-reads-back-the-name-it-was-given-3"))).toBe("my-widget");
	});

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

	it("hands out one shared string for a known name", () => {
		// What lets the memo keep a known name across parses: the entry is this
		// constant, not a slice of the document that asked for it.
		const first = deepestTagName(fixture("html", "source-processor-reusing-work-across-a-print-hands-out-one-shared-string-for-a"));
		const second = deepestTagName(fixture("html", "source-processor-reusing-work-across-a-print-hands-out-one-shared-string-for-a-2"));
		expect(second).toBe("section");
		expect(second).toBe(first);
	});
});

describe("htmlMinify — the delimiter an answered `srcdoc` is written with", () => {
	const htmlMinify = require("../../../lib/html/htmlMinify");

	/**
	 * @param {string} src html source
	 * @param {(source: string, info: { type: string }) => EXPECTED_ANY} renderEmbeddedSource the renderer
	 * @returns {Promise<string>} the minified serialization
	 */
	const min = async (src, renderEmbeddedSource) =>
		(
			await htmlMinify({ "page.html": src }, undefined, {
				renderEmbeddedSource
			})
		).code;

	// The value decides, so each case is one answer and the delimiter it forces.
	const SOURCE = fixture("html", "html-minify-the-delimiter-an-answered-srcdoc-is-written-with-quotes-an-answer");

	it("quotes an answer holding a `\"` with `'`", async () => {
		expect(await min(SOURCE, () => '<p a="b">')).toBe(
			"<p><iframe srcdoc='<p a=\"b\">'></iframe>"
		);
	});

	it("quotes an answer holding a `'` with `\"`", async () => {
		expect(await min(SOURCE, () => "<p a='b'>")).toBe(
			"<p><iframe srcdoc=\"<p a='b'>\"></iframe>"
		);
	});

	it("escapes an answer holding both, where neither delimiter is free", async () => {
		expect(await min(SOURCE, () => "<p a='b' c=\"d\">")).toBe(
			"<p><iframe srcdoc=\"<p a='b' c=&quot;d&quot;>\"></iframe>"
		);
	});

	it("keeps the source's delimiter where the answer needs neither", async () => {
		// Nothing to escape either way, so the shorter document is the one that
		// does not rewrite the delimiter it was already spelled with.
		expect(
			await min(fixture("html", "html-minify-the-delimiter-an-answered-srcdoc-is-written-with-keeps-the-source-s"), () => "<p>b")
		).toBe("<p><iframe srcdoc='<p>b'></iframe>");
		expect(await min(SOURCE, () => "<p>b")).toBe(
			'<p><iframe srcdoc="<p>b"></iframe>'
		);
	});

	it("gives a `srcdoc` the source wrote bare the quotes its answer needs", async () => {
		// An unquoted value carries no delimiter to keep, so the answer's own
		// content is all there is to go on.
		expect(
			await min(fixture("html", "source-processor-render-embedded-source-quotes-a-bare-srcdoc-a-synchronous"), () => '<p a="b">')
		).toBe("<p><iframe srcdoc='<p a=\"b\">'></iframe>");
	});

	it("leaves the attribute as written when an async renderer declines", async () => {
		// Declining on the deferring path puts the attribute back as the source
		// spelled it: the raw value, references and delimiter included.
		expect(await min(SOURCE, () => Promise.resolve(undefined))).toBe(
			'<p><iframe srcdoc="&lt;p&gt;a"></iframe>'
		);
		expect(
			await min(fixture("html", "source-processor-render-embedded-source-quotes-a-bare-srcdoc-a-synchronous"), () =>
				Promise.resolve(undefined)
			)
		).toBe("<p><iframe srcdoc=&lt;p&gt;a></iframe>");
	});
});

describe("htmlMinify — an answered `style` attribute that changes its quoting", () => {
	const htmlMinify = require("../../../lib/html/htmlMinify");

	/**
	 * @param {string} src html source
	 * @param {(source: string, info: { type: string }) => EXPECTED_ANY} renderEmbeddedSource the renderer
	 * @returns {Promise<string>} the minified serialization
	 */
	const min = async (src, renderEmbeddedSource) =>
		(
			await htmlMinify({ "page.html": src }, undefined, {
				renderEmbeddedSource
			})
		).code;

	it("keeps an answer that no longer needs quotes", async () => {
		// The built-in's text is quoted and the answer is bare. Only a foreign
		// `/>` reads that difference, so an html element takes the answer.
		expect(
			await min(fixture("html", "html-minify-an-answered-style-attribute-that-changes-its-quoting-keeps-an-answer"), () => "color:red")
		).toBe("<p style=color:red>x");
	});

	it("keeps an answer that now needs quotes", async () => {
		expect(
			await min(fixture("html", "html-minify-an-answered-style-attribute-that-changes-its-quoting-keeps-an-answer-2"), () => "margin:0 auto")
		).toBe('<p style="margin:0 auto">x');
	});

	it("minifies a `data:` payload the answer shortens past its quotes", async () => {
		// The shape webpack's own default reaches through the css minifier: with
		// the payload minified the whole value fits unquoted.
		expect(
			await min(
				fixture("html", "html-minify-an-answered-style-attribute-that-changes-its-quoting-minifies-a-data"),
				() => "background:url(data:text/css,.q{color:red})"
			)
		).toBe("<p style=background:url(data:text/css,.q{color:red})>x");
	});

	it("declines an answer that would change a foreign `/>`", async () => {
		// Whether a space must precede a foreign `/>` is decided when the tag
		// closes, too early to wait for the answer, so the source's spelling stands.
		expect(
			await min(fixture("html", "html-minify-an-answered-style-attribute-that-changes-its-quoting-declines-an"), (source, info) =>
				info.type === "css" ? "margin:0 auto" : undefined
			)
		).toBe("<svg><rect style=color:red /></svg>");
		// An answer that keeps the tag ending as the source had it is taken.
		expect(
			await min(fixture("html", "html-minify-an-answered-style-attribute-that-changes-its-quoting-declines-an-2"), (source, info) =>
				info.type === "css" ? "margin:0 auto" : undefined
			)
		).toBe('<svg><rect style="margin:0 auto"/></svg>');
	});
});

describe("htmlMinify — the function an event handler is asked about", () => {
	const htmlMinify = require("../../../lib/html/htmlMinify");

	/**
	 * @param {string} src html source
	 * @param {(source: string, info: { type: string, as?: string }) => EXPECTED_ANY} renderEmbeddedSource the renderer
	 * @returns {Promise<string>} the minified html
	 */
	const min = async (src, renderEmbeddedSource) =>
		(
			await htmlMinify({ "page.html": src }, undefined, {
				renderEmbeddedSource
			})
		).code;

	it("asks about the body it is, and says which production that is", async () => {
		/** @type {[string, string | undefined][]} */
		const asked = [];

		await min(fixture("html", "html-minify-the-function-an-event-handler-is-asked-about-asks-about-the-body-it"), (source, info) => {
			asked.push([source, info.as]);
			return undefined;
		});

		// Handed over as written: an engine that takes only whole scripts wraps it
		// itself, which is a choice a renderer supporting the production must keep.
		expect(asked).toEqual([["  f( 1 )  ", "event-handler"]]);
	});

	it("writes the answer back", async () => {
		expect(await min(fixture("html", "html-minify-the-function-an-event-handler-is-asked-about-asks-about-the-body-it"), () => "f(1)")).toBe(
			"<p onclick=f(1)>x"
		);
	});

	it("carries a `return` through, which is what a handler body may hold", async () => {
		expect(
			await min(fixture("html", "source-processor-render-embedded-source-offers-a-handler-whose-top-level-is-a"), (source) => {
				expect(source).toBe("return  false");
				return "return!1";
			})
		).toBe("<form onsubmit=return!1><input></form>");
	});

	it("keeps the handler where the renderer declines", async () => {
		expect(await min(fixture("html", "html-minify-the-function-an-event-handler-is-asked-about-keeps-the-handler-where"), () => undefined)).toBe(
			'<p onclick="f( 1 )">x'
		);
	});

	it("reports what a renderer threw over a handler", async () => {
		// A body no JavaScript production holds is the renderer's to report, as an
		// inline `<script>` that does not parse is.
		const { code, errors } = await htmlMinify(
			{ "page.html": fixture("html", "html-minify-the-function-an-event-handler-is-asked-about-reports-what-a-renderer") },
			undefined,
			{
				renderEmbeddedSource: () => {
					throw new Error("Unexpected token");
				}
			}
		);

		expect(code).toBe('<p onclick="var = broken(">x');
		expect(errors).toHaveLength(1);
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
			[true, ["<!--! one -->", "<!-- @license two -->"]],
			["some", ["<!--! one -->", "<!-- @license two -->"]],
			["all", ["<!--! one -->", "<!-- plain -->", "<!-- @license two -->"]],
			[/license/, ["<!-- @license two -->"]],
			["^!", ["<!--! one -->"]],
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

		it("leaves IE's `@cc_on` to `comments`", async () => {
			expect(
				await run(true, { comments: "cc_on" }, "<!--@cc_on--><p>a</p>")
			).toEqual({
				code: "<!--@cc_on--><p>a",
				extractedComments: undefined
			});
		});

		it("reads the plugin's option where `minimize.html` sets none", async () => {
			expect(await run({ condition: /license/ })).toEqual({
				code: rest,
				extractedComments: ["<!-- @license two -->"]
			});
		});

		it("keeps the comments `comments` names that are not taken", async () => {
			expect(await run(true, { comments: "plain" })).toEqual({
				code: "<p>a</p><!-- plain -->" + rest.slice(8),
				extractedComments: ["<!--! one -->", "<!-- @license two -->"]
			});
		});

		it.each([
			["the plugin asks for none", false, {}],
			["the plugin states nothing", undefined, {}],
			["`minimize.html` asks for none", true, { extractComments: false }]
		])("takes none where %s", async (_name, extractComments, options) => {
			expect(await run(extractComments, options)).toEqual({
				code: rest,
				extractedComments: undefined
			});
		});

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

		it("leaves a nested document's comments to it", async () => {
			const { code, extractedComments } = await run(
				true,
				{ comments: "all" },
				fixture("html", "html-minify-export-extract-comments-leaves-a-nested-document-s-comments-to-it")
			);
			expect(extractedComments).toEqual(["<!--! top -->"]);
			expect(code).toContain("inner");
		});
	});
});

describe("SourceProcessor — attribute rewrites as switches", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {object=} options extra print options
	 * @returns {string} the minified serialization
	 */
	const minify = (html, options) =>
		new SourceProcessor().process(html, { mode: "minify", ...options }).code;

	/**
	 * @param {import("../../../lib/html/syntax-parser").HtmlTransformOptions} transforms the switches
	 * @returns {{ mode: "minify", transforms: import("../../../lib/html/syntax-parser").HtmlTransformOptions }} print options
	 */
	const off = (transforms) => ({
		mode: /** @type {"minify"} */ ("minify"),
		transforms
	});

	it("keeps a `style` attribute a renderer hands straight back", () => {
		// The way to keep one: there is no switch, and none is needed — a renderer
		// that answers with the list it was given has said to leave it alone.
		const code = new SourceProcessor().process(
			fixture("html", "source-processor-attribute-rewrites-as-switches-keeps-a-style-attribute-a"),
			{
				mode: "minify",
				renderEmbeddedSource: (
					/** @type {string} */ source,
					/** @type {{ type: string }} */ info
				) => (info.type === "css" ? source : undefined)
			}
		).code;

		expect(code).toBe('<p style="color:  #ff0000 ;">x');
	});

	/**
	 * Print with a renderer answering asynchronously, as a caller reaching a
	 * worker pool does — which is the path webpack's own minimizer takes.
	 * @param {string} html input markup
	 * @param {(source: string) => string | undefined} answer what it makes of one list
	 * @returns {Promise<string>} the minified serialization
	 */
	const deferredStyle = async (html, answer) => {
		const { code } = await new SourceProcessor().processAsync(html, {
			mode: "minify",
			renderEmbeddedSource: (
				/** @type {string} */ source,
				/** @type {{ as?: string }} */ hole
			) =>
				Promise.resolve(
					hole.as === "block-contents" ? answer(source) : undefined
				)
		});

		return code;
	};

	it("keeps one a deferred renderer hands straight back", async () => {
		// The answer arrives after the attribute is written, so the source's
		// spelling stood here until the answer was read for what it says.
		expect(
			await deferredStyle(
				fixture("html", "source-processor-attribute-rewrites-as-switches-keeps-a-style-attribute-a"),
				(source) => source
			)
		).toBe('<p style="color:  #ff0000 ;">x');
		expect(
			await deferredStyle(
				fixture("html", "source-processor-attribute-rewrites-as-switches-keeps-one-a-deferred-renderer"),
				(source) => source
			)
		).toBe('<p style="color:  #ff0000 ;" id=q>x');
	});

	it("takes what a deferred renderer answers, longer or not", async () => {
		expect(
			await deferredStyle(
				fixture("html", "source-processor-attribute-rewrites-as-switches-keeps-a-style-attribute-a"),
				() => "color:blue"
			)
		).toBe("<p style=color:blue>x");
		expect(
			await deferredStyle(
				fixture("html", "source-processor-attribute-rewrites-as-switches-keeps-a-style-attribute-a"),
				() => "color:rgb(255 0 0)"
			)
		).toBe('<p style="color:rgb(255 0 0)">x');
	});

	it("offers a deferred renderer the list, not its spelling", async () => {
		/** @type {string[]} */
		const offered = [];
		const code = await deferredStyle(
			fixture("html", "source-processor-attribute-rewrites-as-switches-offers-a-deferred-renderer-the"),
			(source) => {
				offered.push(source);
				return "color:blue";
			}
		);

		// The reference is how the attribute is written; what the renderer reads
		// is the declaration list the element computes.
		expect(offered).toEqual(["color:red"]);
		expect(code).toBe("<p style=color:blue>x");
	});

	it("offers a list already at its shortest", async () => {
		// The built-in makes `margin:0 auto` of it and it cannot go unquoted, so
		// nothing beats the source — which is no reason to ask nobody.
		/** @type {string[]} */
		const offered = [];
		const code = await deferredStyle(
			fixture("html", "source-processor-attribute-rewrites-as-switches-offers-a-list-already-at-its"),
			(source) => {
				offered.push(source);
				return "color:blue";
			}
		);

		expect(offered).toEqual(["margin:0 auto"]);
		expect(code).toBe("<p style=color:blue>x");
	});

	it("keeps a shortest list no renderer answers for", async () => {
		expect(
			await deferredStyle(fixture("html", "source-processor-attribute-rewrites-as-switches-offers-a-list-already-at-its"), () => undefined)
		).toBe('<p style="margin:0 auto">x');
	});

	it("keeps one a deferred renderer declines as written", async () => {
		expect(
			await deferredStyle(fixture("html", "source-processor-attribute-rewrites-as-switches-keeps-a-style-attribute-a"), () => undefined)
		).toBe('<p style="color:  #ff0000 ;">x');
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

// HTML §13.2.3.1: the decoder takes a leading BOM as the encoding's mark, so the
// document the parser sees starts after it.
describe("SourceProcessor — a byte order mark", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	const page = fixture("html", "source-processor-a-byte-order-mark-keeps-the-doctype-it-stands-before-and-prints");

	it("keeps the doctype it stands before when beautifying", () => {
		expect(
			new SourceProcessor().process(page, { mode: "beautify" }).code
		).toMatch(/^﻿<!DOCTYPE html>/);
	});

	it("walks the doctype it stands before", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({ [NodeType.Doctype]: () => log.push("doctype") })
			.process(page);
		expect(log).toEqual(["doctype"]);
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

// Inputs from the html5lib / wpt tree-construction corpus, picked for the
// insertion-mode paths they take: each prints back to the tree it was read as,
// read as the printer's own reader does — with scripting on.
describe("SourceProcessor — tree-construction corpus round trips", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const { parseHtml } = require("../../../lib/html/syntax-parser");

	/** @type {[("beautify" | "minify"), string, string][]} */
	const CASES = [
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-cite-b"), ""],
		[
			"minify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-p-font-size"),
			""
		],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-svg-cdata-2"), ""],
		["minify", fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-body-a-b"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-a-table-td"), ""],
		[
			"beautify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-doctype-3"),
			""
		],
		[
			"minify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-table-tr"),
			""
		],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-nobr-table"), ""],
		["minify", fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-doctype-html-2"), ""],
		[
			"beautify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-select-2"),
			""
		],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-g-path-x"), "svg path"],
		["minify", fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-math-tbody"), "tbody"],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-body-foo"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-b-test"), ""],
		["minify", fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-body-back-to"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-inside"), "script"],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-back-to"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-form-form"), "template"],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-input"), "select"],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-table-a-1"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-doctype-6"), ""],
		["minify", fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-body"), ""],
		[
			"beautify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-body-a-b"),
			""
		],
		[
			"beautify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-doctype-5"),
			""
		],
		[
			"minify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-doctype-html"),
			""
		],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-back-to-2"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-select-hr"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-p-table-p"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-select"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-button"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-p-code-x"), ""],
		["minify", fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-div-bar-zz"), ""],
		[
			"minify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-html-body-n"),
			""
		],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-x-back-to"), ""],
		["minify", fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-doctype-back"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-frameset-x"), "svg desc"],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-body-xml"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-body-start-2"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-body-start"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-div-svg"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-doctype"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-table-tr"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-doctype-7"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-math"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-doctype-8"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-doctype-9"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-doctype-4"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-html-a-b"), ""],
		[
			"beautify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-p-b-id-a-b"),
			""
		],
		[
			"beautify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-doctype-2"),
			""
		],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-back-to-3"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-body-u0000"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-dd-1-foo"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-script"), ""],
		["minify", fixture("html", "source-processor-tree-construction-corpus-round-trips-minify-prints-foo-gt-bar"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-svg-cdata"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-html-abc"), "html"],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-template-a"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-b-em-foo"), ""],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-br-bc-form"), "template"],
		["beautify", fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-div"), ""],
		[
			"beautify",
			fixture("html", "source-processor-tree-construction-corpus-round-trips-beautify-prints-div-a-b"),
			""
		]
	];

	it.each(CASES)("%s prints %j back to its tree", (mode, source, context) => {
		const fragmentContext = context || undefined;
		const options = { fragmentContext, scripting: true };
		const { code } = new SourceProcessor().process(source, {
			mode,
			fragmentContext
		});
		expect(serializeHtmlTree(parseHtml(code, 0, options))).toBe(
			serializeHtmlTree(parseHtml(source, 0, options))
		);
	});
});

// Prints read back as a browser reads them: with scripting on, as `grammar`
// parses the source it prints, and in the fragment context it was parsed in.
describe("SourceProcessor — printing what re-parses to the same tree", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const { parseHtml } = require("../../../lib/html/syntax-parser");

	/**
	 * @param {string} source html source
	 * @param {HtmlPrint} options print options
	 * @returns {string} the printed document
	 */
	const print = (source, options) =>
		new SourceProcessor().process(source, options).code;

	/**
	 * @param {string} source html source
	 * @param {string=} fragmentContext the context it is parsed in
	 * @param {boolean=} blank whether to keep whitespace-only text
	 * @returns {string} its tree, read as the printer's reader does
	 */
	const tree = (source, fragmentContext, blank = true) => {
		const serialized = serializeHtmlTree(
			parseHtml(source, 0, { fragmentContext, scripting: true })
		);
		return blank
			? serialized
			: serialized.replace(/^\| *"[\t\n\f\r ]*"$\n?/gm, "");
	};

	/**
	 * @param {string} source html source
	 * @param {HtmlPrint} options print options
	 */
	const keepsTree = (source, options) => {
		// Collapsing is what drops whitespace, which is all it may drop.
		const blank = options.collapseWhitespace === undefined;
		expect(tree(print(source, options), options.fragmentContext, blank)).toBe(
			tree(source, options.fragmentContext, blank)
		);
	};

	const MINIFY = /** @type {const} */ ({ mode: "minify" });
	const BEAUTIFY = /** @type {const} */ ({ mode: "beautify" });
	const ALL = /** @type {const} */ ({
		mode: "minify",
		removeImpliedTags: "all"
	});
	const COLLAPSED = /** @type {const} */ ({
		mode: "minify",
		removeImpliedTags: "all",
		collapseWhitespace: "all"
	});

	describe("what follows an element whose text runs to the end", () => {
		// §13.2.5.7: the tokenizer never leaves the PLAINTEXT state, so an end tag
		// printed after `<plaintext>` — its own or an ancestor's — is its text.
		it.each([
			["an ancestor's end tag", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-what-follows-an-12")],
			["a list item's", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-what-follows-an-9")],
			["a template's", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-what-follows-an-11")],
			["an implied body's", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-what-follows-an-13")],
			["a rebuilt formatting element's", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-what-follows-an-10")],
			["a cell's", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-what-follows-an-8")],
			["the table one was fostered out of", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-what-follows-an-14")]
		])("prints no end tag after it: %s", (_name, source) => {
			for (const options of [BEAUTIFY, MINIFY, COLLAPSED]) {
				// What follows the start tag is the source's: its text, and nothing more.
				const printed = print(source, options);
				expect(printed.slice(printed.indexOf("<plaintext>"))).toBe(
					source.slice(source.indexOf("<plaintext>"))
				);
				keepsTree(source, options);
			}
		});

	});

	describe("a start tag left out where the parser puts its content elsewhere", () => {
		it.each([
			// §13.1.2.4 keeps `<html>` only before a comment, and `<?…>` is a bogus
			// comment to HTML.
			["a processing instruction first in <html>", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-10"), MINIFY],
			["one after </body>", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-15"), ALL],
			["one after </head>", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-16"), ALL],
			["one after </html>", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-17"), ALL],
			// §13.2.6.4.6 hands each of these to the head from "after head".
			["a title opening the body", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-12"), ALL],
			["a base opening it", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-2"), ALL],
			["a bgsound opening it", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-4"), ALL],
			["a basefont opening it", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-3"), ALL],
			["noframes opening it", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-14"), ALL],
			// "In head" reads a `<noscript>` too, before an omitted `</head>`.
			[
				"a noscript opening an implied body",
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-8"),
				BEAUTIFY
			],
			["one behind an ignored body tag", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-18"), MINIFY],
			// The first thing that prints is what decides, past dropped whitespace.
			[
				"a head element behind dropped whitespace",
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-6"),
				COLLAPSED
			],
			["a base behind it", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out"), COLLAPSED],
			[
				"a processing instruction behind it",
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-9"),
				COLLAPSED
			],
			// An `<html>` in foreign content is an element like any other.
			["an svg html element", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-13"), MINIFY],
			["a MathML one", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-7"), MINIFY],
			// Only "in table" implies a `<tbody>` or `<colgroup>`: a template's
			// content takes the `<tr>` / `<col>` as it stands.
			[
				"a tbody in template content",
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-11"),
				MINIFY
			],
			[
				"one behind other content",
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-19"),
				MINIFY
			],
			[
				"a colgroup in template content",
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-start-tag-left-out-5"),
				MINIFY
			]
		])("keeps %s", (_name, source, options) => {
			keepsTree(source, options);
		});

	});

	describe("a fragment", () => {

		it("never writes its root as an `<html>` tag", () => {
			const KEPT = { ...MINIFY, transforms: { comments: true } };
			for (const source of [fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-never"), fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-never-2"), fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-never-3")]) {
				for (const options of [BEAUTIFY, MINIFY, KEPT]) {
					const printed = print(source, { ...options, fragmentContext: "div" });
					expect(printed).not.toMatch(/<\/?html/);
					// Minifying drops the comment, which is all it may change.
					if (options !== MINIFY) {
						keepsTree(source, { ...options, fragmentContext: "div" });
					}
				}
			}
		});

		it.each([
			["svg path", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-is-read-5")],
			[
				"svg path",
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-is-read-4")
			],
			["svg path", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-is-read-3")],
			[
				"select",
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-is-read")
			],
			[
				"table",
				fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-is-read-6")
			],
			["style", fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-fragment-is-read-2")]
		])(
			"is read back in its context, %s, before it is kept: %j",
			(fragmentContext, source) => {
				// A context element reads the same tags as another tree than a document
				// does, so a fragment's print must read back to that tree.
				for (const options of [BEAUTIFY, MINIFY]) {
					keepsTree(source, { ...options, fragmentContext });
				}
			}
		);

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

	describe("text fostered out of a table", () => {
		it("prints what merged into the text before the table", () => {
			// The fostered run joined the text node in front of the table without
			// taking its range along, and both spellings happen to be five long.
			const source = fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-text-fostered-out-of-a-2");
			for (const options of [BEAUTIFY, MINIFY]) {
				expect(print(source, options)).toMatch(
					/^&(?:amp;)?&lt;b(?:&gt;|>)&lt;/
				);
				keepsTree(source, options);
			}
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

		it.each([MINIFY, BEAUTIFY])("still prints the subtree, %o", (options) => {
			// `docs/syntax.md`: a print still writes the whole output, and the node
			// skipped still exits. Its subtree used to print as `undefined`.
			const source = fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-print-that-skips-2");
			const { code, log } = skipping(source, options, NodeType.Element);
			expect(code).toBe(
				options === MINIFY
					? source
					: "<div><b>x</b><template><i>t</i></template></div><p>y</p>"
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
				"-html",
				"-doc"
			]);
		});

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

	it("drops an empty attribute only on an element that defines it", () => {
		// A style the renderer reads as nothing is empty too, however it is spelled.
		expect(
			minify(fixture("html", "source-processor-attribute-values-the-minifier-rewrites-drops-an-empty-attribute-2"), {
				removeEmptyAttributes: true,
				renderEmbeddedSource: R
			})
		).toBe("<p>x<p style=a:b>y");
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

describe("SourceProcessor — runs merged into one", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const R = builtinEmbeddedRenderer();

	/**
	 * @param {string} source html source
	 * @param {import("../../../lib/html/syntax-printer").HtmlPrintOptions=} options print options on top of `mode: "minify"`
	 * @returns {string} the minified document
	 */
	const minify = (source, options) =>
		new SourceProcessor().process(source, { mode: "minify", ...options }).code;

	it("folds a style into the one before only across whitespace and equal attributes", () => {
		expect(
			minify(
				fixture("html", "source-processor-runs-merged-into-one-folds-a-style-into-the-one-before-only"),
				{ mergeStyles: true, renderEmbeddedSource: R }
			)
		).toBe(
			"<p><style>a,b{color:red}</style> x<style>c{color:red}</style>y<style>d{color:red}</style>"
		);
		expect(
			minify(
				fixture("html", "source-processor-runs-merged-into-one-folds-a-style-into-the-one-before-only-2"),
				{ mergeStyles: true, renderEmbeddedSource: R }
			)
		).toBe(
			"<p><style media=print>a,b{color:red}</style><style media=screen>c{color:red}</style><style title=x>d{color:red}</style>"
		);
		// Composed rather than streamed, a template's content folds the same way.
		expect(
			minify(
				fixture("html", "source-processor-runs-merged-into-one-folds-a-style-into-the-one-before-only-3"),
				{ mergeStyles: true, renderEmbeddedSource: R }
			)
		).toBe("<template><style>a,b{color:red}</style></template>");
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

describe("SourceProcessor — tree construction the printer reads back", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const { parseHtml } = require("../../../lib/html/syntax-parser");
	const R = builtinEmbeddedRenderer();

	/** @type {[string, string, import("../../../lib/html/syntax-printer").HtmlProcessOptions & import("../../../lib/html/syntax-printer").HtmlPrintOptions][]} */
	const CASES = [
		// Declarative shadow roots: hosts, and one the adoption agency leaves put.
		[
			"a shadow root on a MathML element",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-shadow-root"),
			{}
		],
		[
			"shadow roots on hosts",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-shadow-roots-on"),
			{}
		],
		[
			"a shadow root the adoption agency leaves on its host",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-shadow-root-2"),
			{}
		],
		// Quirks mode reads `<p><table>` its own way.
		[
			"a 4.01 frameset doctype",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-4-01-frameset"),
			{}
		],
		[
			"a 4.01 transitional doctype",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-4-01"),
			{}
		],
		[
			"a frameset after a comment behind body",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-frameset"),
			{ transforms: { comments: true } }
		],
		["a dd under a foreignObject", fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-dd-under-a"), {}],
		[
			"an end tag form in template content",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-an-end-tag-form"),
			{}
		],
		[
			"an end tag an svg title stops",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-an-end-tag-an"),
			{}
		],
		[
			"identical formatting elements with valueless attributes",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-identical"),
			{}
		],
		[
			"identical ones with referenced values",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-identical-ones"),
			{}
		],
		["formatting behind two markers", fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-formatting"), {}],
		[
			"a nested form under foreign content",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-nested-form"),
			{}
		],
		["an input the table fosters", fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-an-input-the"), {}],
		[
			"a noscript a reader without scripts leaves the head at",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-noscript-a"),
			{ removeImpliedTags: "all" }
		],
		[
			"whitespace a foreignObject keeps",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-whitespace-a"),
			{}
		],
		[
			"empty elements inside a pre",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-empty-elements"),
			{ removeEmptyElements: true }
		],
		[
			"a kept comment behind a template's tbody",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-kept-comment"),
			{ transforms: { comments: true } }
		],
		[
			"a tbody before a tfoot in template content",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-tbody-before"),
			{}
		],
		[
			"an implied tbody kept in template content",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-an-implied"),
			{ transforms: { removeOptionalTags: false } }
		],
		[
			"a rebuilt formatting element in template content",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-rebuilt"),
			{}
		],
		[
			"an svg stylesheet",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-an-svg"),
			{ renderEmbeddedSource: R }
		],
		[
			"a fragment's styles, attributes and booleans read back",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-fragment-s"),
			{
				fragmentContext: "div",
				mergeStyles: true,
				removeRedundantAttributes: "all",
				renderEmbeddedSource: R
			}
		],
		[
			"a `select` fragment's merged styles, read back",
			fixture("html", "source-processor-tree-construction-the-printer-reads-back-prints-a-select"),
			{
				fragmentContext: "select",
				mergeStyles: true,
				removeRedundantAttributes: "all",
				renderEmbeddedSource: R
			}
		]
	];

	it.each(CASES)("prints %s", (_name, source, options) => {
		const { code } = new SourceProcessor().process(source, {
			mode: "minify",
			...options
		});
		expect(code).toMatchSnapshot();
		const beautified = new SourceProcessor().process(source, {
			mode: "beautify",
			fragmentContext: options.fragmentContext
		}).code;
		const read = { fragmentContext: options.fragmentContext, scripting: true };
		expect(serializeHtmlTree(parseHtml(beautified, 0, read))).toBe(
			serializeHtmlTree(parseHtml(source, 0, read))
		);
	});

	it("writes back a NUL a doctype or an instruction holds", () => {
		// The tree reads U+FFFD there; the source's own byte prints, and reads the same.
		for (const source of [fixture("html", "source-processor-tree-construction-the-printer-reads-back-writes-back-a-nul-a"), fixture("html", "source-processor-tree-construction-the-printer-reads-back-writes-back-a-nul-a-2")]) {
			const { code } = new SourceProcessor().process(source, {
				mode: "beautify"
			});
			expect(code).toBe(`${source}</p>`);
			expect(serializeHtmlTree(parseHtml(code))).toBe(
				serializeHtmlTree(parseHtml(source))
			);
		}
	});

	it("reads a raw-text context's end tag as its text", () => {
		for (const source of [fixture("html", "source-processor-tree-construction-the-printer-reads-back-reads-a-raw-text"), fixture("html", "source-processor-tree-construction-the-printer-reads-back-reads-a-raw-text-2"), fixture("html", "source-processor-tree-construction-the-printer-reads-back-reads-a-raw-text-3")]) {
			expect(
				new SourceProcessor().process(source, {
					mode: "minify",
					fragmentContext: "style"
				}).code
			).toBe(source);
		}
	});

	it("walks a document whose text it was told to skip", () => {
		/** @type {string[]} */
		const names = [];
		new SourceProcessor()
			.use({ [NodeType.Element]: (path) => names.push(path.name()) })
			.process(
				fixture("html", "source-processor-tree-construction-the-printer-reads-back-walks-a-document-whose"),
				{
					skip: { text: true }
				}
			);
		expect(names).toEqual([
			"html",
			"head",
			"body",
			"p",
			"pre",
			"p",
			"textarea"
		]);
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

	it("walks an XML document once at its end", () => {
		/** @type {string[]} */
		const names = [];
		new SourceProcessor()
			.use({ [NodeType.Element]: (path) => names.push(path.name()) })
			.process(fixture("html", "source-processor-printing-what-re-parses-to-the-same-tree-a-print-that-skips-3"), { xml: true });
		expect(names).toEqual(["a", "b"]);
	});
});

describe("SourceProcessor — fostered runs no re-nesting reproduces", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const { parseHtml } = require("../../../lib/html/syntax-parser");

	// The run cannot move back inside its table, so the element holding the
	// table prints the source it was built from, between its own tags.
	it.each([
		[
			"text beside a column group the table kept",
			fixture("html", "source-processor-fostered-runs-no-re-nesting-reproduces-keeps-text-beside-a")
		],
		[
			"a holder whose end tag the source wrote after the run",
			fixture("html", "source-processor-fostered-runs-no-re-nesting-reproduces-keeps-a-holder-whose-end")
		],
		[
			"a holder that prints composed",
			fixture("html", "source-processor-fostered-runs-no-re-nesting-reproduces-keeps-a-holder-that")
		]
	])("keeps %s", (_name, source) => {
		const read = { scripting: true };
		for (const mode of /** @type {const} */ (["beautify", "minify"])) {
			// A boolean's value is all the minify may change here.
			const { code } = new SourceProcessor().process(source, {
				mode,
				transforms: { collapseBooleanAttributes: false }
			});
			expect(code).toMatchSnapshot(mode);
			expect(serializeHtmlTree(parseHtml(code, 0, read))).toBe(
				serializeHtmlTree(parseHtml(source, 0, read))
			);
		}
	});
});

describe("SourceProcessor — a foreign stylesheet answered later", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	it("escapes the answer where the body is character data", async () => {
		// An SVG `<style>` holds character data, so a `<` the answer carries is
		// written as a reference there and raw in HTML's own raw-text `<style>`.
		const { code } = await new SourceProcessor().processAsync(
			fixture("html", "source-processor-a-foreign-stylesheet-answered-later-escapes-the-answer-where"),
			{
				mode: "minify",
				renderEmbeddedSource: (
					/** @type {string} */ _source,
					/** @type {{ type: string }} */ info
				) => Promise.resolve(info.type === "css" ? "a<b{}" : undefined)
			}
		);
		expect(code).toBe("<svg><style>a&lt;b{}</style></svg><style>a<b{}</style>");
	});
});

describe("SourceProcessor — what minifying cannot turn into markup", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const htmlMinify = require("../../../lib/html/htmlMinify");

	/**
	 * @param {string} html input markup
	 * @param {object=} options parse options
	 * @returns {string} its tree, as html5lib writes one
	 */
	const tree = (html, options) =>
		serializeHtmlTree(parseHtmlRefs(html, 0, options));

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	it.each([
		[
			"a list item's last child its parent's end tag no longer closes",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-list"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-list-2")
		],
		[
			"a last child under a parent of its own name",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-last"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-last")
		],
		[
			"a list item's child an `<option>` outside a `select` leaves open",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-list-3"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-list-4")
		],
		[
			"an `<optgroup>` no `select` closes",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-an"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-an-2")
		],
		[
			"a bare name before a name opening with `=`",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-bare"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-bare-2")
		],
		[
			"a name opening with `=` after the tag name or an unquoted value",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-name"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-name")
		],
		[
			"a bare name before a name opening with `=`, in a rebuilt clone",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-bare-3"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-bare-4")
		],
		[
			"a bare name ending in a quote, in a tag printed verbatim",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-bare-5"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-bare-6")
		],
		[
			"an HTML element's `/>`, which closes nothing",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-an-3"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-an-4")
		],
		[
			"a dropped duplicate's `/` the tag ends with",
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a"),
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-the-tree-of-a-2")
		]
	])("keeps the tree of %s", (_name, source, expected) => {
		const printed = minify(source);
		expect(printed).toBe(expected);
		expect(tree(printed)).toBe(tree(source));
	});

	it("keeps a template delimiter the source escaped a reference", () => {
		// Text fostered out of a table joins a node without its range, so the
		// source is not all of it and the whole text is printed escaped.
		const fostered =
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-a-template-8");
		expect(tree(minify(fostered))).toBe(tree(fostered));
	});

	it("parses an `<iframe srcdoc>` document in no-quirks mode", async () => {
		// A `<table>` closes the `<p>`, which only quirks mode keeps open.
		/** @type {string[]} */
		const errors = [];
		parseHtmlRefs(fixture("html", "parse-html-source-processor-visits-the-document-root-with-a-null-parent"), 0, {
			srcdoc: true,
			parseError: (_input, code) => errors.push(code)
		});
		// No missing-doctype error either: a srcdoc document may leave it out.
		expect(errors).toEqual([]);
		expect(tree(fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-parses-an-iframe-srcdoc"), { srcdoc: true })).toBe(
			"| <html>\n|   <head>\n|   <body>\n|     <p>\n|     <table>"
		);
		const { code } = await htmlMinify({
			"page.html": '<iframe srcdoc="<p><table></table></p>"></iframe>'
		});
		expect(code).toBe('<iframe srcdoc="<p><table></table><p>"></iframe>');
	});

	it("does not take a placeholder a character reference spells for its own", async () => {
		const page =
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-does-not-take-a");
		const { code } = await htmlMinify({ "page.html": page });
		expect(code).toBe(
			'<iframe srcdoc="<b>q</b>"></iframe><style>a{b:c}</style><p title=\u00000:0\u0000>t'
		);
	});

	it("keeps a `<style>` body as written where the answer would close it", () => {
		const printed = new SourceProcessor().process(
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-a-style-body-as"),
			{
				mode: "minify",
				renderEmbeddedSource: () => "a{b:'</style><b>x</b>'}"
			}
		).code;
		expect(printed).toBe("<style>a { b: c }</style><p>x");
		// Where the end tag falls decides, not how many the answer spells.
		expect(
			new SourceProcessor().process(
				fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-a-style-body-as-2"),
				{
					mode: "minify",
					renderEmbeddedSource: () => 'f("</script><b>")'
				}
			).code
		).toBe('<script>/* </style> */f("<\\/script><b>")</script><p>x');
		// A `</noscript>` the body did not spell would end a `<noscript>` around it.
		/**
		 * @param {string} body the JSON `<script>` body
		 * @param {string} answer what the renderer answers
		 * @returns {string} the printed page
		 */
		const jsonWith = (body, answer) =>
			new SourceProcessor().process(
				`<script type="application/json">${body}</script>`,
				{ mode: "minify", renderEmbeddedSource: () => answer }
			).code;
		expect(jsonWith('{ "a" : 1 }', '{"a":"</noscript>"}')).toBe(
			'<script type=application/json>{ "a" : 1 }</script>'
		);
		expect(jsonWith('{ "a" : "</noscript>" }', '{"a":"</noscript>"}')).toBe(
			'<script type=application/json>{"a":"</noscript>"}</script>'
		);
		expect(
			jsonWith('{ "a" : "</noscript>" }', '{"a":"</noscript></noscript>"}')
		).toBe('<script type=application/json>{ "a" : "</noscript>" }</script>');
		// `</styles` ends nothing, so that answer is printed.
		expect(
			new SourceProcessor().process(fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-a-style-body-as-3"), {
				mode: "minify",
				renderEmbeddedSource: () => "a{b:'</styles'}"
			}).code
		).toBe("<style>a{b:'</styles'}</style>");
	});

	it("keeps a conditional comment's body as written where its print would end the comment", async () => {
		const page =
			fixture("html", "source-processor-what-minifying-cannot-turn-into-markup-keeps-a-conditional");
		const { code } = await htmlMinify({ "page.html": page }, undefined, {
			minifyConditionalComments: true
		});
		expect(code).toBe(page);
	});
});
