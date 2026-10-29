"use strict";

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
				.process("<p>x</p>", { mode: "minify" })
		).toThrow(/already running/);
		// The refusal leaves nothing behind for the next print.
		expect(new SourceProcessor().process("<p> x </p>", { mode: "minify" }).code).toBe(
			"<p> x "
		);
	});
});

describe("SourceProcessor — collapseWhitespace", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization with text whitespace collapsed
	 */
	const collapse = (html) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			collapseWhitespace: true
		}).code;

	it("collapses each run of whitespace to one space, never removing it", () => {
		expect(collapse("<p>a   \t\n b</p>")).toBe("<p>a b");
	});

	it("prints a lone tab as the shorter single space", () => {
		expect(collapse("<p>a\tb</p>")).toBe("<p>a b");
	});

	it("collapses a trailing run", () => {
		expect(collapse("<p>a  b  </p>")).toBe("<p>a b ");
	});

	it("keeps already-collapsed text on the source passthrough", () => {
		expect(collapse("<p>a b</p>")).toBe("<p>a b");
	});

	it("keeps whitespace verbatim under `pre`, at any depth", () => {
		expect(collapse("<pre>a   b</pre>")).toBe("<pre>a   b</pre>");
		expect(collapse("<pre><span>a   b</span></pre>")).toBe(
			"<pre><span>a   b</span></pre>"
		);
	});

	it("keeps text carrying a `<` on the passthrough path", () => {
		expect(collapse("<p><%=   x   %></p>")).toBe("<p><%=   x   %>");
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

	/**
	 * @param {string} html input markup
	 * @returns {string} the serialization with every sheet printed as written
	 */
	const minifyAsWritten = (html) =>
		new SourceProcessor().process(html, { mode: "minify", mergeStyles: true })
			.code;

	it("writes a style attribute whose declarations all drop as bare", () => {
		expect(minify('<p style=" ; ">x</p>')).toBe("<p style>x");
		expect(minify('<p style="/* c */">x</p>')).toBe("<p style>x");
		// Spelled with a reference, the list is minified from its decoded text.
		expect(minify('<p style="&#59;">x</p>')).toBe("<p style>x");
		expect(minify('<p style="color:red">x</p>')).toBe("<p style=color:red>x");
	});

	it("folds a run into one element", () => {
		expect(
			minify("<style>a{color:red}</style><style>b{color:#00f}</style>")
		).toBe("<style>a{color:red}b{color:#00f}</style>");
	});

	it("keeps every element, minified, unless asked to fold", () => {
		const html =
			"<style>a {color: red}</style><style>b {color: #0000ff}</style>";
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
			"<style>a{color:red}</style><style>@import url(x.css);b{color:#00f}</style>";
		expect(minify(html)).toBe(html);
	});

	it("declines to join across a sheet declaring a namespace", () => {
		/**
		 * @param {string} name an at-rule name
		 * @returns {string} the name with every character escaped
		 */
		const escaped = (name) =>
			name.replace(/./g, (char) => `\\${char.charCodeAt(0).toString(16)} `);
		// A namespace applies to the whole sheet declaring it, so a sheet joined
		// after one would read its selectors in it.
		for (const html of [
			"<style>@namespace url(http://www.w3.org/2000/svg);</style><style>p{color:red}</style>",
			"<style>@namespace s url(x);</style><style>s|a{color:red}</style>",
			// An escaped name spells the at-rule it escapes.
			`<style>a{color:red}</style><style>@${escaped(
				"namespace"
			)}url(x);p{color:red}</style>`,
			`<style>a{color:red}</style><style>@${escaped(
				"import"
			)}url(x.css);p{color:red}</style>`,
			`<style>@${escaped(
				"namespace"
			)}url(x);</style><style>p{color:red}</style>`
		]) {
			expect(minifyAsWritten(html)).toBe(html);
		}
	});

	it("still absorbs into a sheet whose own `@import` leads", () => {
		expect(
			minify(
				"<style>@import url(x.css);a{color:red}</style><style>b{color:#00f}</style>"
			)
		).toBe("<style>@import url(x.css);a{color:red}b{color:#00f}</style>");
	});

	it("closes a sheet ending inside a comment before joining it", () => {
		// Appending to text the comment swallows would comment the next sheet out,
		// so it is closed first, as its own end of input closed it.
		const open = "<style>a{color:red}/*x</style><style>b{color:#00f}</style>";
		expect(minifyAsWritten(open)).toBe(
			"<style>a{color:red}/*x*/b{color:#00f}</style>"
		);
		expect(minify(open)).toBe("<style>a{color:red}b{color:#00f}</style>");
		expect(
			minify("<style>a{color:red}/*x*/</style><style>b{color:#00f}</style>")
		).toBe("<style>a{color:red}b{color:#00f}</style>");
	});

	it("closes a sheet ending inside a string before joining it", () => {
		const open = '<style>a{content:"x</style><style>b{color:#00f}</style>';
		expect(minifyAsWritten(open)).toBe(
			'<style>a{content:"x"}b{color:#00f}</style>'
		);
		expect(minify(open)).toBe('<style>a{content:"x"}b{color:#00f}</style>');
		// A newline ends a bad string, so this one is over where the sheet is.
		expect(
			minify('<style>a{content:"x\n}</style><style>b{color:#00f}</style>')
		).toBe('<style>a{content:"x\n}b{color:#00f}</style>');
		// An escaped quote is a character of the string, not its end.
		expect(
			minify('<style>a{content:"x\\"y"}</style><style>b{color:#00f}</style>')
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
					'<style>a{content:"x\n;color:blue}</style><style>b{color:red}</style>'
				)
			);
		}
	);

	it("reads an escape outside a string as one too", () => {
		// Were the quote not escaped it would open a string running to the end; as
		// it is, the escape starts a rule the sheet does not finish, closed with `{}`.
		expect(
			minify('<style>a{color:red}\\"</style><style>b{color:#00f}</style>')
		).toBe("<style>a{color:red}b{color:#00f}</style>");
	});

	it("closes a sheet left inside a bracket before joining it", () => {
		const block = "<style>a{color:red</style><style>b{color:#00f}</style>";
		const call =
			"<style>a{color:rgb(1,2,3}</style><style>b{color:#00f}</style>";
		expect(minifyAsWritten(block)).toBe(
			"<style>a{color:red}b{color:#00f}</style>"
		);
		expect(minifyAsWritten(call)).toBe(
			"<style>a{color:rgb(1,2,3})}b{color:#00f}</style>"
		);
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
			"<style>a{color:red}</style><style>b{color:red}</style>"
		);
		expect(once).toBe("<style>a,b{color:red}</style>");
		expect(minify(once)).toBe(once);
	});

	it("joins a blank sheet as nothing", () => {
		const once = minify("<style> </style><style>b{color:red}</style>");
		expect(once).toBe("<style>b{color:red}</style>");
		expect(minify(once)).toBe(once);
		expect(minify("<style> </style><style>  </style>")).toBe(
			"<style>   </style>"
		);
	});

	it("reads the attributes each sheet will print, not the ones it holds", () => {
		const html =
			'<style type="text/css">a{color:red}</style><style>b{color:#00f}</style>';
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
			minify("<body><style>a{color:red}</style>x<style>b{color:#00f}</style>")
		).toBe(
			"<body><style>a{color:red}</style>x<style>b{color:#00f}</style></body>"
		);
	});

	it("reads a sheet's closed comment, escape and escaped quote as closed", () => {
		for (const sheet of [
			"a{}/* x */",
			".a\\{b{}",
			'a{content:"\\""}',
			"a[x]{}",
			// §5.4.8: a `]` in a `(` is a token in it, not the block's end.
			"a{b:(])}"
		]) {
			expect(minifyAsWritten(`<style>${sheet}</style><style>b{}</style>`)).toBe(
				`<style>${sheet}b{}</style>`
			);
		}
		// Nothing follows the last sheet, so it may be left open; one that leads
		// with `@import` is not joined, and one before it is closed first.
		expect(minifyAsWritten('<style>a{}</style><style>b{c:"d</style>')).toBe(
			'<style>a{}b{c:"d</style>'
		);
		for (const [html, printed] of [
			[
				"<style>a{}</style><style>@import url(x.css);</style>",
				"<style>a{}</style><style>@import url(x.css);</style>"
			],
			['<style>b{c:"d</style><style>a{}</style>', '<style>b{c:"d"}a{}</style>'],
			["<style>a{}b</style><style>c{}</style>", "<style>a{}b{}c{}</style>"],
			[
				"<style>@import url(x)</style><style>c{}</style>",
				"<style>@import url(x);c{}</style>"
			],
			["<style>a{}}</style><style>c{}</style>", "<style>a{}}{}c{}</style>"],
			// A custom property's value the input ran out in is kept as written, so
			// nothing is appended to it.
			[
				"<style>a{--x:f(</style><style>c{}</style>",
				"<style>a{--x:f(</style><style>c{}</style>"
			]
		]) {
			expect(minifyAsWritten(html)).toBe(printed);
		}
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
		// A lone backslash would escape whatever followed, so nothing is joined.
		expect(minify("<style>a\\</style><style>c{color:#00f}</style>")).toBe(
			"<style></style><style>c{color:#00f}</style>"
		);
		expect(
			minify('<style>a{b:"x\\</style><style>c{color:#00f}</style>')
		).toContain("</style><style>c{color:#00f}</style>");
		// A rule, an at-rule's `;` and a CDC each end where a rule may start.
		expect(
			minifyAsWritten(
				"<style>@import url(x);</style><style><!-- a{} --></style><style>b{}</style>"
			)
		).toBe("<style>@import url(x);<!-- a{} -->b{}</style>");
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
		expect(emptying("<style>a{}</style><style>b{color:red}</style>")).toBe(
			"<style>b{color:red}</style>"
		);
		expect(emptying("<style>a{}</style><style>b{}</style>")).toBe("");
		expect(
			emptying("<style>a{}</style><style>@import url(x.css);</style>")
		).toBe("<style>@import url(x.css);</style>");
		expect(emptying('<style>a{}</style><style>b{c:"d</style>')).toBe(
			'<style>b{c:"d"}</style>'
		);
		// A sheet printed open is not joined, so it prints in its own element.
		const { code } = new SourceProcessor().process(
			"<style>a{}</style><style>b{}</style>",
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
				"<style>a{}</style><style>b{color:red}</style>",
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
			"<style>a{color:red}</style><style> </style><style>b{color:red}</style>",
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

	it("folds a run into one element", () => {
		expect(minify("<script>a()</script><script>b()</script>")).toBe(
			"<script>a()\n;b()</script>"
		);
		expect(
			minify("<script>a()</script><script>b()</script><script>c()</script>")
		).toBe("<script>a()\n;b()\n;c()</script>");
	});

	it("keeps every element unless asked to fold", () => {
		const html = "<script>a()</script><script>b()</script>";
		expect(new SourceProcessor().process(html, { mode: "minify" }).code).toBe(
			html
		);
	});

	it("folds across the whitespace between them", () => {
		expect(minify("<script>a()</script>\n  <script>b()</script>")).toBe(
			"<script>a()\n;b()</script>"
		);
	});

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
		expect(minify("<script>a()</script><p>x</p><script>b()</script>")).toBe(
			"<script>a()</script><p>x</p><script>b()</script>"
		);
		// A comment this print drops leaves them adjacent, so it is not what
		// stands between them; one the print keeps still is.
		expect(minify("<script>a()</script><!--c--><script>b()</script>")).toBe(
			"<script>a()\n;b()</script>"
		);
		expect(
			scriptCount(
				"<script>a()</script><style>a{color:red}</style><script>b()</script>"
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

	it("folds a body ending in a line comment, which the newline closes", () => {
		expect(minify("<script>a() // note</script><script>b()</script>")).toBe(
			"<script>a() // note\n;b()</script>"
		);
		// An HTML-like open comment runs to the end of the line just as `//` does.
		expect(minify("<script>a() <!-- note</script><script>b()</script>")).toBe(
			"<script>a() <!-- note\n;b()</script>"
		);
	});

	it("writes the `;` a next body would otherwise continue", () => {
		for (const [second, joined] of [
			["(function(){})()", "(function(){})()"],
			["[1].forEach(f)", "[1].forEach(f)"],
			["`x`", "`x`"],
			["+1", "+1"],
			["-1", "-1"],
			["/re/.test(x)", "/re/.test(x)"]
		]) {
			expect(
				minify(`<script>var a = 1</script><script>${second}</script>`)
			).toBe(`<script>var a = 1\n;${joined}</script>`);
		}
	});

	it("reads a closed string, template or comment as closed", () => {
		expect(
			minify('<script>var s = "a</script\'"</script><script>b()</script>')
		).toBe('<script>var s = "a</script\'"\n;b()</script>');
		expect(minify("<script>/* done */a()</script><script>b()</script>")).toBe(
			"<script>/* done */a()\n;b()</script>"
		);
		expect(minify("<script>var t = `x`</script><script>b()</script>")).toBe(
			"<script>var t = `x`\n;b()</script>"
		);
		// An escaped quote does not close the string it sits in.
		expect(minify('<script>var s = "a\\""</script><script>b()</script>')).toBe(
			'<script>var s = "a\\""\n;b()</script>'
		);
		// A substitution holding a quote of its own leaves the template closed.
		/* eslint-disable no-template-curly-in-string */
		expect(
			minify('<script>var t = `${ "x" }`</script><script>b()</script>')
		).toBe('<script>var t = `${ "x" }`\n;b()</script>');
		/* eslint-enable no-template-curly-in-string */
	});

	it("declines a body that opens a script of its own", () => {
		// A prologue means something only at a script's start: appended it is a
		// plain string, and leading it puts the whole run in strict mode.
		const strictLater =
			'<script>var a = 1</script><script>"use strict";x = 1</script>';
		expect(minify(strictLater)).toBe(strictLater);
		const strictFirst = '<script>"use strict";a()</script><script>b()</script>';
		expect(minify(strictFirst)).toBe(strictFirst);
		const singleQuoted =
			"<script>a()</script><script>'use strict';b()</script>";
		expect(minify(singleQuoted)).toBe(singleQuoted);
		// Comments may precede a prologue, so they are read past to find it.
		const afterComment =
			'<script>a()</script><script>/* c */ "use strict";b()</script>';
		expect(minify(afterComment)).toBe(afterComment);
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
		// A hashbang is only a hashbang at the very start of a script.
		const hashbang =
			"<script>a()</script><script>#!/usr/bin/env node\nb()</script>";
		expect(minify(hashbang)).toBe(hashbang);
		expect(
			scriptCount("<script>a()</script><script>\uFEFF#!/x\nb()</script>")
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

	it("folds a `-->` that keeps the line it had", () => {
		// Already on a line of its own, so appending moves nothing.
		expect(minify("<script>a()</script><script>\n--> b()</script>")).toBe(
			"<script>a()\n;\n--> b()</script>"
		);
		// A block comment spanning a terminator ends the line it opened.
		expect(
			minify("<script>a()</script><script>/* c\n*/ --> b()</script>")
		).toBe("<script>a()\n;/* c\n*/ --> b()</script>");
		// Past the first line it is a comment either way.
		expect(minify("<script>a()</script><script>b()\n--> c()</script>")).toBe(
			"<script>a()\n;b()\n--> c()</script>"
		);
	});

	it("declines an empty element, which has no text node to fold into", () => {
		expect(minify("<script>a()</script><script></script>")).toBe(
			"<script>a()</script><script></script>"
		);
		// The empty one breaks the run rather than being folded through.
		expect(
			minify("<script>a()</script><script></script><script>b()</script>")
		).toBe("<script>a()</script><script></script><script>b()</script>");
	});

	it("folds a body that is only whitespace", () => {
		expect(minify("<script>a()</script><script> </script>")).toBe(
			"<script>a()\n; </script>"
		);
	});

	it("leaves a script in foreign content alone", () => {
		const svg = "<svg><script>a()</script><script>b()</script></svg>";
		expect(minify(svg)).toBe(svg);
	});

	it("stops a run at the first body it cannot take", () => {
		// `a()` and `b()` join; the open string ends the run before `c()`.
		expect(
			minify(
				"<script>a()</script><script>b()</script><script>var s = 'open</script><script>c()</script>"
			)
		).toBe(
			"<script>a()\n;b()</script><script>var s = 'open</script><script>c()</script>"
		);
	});

	it("folds a run in the head as readily as one in the body", () => {
		expect(
			minify(
				"<!doctype html><html><head><script>a()</script><script>b()</script></head><body>x</body></html>"
			)
		).toBe(
			"<!doctype html><head><script>a()\n;b()</script></head><body>x</body></html>"
		);
	});

	it("folds scripts and sheets in one pass without confusing the two", () => {
		expect(
			new SourceProcessor().process(
				"<style>a{color:red}</style><style>b{color:blue}</style><script>a()</script><script>b()</script>",
				{ mode: "minify", mergeStyles: true, mergeScripts: true }
			).code
		).toBe(
			"<style>a{color:red}b{color:blue}</style><script>a()\n;b()</script>"
		);
	});

	// `output.html.inline` prints a sentinel and swaps the chunk's code in after
	// the print, so what a guard would read there is not what ends up running.
	it("declines a run whose bodies the print does not itself write", () => {
		const html = "<script>a()</script><script>b()</script>";
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
			processor.process("<script>a()</script><script>b()</script>", {
				mode: "minify",
				mergeScripts: true
			}).code
		).toBe("<script>a()\n;b()</script>");
		const off = "<script>c()</script><script>d()</script>";
		expect(processor.process(off, { mode: "minify" }).code).toBe(off);
	});

	// Deliberate, and stated in the option's description: a fold is one script
	// where there were several, so these follow from that rather than from a bug.
	describe("what folding a run is known to change", () => {
		it("hoists a later body's declarations into the ones before it", () => {
			expect(
				minify("<script>log(typeof f)</script><script>function f(){}</script>")
			).toBe("<script>log(typeof f)\n;function f(){}</script>");
		});

		it("puts every body of a run behind the first one's failure", () => {
			expect(minify("<script>a();null.x</script><script>b()</script>")).toBe(
				"<script>a();null.x\n;b()</script>"
			);
		});
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
			'<script type="application/ld+json">{ "a" : "<!--<script>" , "b" : "</script>" }</script>'
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
			'<script type="text&#47;javascript">var a = 1</script>'
		);

		expect(offered).toEqual(["var a = 1"]);
		expect(code).toBe("<script type=text/javascript>rendered</script>");
	});

	it("offers no data block whose type is spelled with a reference", () => {
		const { code, offered } = withRenderer(
			'<script type="text&#47;x-template">  x  </script>'
		);

		expect(offered).toEqual([]);
		expect(code).toBe("<script type=text/x-template>  x  </script>");
	});

	it("drops a redundant type spelled with a reference", () => {
		// The same reading as the body: what the parser sees is `text/javascript`,
		// which is what the element runs anyway.
		const minify = (/** @type {string} */ html) =>
			new SourceProcessor().process(html, {
				mode: /** @type {"minify"} */ ("minify"),
				removeRedundantAttributes: /** @type {"smart"} */ ("smart")
			}).code;
		expect(minify('<script type="text/javascript">var a = 1</script>')).toBe(
			"<script>var a = 1</script>"
		);
		expect(
			minify('<script type="text&#47;javascript">var a = 1</script>')
		).toBe("<script>var a = 1</script>");
		// A data block's type is what tells it apart from a script, so it stays.
		expect(minify('<script type="text&#47;x-template">x</script>')).toBe(
			"<script type=text/x-template>x</script>"
		);
	});
});

describe("SourceProcessor — collapseWhitespace modes", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {boolean | "conservative" | "smart" | "all"} mode the mode
	 * @returns {string} the minified serialization
	 */
	const collapse = (html, mode) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			collapseWhitespace: mode
		}).code;

	const PAGE = "<body><div>  a   b  </div>\n  <div> c </div><span> d </span>";

	it("reads `true` as `conservative`, which never removes whitespace", () => {
		expect(collapse(PAGE, true)).toBe(collapse(PAGE, "conservative"));
		expect(collapse(PAGE, "conservative")).toBe(
			"<body><div> a b </div> <div> c </div><span> d </span></body>"
		);
	});

	it("drops what sits against a block edge in `smart`", () => {
		// Inside and after a `<div>` no line box reaches the whitespace; the
		// `<span>`'s own spaces render, so they stay.
		expect(collapse(PAGE, "smart")).toBe(
			"<body><div>a b</div><div>c</div><span> d </span></body>"
		);
	});

	it("drops every text node's edges in `all`", () => {
		expect(collapse(PAGE, "all")).toBe(
			"<body><div>a b</div><div>c</div><span>d</span></body>"
		);
	});

	it("leaves whitespace verbatim where it renders, in every mode", () => {
		for (const mode of /** @type {(boolean | "conservative" | "smart" | "all")[]} */ ([
			true,
			"conservative",
			"smart",
			"all"
		])) {
			expect(collapse("<pre>  a   b  </pre>", mode)).toBe(
				"<pre>  a   b  </pre>"
			);
		}
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

	const html = "<div><!-- @license MIT --><!-- chatter --></div>";
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
			"<div><!--[if IE]>a<![endif]--></div>",
			"[if IE]"
		],
		["a server-side include", "<div><!--#include a--></div>", "#include"],
		["a template directive", "<div><?php echo 1; ?></div>", "php"]
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
		expect(minify('<ol type="A"><li>x</ol>')).toContain("type=A");
		expect(minify('<div id="MyId" class="MyClass">')).toContain(
			"id=MyId class=MyClass"
		);
	});

	it("leaves a keyword the engine reflects verbatim alone", () => {
		// `target` / `formtarget`, `<area shape>` and `<textarea wrap>` are
		// enumerated, but their IDL members reflect what was written rather than
		// the canonical keyword, so a script reading one back would see the fold.
		expect(minify('<a target="_TOP" href=x>l</a>')).toContain("target=_TOP");
		expect(minify('<form target="_BLANK">')).toContain("target=_BLANK");
		expect(minify('<button formtarget="_SELF">b</button>')).toContain(
			"formtarget=_SELF"
		);
		expect(minify('<map><area shape="RECT"></map>')).toContain("shape=RECT");
		expect(minify('<textarea wrap="SOFT"></textarea>')).toContain("wrap=SOFT");
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
		expect(minify('<img decoding="ZzCustomZz" alt="a">')).toContain(
			"decoding=ZzCustomZz"
		);
		expect(minify('<map><area shape="ZzCustomZz"></map>')).toContain(
			"shape=ZzCustomZz"
		);
	});

	it("keeps it where the switch is not `all`", () => {
		const out = new SourceProcessor().process('<input type="ZzCustomZz">', {
			mode: "minify",
			removeRedundantAttributes: "smart"
		}).code;
		expect(out).toContain("type=ZzCustomZz");
	});
});

describe("SourceProcessor — optional end tags read the output", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {object=} options extra print options
	 * @returns {string} the minified serialization
	 */
	const minify = (html, options) =>
		new SourceProcessor().process(html, { mode: "minify", ...options }).code;

	const LIST = "<ul>\n<li><p>a</p>\n</li>\n<li><p>b</p>\n</li>\n</ul>";

	it("keeps a `</p>` a quirks-mode `<table>` would not close", () => {
		// A `<table>` start tag closes an open `p` only outside quirks mode, so
		// there the two would nest instead of staying siblings.
		expect(minify("<table><p>")).toBe("<p></p><table></table>");
		expect(minify("<!doctype html><table><p>")).toBe(
			"<!doctype html><p><table></table>"
		);
	});

	it("keeps a `</caption>` whitespace behind it would move inside", () => {
		// §4.13 lets a `caption` end tag go only when what follows is an element:
		// whitespace or a comment would land inside the caption without it.
		expect(minify("<table><caption>x</caption> ")).toBe(
			"<table><caption>x</caption> </table>"
		);
	});

	it("reads past whitespace the collapse tier deletes", () => {
		// The `\n` after each `</p>` is content in the tree and nothing in the
		// output, so the tag it was keeping alive goes with it.
		expect(minify(LIST, { collapseWhitespace: "smart" })).toBe(
			"<ul><li><p>a<li><p>b</ul>"
		);
		expect(minify(LIST, { collapseWhitespace: "all" })).toBe(
			"<ul><li><p>a<li><p>b</ul>"
		);
	});

	it("keeps the tag when that whitespace is printed", () => {
		// `"conservative"` prints one space, and off prints it verbatim; either
		// way something stands between the tag and the parent's end.
		expect(minify(LIST, { collapseWhitespace: "conservative" })).toBe(
			"<ul> <li><p>a</p> </li> <li><p>b</p> </li> </ul>"
		);
		expect(minify(LIST)).toBe(LIST);
	});

	it("keeps the tag when an ancestor renders the whitespace verbatim", () => {
		// The `\n` still prints, so the `</li>` in front of it stays; only the
		// last one goes, on the rule that its parent's end follows it.
		expect(
			minify("<pre><ul><li>a</li>\n<li>b</li></ul></pre>", {
				collapseWhitespace: "all"
			})
		).toBe("<pre><ul><li>a</li>\n<li>b</ul></pre>");
	});

	it("reads past a comment minifying drops", () => {
		expect(minify("<ul><li>a</li><!--c--><li>b</li></ul>")).toBe(
			"<ul><li>a<li>b</ul>"
		);
	});

	it("keeps the tag for a comment minifying keeps", () => {
		expect(
			minify("<ul><li>a</li><!--keep--><li>b</li></ul>", {
				transforms: { comments: "keep" }
			})
		).toBe("<ul><li>a</li><!--keep--><li>b</ul>");
	});

	it("still keeps a tag before printed text", () => {
		expect(minify("<ul><li>a</li>tail</ul>")).toBe("<ul><li>a</li>tail</ul>");
	});

	it("scans both ways past whitespace the tier drops", () => {
		// Skipping it forward but not back drops `</thead>` and the implied
		// `<tbody>` together, and the rows re-parse into the head.
		const table = "<table><thead><tr><th>h</thead>\n<tbody><tr><td>d</table>";
		expect(minify(table, { collapseWhitespace: "all" })).toBe(
			"<table><thead><tr><th>h<tbody><tr><td>d</table>"
		);
		expect(minify(table)).toBe(
			"<table><thead><tr><th>h</thead>\n<tr><td>d</table>"
		);
	});
});

describe("SourceProcessor — an empty value is the bare name", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	it("prints any empty value as the name alone", () => {
		expect(minify('<div title="" lang="" data-x=\'\'>x</div>')).toBe(
			"<div title lang data-x>x</div>"
		);
		expect(minify('<iframe sandbox=""></iframe>')).toBe(
			"<iframe sandbox></iframe>"
		);
	});

	it("does it in foreign content too", () => {
		// The tokenizer's after-attribute-name state reads the `/` as the tag's,
		// not as part of the name, so a self-closing tag needs nothing extra.
		expect(minify('<svg><rect x=""/></svg>')).toBe("<svg><rect x/></svg>");
		expect(minify('<math><mi x=""></mi></math>')).toBe(
			"<math><mi x></mi></math>"
		);
	});

	it("writes out a value a reference only spells as whitespace", () => {
		// A reference is how the value is written, not what it says: the element
		// is handed the same one space either way, so the shorter spelling wins.
		expect(minify('<div title="&#x20;">x</div>')).toBe(
			'<div title=" ">x</div>'
		);
	});

	it("reads a reference-spelled empty as empty when dropping them", () => {
		/**
		 * @param {string} html input markup
		 * @returns {string} the minified serialization
		 */
		const drop = (html) =>
			new SourceProcessor().process(html, {
				mode: "minify",
				removeEmptyAttributes: true
			}).code;
		expect(drop('<div class="&#x20;">x</div>')).toBe("<div>x</div>");
		expect(drop('<div class=" ">x</div>')).toBe("<div>x</div>");
	});

	it("prints a boolean attribute repeating its own name as the name", () => {
		expect(minify('<input disabled="disabled" checked="CHECKED">')).toBe(
			"<input disabled checked>"
		);
	});

	it("keeps a same-length value that is not the name", () => {
		// `_isBooleanAttribute` is asked before the fold, so a value only as long
		// as the name still has to be compared against it.
		expect(minify('<input checked="chicken">')).toBe("<input checked=chicken>");
	});
});

describe("SourceProcessor — removeEmptyElements reads the output", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {object=} options extra print options
	 * @returns {string} the minified serialization
	 */
	const minify = (html, options) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			removeEmptyElements: true,
			...options
		}).code;

	it("drops a run of nested empties together", () => {
		expect(minify("<div><div><div></div></div></div>")).toBe("");
		// An empty `<p>` still has its margins, so only what is inside it goes.
		expect(minify("<div><span></span></div><p><em></em></p>")).toBe("<p>");
	});

	it.each([
		["<button></button>", "<button></button>"],
		["<select></select>", "<select></select>"],
		[
			"<select><option></option><option>a</option></select>",
			"<select><option><option>a</select>"
		],
		[
			"<select><button><selectedcontent></selectedcontent></button><option>a</option></select>",
			"<select><button><selectedcontent></selectedcontent></button><option>a</select>"
		],
		["<ul><li></li></ul>", "<ul><li></ul>"],
		["<iframe></iframe>", "<iframe></iframe>"],
		["<video></video>", "<video></video>"],
		["<details></details>", "<details></details>"],
		["<fieldset></fieldset>", "<fieldset></fieldset>"],
		["<q></q>", "<q></q>"],
		["<app-root></app-root>", "<app-root></app-root>"],
		["<x-widget></x-widget>", "<x-widget></x-widget>"]
	])("keeps %s, which renders or is read without children", (body, printed) => {
		expect(minify(body)).toBe(printed);
	});

	it("drops one left empty by a comment going", () => {
		expect(minify("<div><!--c--></div>")).toBe("");
	});

	it.each([
		["<p>x</p><span></span><form></form>", "<p>x<form></form>"],
		["<p>a<hr></p><div>x</div>", "<p>a<hr><p><div>x</div>"],
		["<p>a<hr></p> <div>x</div>", "<p>a<hr><p></p> <div>x</div>"]
	])("omits the end tags in %s that its own output would", (body, printed) => {
		expect(minify(body)).toBe(printed);
		expect(minify(printed)).toBe(printed);
	});

	it("keeps one that spells an attribute, whatever it holds", () => {
		expect(minify("<div><span></span><span id=k></span></div>")).toBe(
			"<div><span id=k></span></div>"
		);
		expect(minify("<div class=x></div>")).toBe("<div class=x></div>");
	});

	it("keeps one whose child still prints", () => {
		expect(minify("<div><canvas></canvas></div>")).toBe(
			"<div><canvas></canvas></div>"
		);
		expect(minify("<div><span>x</span></div>")).toBe(
			"<div><span>x</span></div>"
		);
	});

	it("follows the collapse tier for a whitespace child", () => {
		expect(minify("<div> </div>")).toBe("<div> </div>");
		expect(minify("<div> </div>", { collapseWhitespace: "all" })).toBe("");
	});

	it("keeps one whose whitespace is data rather than layout", () => {
		// A literal-text body is written as it is meant to be read, so whitespace
		// there leaves the element non-empty at every tier.
		for (const name of ["style", "script", "iframe", "noframes"]) {
			const html = `<div><${name}> </${name}></div>`;
			expect(minify(html, { collapseWhitespace: "all" })).toBe(html);
		}
		expect(
			minify("<div><pre>  </pre></div>", { collapseWhitespace: "all" })
		).toBe("<div><pre>  </pre></div>");
	});

	it("keeps foreign content, whose whitespace it cannot read", () => {
		expect(minify("<div><svg> </svg></div>")).toBe("<div><svg> </svg></div>");
	});

	it("drops a head holding nothing but whitespace", () => {
		// Nothing renders what sits directly in `<head>`, whatever the tier says.
		expect(minify("<head> </head><body>x")).toBe("<body>x</body>");
	});
});

describe("SourceProcessor — removeImpliedTags", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	const PAGE =
		"<!doctype html><html><head><title>t</title></head><body><ul><li>a</li></ul></body></html>";

	/**
	 * @param {(boolean | "smart" | "all")=} removeImpliedTags the mode
	 * @returns {string} the minified serialization
	 */
	const minify = (removeImpliedTags) =>
		new SourceProcessor().process(PAGE, { mode: "minify", removeImpliedTags })
			.code;

	it("leaves out only the <html> start tag by default", () => {
		// `</html>` stays with it: a reader checking the page downloaded whole
		// looks for one, and only the start tag is what nothing matches on.
		expect(minify()).toBe(
			"<!doctype html><head><title>t</title></head><body><ul><li>a</ul></body></html>"
		);
		expect(minify("smart")).toBe(minify());
	});

	it("leaves out all six when asked", () => {
		expect(minify(true)).toBe("<!doctype html><title>t</title><ul><li>a</ul>");
		expect(minify("all")).toBe(minify(true));
	});

	it("keeps all three when off, and the other optional tags still go", () => {
		// Every optional tag but these three is dropped whatever the option says:
		// nothing can observe that, and only these three are what a consumer
		// reading the page with a regexp looks for.
		expect(minify(false)).toBe(
			"<!doctype html><html><head><title>t</title></head><body><ul><li>a</ul></body></html>"
		);
	});

	it("materializes an implied tag whose content opens with whitespace", () => {
		// Before `<body>` has started the insertion modes drop leading whitespace,
		// so dropping the tag too would lose the text node re-parsing must keep.
		expect(
			new SourceProcessor().process("<!doctype html><body> <p>x", {
				mode: "minify",
				removeImpliedTags: true
			}).code
		).toBe("<!doctype html><body> <p>x");
	});

	it("materializes an implied tag whose content opens in the head", () => {
		// A start tag `inBody` ignores still closed `<head>` on the way there, so
		// what follows it belongs to `<body>`; dropping the tag too would send it
		// back to the head the insertion modes had already left (§13.2.6.4.6).
		expect(
			new SourceProcessor().process("<tr><style>a{color:red}</style>", {
				mode: "minify",
				removeImpliedTags: true
			}).code
		).toBe("<body><style>a{color:red}</style>");
	});

	it("materializes an implied tag whose content opens with a comment", () => {
		// A comment there goes further out than a head element does: the modes put
		// it in the element above the body, so it leaves the body altogether.
		expect(
			new SourceProcessor().process("<tr><!--c--><p>x", {
				mode: "minify",
				removeImpliedTags: true,
				transforms: { comments: /c/ }
			}).code
		).toBe("<body><!--c--><p>x");
	});

	// A `<li>` closes the item it is a sibling of, and no item held below a
	// list-item-scope boundary — a list it nests into, or the cell it sits in.
	describe("a later <li> against a list-item-scope boundary", () => {
		/**
		 * @param {string} html the source
		 * @returns {string} the minified serialization
		 */
		const item = (html) =>
			new SourceProcessor().process(html, {
				mode: "minify",
				removeImpliedTags: true
			}).code;

		it("omits the end tag of the item it is a sibling of", () => {
			expect(item("<ul><li>a</li><li>b</li></ul>")).toBe("<ul><li>a<li>b</ul>");
			expect(item("<li>a</li><li>b</li>")).toBe("<li>a<li>b");
		});

		it("keeps the end tag of an item the nested list holds", () => {
			// The `<script>` after the nested item is content its end tag cannot be
			// omitted in front of, so only the outer `<li>c` closes a sibling.
			expect(
				item("<ul><li>a<ul><li>b</li><script></script></ul><li>c</li></ul>")
			).toBe("<ul><li>a<ul><li>b</li><script></script></ul><li>c</ul>");
			expect(item("<ul><li>a<ul><li>b</li>tail</ul><li>c</li></ul>")).toBe(
				"<ul><li>a<ul><li>b</li>tail</ul><li>c</ul>"
			);
		});

		it("omits it where the nested item ends its own list", () => {
			expect(item("<ul><li>a<ul><li>b</li></ul><li>c</li></ul>")).toBe(
				"<ul><li>a<ul><li>b</ul><li>c</ul>"
			);
		});

		it("keeps the end tag of an item another cell holds", () => {
			expect(
				item(
					"<table><tr><td><ul><li>a</li><script></script></ul><td><ul><li>b</li></ul></table>"
				)
			).toBe(
				"<table><tr><td><ul><li>a</li><script></script></ul><td><ul><li>b</ul></table>"
			);
			expect(
				item(
					"<table><tr><th><ol><li>a</li></ol><th><ol><li>b</li></ol></table>"
				)
			).toBe("<table><tr><th><ol><li>a</ol><th><ol><li>b</ol></table>");
		});
	});

	it("keeps a <html> that carries an attribute", () => {
		expect(
			new SourceProcessor().process("<html lang=en><body>x", { mode: "minify" })
				.code
		).toBe("<html lang=en><body>x</body></html>");
	});

	it("invents no </html> for a source that spelled no <html>", () => {
		expect(new SourceProcessor().process("<p>a", { mode: "minify" }).code).toBe(
			"<p>a"
		);
	});

	/**
	 * @param {string} html markup
	 * @returns {string} the minified serialization, every optional tag dropped
	 */
	const minifyAll = (html) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			removeImpliedTags: "all"
		}).code;

	it("keeps the tag whitespace behind it would re-parse into", () => {
		// A space opening the body lands in the head without `<body>`.
		expect(
			minifyAll("<html><head><title>t</title></head><body> text</body></html>")
		).toBe("<title>t</title><body> text");
	});

	it("drops a shell tag over whitespace that prints nothing", () => {
		// Whitespace inside `<head>`, or behind `</head>`, sits outside every
		// block formatting context, so no tier prints it and no tag guards it.
		expect(
			minifyAll("<html><head>\n<title>t</title>\n</head><body>x</body></html>")
		).toBe("<title>t</title>x");
		expect(
			minifyAll("<html><head><title>t</title></head> <body>x</body></html>")
		).toBe("<title>t</title>x");
	});

	it("looks past a comment it is about to drop", () => {
		expect(
			minifyAll("<html><head><title>t</title></head><!--c--><body>x</body>")
		).toBe("<title>t</title>x");
		// One it keeps stays behind the tag, so the tag stays too.
		expect(
			minifyAll("<html><head><title>t</title></head><!--[if IE]>i<![endif]-->x")
		).toBe("<title>t</title></head><!--[if IE]>i<![endif]-->x");
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

	// One input per switch, minified twice: everything on, and that one switch
	// off — so a guard that stops firing fails here rather than quietly making
	// the rewrite unconditional. `comments` is not a boolean; it has its own.
	it.each([
		[
			"collapseBooleanAttributes",
			'<input disabled="disabled">',
			"<input disabled>",
			// `quotes` is still on, so the value it keeps goes bare.
			"<input disabled=disabled>"
		],
		[
			"normalizeEnumeratedAttributes",
			'<input type="TEXT">',
			"<input type=text>",
			"<input type=TEXT>"
		],
		[
			"normalizeListAttributes",
			'<div class="  b   a ">x</div>',
			'<div class="b a">x</div>',
			'<div class="  b   a ">x</div>'
		],
		[
			"normalizeNumericAttributes",
			'<div tabindex=" 03 ">x</div>',
			"<div tabindex=3>x</div>",
			'<div tabindex=" 03 ">x</div>'
		],
		[
			"removeOptionalTags",
			"<ul><li>a<li>b</ul>",
			"<ul><li>a<li>b</ul>",
			"<ul><li>a</li><li>b</li></ul>"
		],
		[
			"normalizeAttributeQuotes",
			'<div data-x="plain">t</div>',
			"<div data-x=plain>t</div>",
			'<div data-x="plain">t</div>'
		],
		// An empty value written as the bare name is the `=""` going, which is the
		// same decision.
		[
			"normalizeAttributeQuotes (empty value)",
			'<div class="">t</div>',
			"<div class>t</div>",
			'<div class="">t</div>'
		]
	])("%s", (name, html, on, off) => {
		const key = name.replace(/ .*/, "");
		expect(minify(html)).toBe(on);
		expect(minify(html, { [key]: false })).toBe(off);
	});

	// Turning one off leaves the rest alone, which is the whole point of naming
	// them one at a time.
	it("leaves every other rewrite on", () => {
		expect(
			minify('<input disabled="disabled" tabindex=" 03 ">', {
				collapseBooleanAttributes: false
			})
		).toBe("<input disabled=disabled tabindex=3>");
	});

	it("takes an absent option as every rewrite on", () => {
		expect(minify("<div>a</div><!-- c -->", {})).toBe("<div>a</div>");
		expect(minify("<div>a</div><!-- c -->", undefined)).toBe("<div>a</div>");
	});

	// A table group the parser inserted has an end tag to print once the switch
	// is off, so its start tag has to print with it — the pair, or neither.
	it.each([
		["<table><tr><td>a</td></tr></table>", "<table><tr><td>a</table>"],
		["<table><col></table>", "<table><col></table>"],
		[
			"<table><tbody><tr><td>a</td></tr></tbody></table>",
			"<table><tr><td>a</table>"
		],
		["<table><colgroup><col></colgroup></table>", "<table><col></table>"],
		// §4.13: the second group's start tag has to stay once the first has lost
		// its end tag, or its columns would join the group before it.
		[
			"<table><colgroup><col></colgroup><col></table>",
			"<table><col><colgroup><col></table>"
		]
	])("keeps a parser-inserted table group balanced: %s", (doc, on) => {
		expect(new SourceProcessor().process(doc, { mode: "minify" }).code).toBe(
			on
		);
		const off = new SourceProcessor().process(doc, {
			mode: "minify",
			transforms: { removeOptionalTags: false }
		}).code;
		for (const name of ["tbody", "colgroup"]) {
			expect(off.includes(`<${name}>`)).toBe(off.includes(`</${name}>`));
		}
	});

	// `removeImpliedTags` keeps the shell to itself, so the two do not overlap.
	it("leaves the shell to removeImpliedTags", () => {
		const doc =
			"<html><head><title>t</title></head><body><p>a</p></body></html>";
		expect(
			new SourceProcessor().process(doc, {
				mode: "minify",
				transforms: { removeOptionalTags: false }
			}).code
		).toBe("<head><title>t</title></head><body><p>a</p></body></html>");
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

	it("swaps the delimiter so escaped quotes can stand literal", () => {
		expect(minify('<img alt="say &quot;hi&quot; to &quot;them&quot;">')).toBe(
			'<img alt=\'say "hi" to "them"\'>'
		);
		expect(minify('<div data-c="{&quot;a&quot;:1}">')).toBe(
			"<div data-c='{\"a\":1}'></div>"
		);
	});

	it("writes U+00A0 as the character, however the source spelled it", () => {
		// A value's own spelling does not decide the output, so the character and
		// `&nbsp;` are one attribute and print as one.
		expect(minify('<img alt="nb\u00A0sp">')).toBe(
			minify('<img alt="nb&nbsp;sp">')
		);
		expect(minify('<img alt="nb&nbsp;sp">')).toBe("<img alt=nb\u00A0sp>");
	});

	it("keeps every other reference the value spells", () => {
		// `&amp;quot;` is the text `&quot;`, not a quote, so it stays escaped, and
		// `&#10;` still needs a reference under either delimiter. U+00A0 does not:
		// the minifier writes the character it names.
		expect(minify('<img alt="&amp;quot; literal &quot;q&quot;">')).toBe(
			"<img alt='&amp;quot; literal \"q\"'>"
		);
		expect(minify('<img alt="nb&nbsp;sp &quot;q&quot;">')).toBe(
			"<img alt='nb\u00A0sp \"q\"'>"
		);
		expect(minify('<img alt="line&#10;br &quot;q&quot;">')).toBe(
			"<img alt='line&#10;br \"q\"'>"
		);
	});

	it("escapes only the delimiter when a value carries both kinds", () => {
		// One of them has to be escaped, so the cheaper delimiter is the one that
		// leaves the more frequent quote standing literal.
		expect(minify('<img alt="it&#39;s &quot;x&quot;">')).toBe(
			"<img alt='it&#39;s \"x\"'>"
		);
		// Two of each: escaping the apostrophes is the shorter of the two.
		expect(minify('<img alt="&#39;a&#39; &quot;b&quot;">')).toBe(
			"<img alt='&#39;a&#39; \"b\"'>"
		);
	});

	it("leaves an implied tag out on the first pass", () => {
		// The omission reads what will print: a comment minifying drops is not
		// content the start tag has to stay for, nor is whitespace `"all"` takes.
		const once = (
			/** @type {string} */ html,
			/** @type {EXPECTED_ANY} */ opts = undefined
		) => new SourceProcessor().process(html, { mode: "minify", ...opts }).code;
		const settles = (
			/** @type {string} */ html,
			/** @type {EXPECTED_ANY} */ opts = undefined
		) => {
			const first = once(html, opts);
			expect(once(first, opts)).toBe(first);
			return first;
		};
		expect(settles("<table><colgroup><!--c--><col><tr><td>a</table>")).toBe(
			"<table><col><tr><td>a</table>"
		);
		expect(settles("<table><tbody><!--c--><tr><td>a</table>")).toBe(
			"<table><tr><td>a</table>"
		);
		expect(
			settles("<html><head><title>L</title></head><body> x</body></html>", {
				collapseWhitespace: "all",
				removeImpliedTags: true
			})
		).toBe("<title>L</title>x");
		// A tier that keeps the whitespace keeps the tag: without it the parser
		// drops the run on the way back in.
		expect(
			once("<html><body> x</body></html>", { removeImpliedTags: true })
		).toBe("<body> x");
	});

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
		expect(css('<style type="text/foo">.a {  color : red ; }</style>')).toBe(
			"<style type=text/foo>.a {  color : red ; }</style>"
		);
	});

	it("merges across an attribute the print drops", () => {
		const once = (
			/** @type {string} */ html,
			/** @type {EXPECTED_ANY} */ opts = undefined
		) => new SourceProcessor().process(html, { mode: "minify", ...opts }).code;
		const drops = { removeRedundantAttributes: /** @type {"all"} */ ("all") };
		// A `type` this print drops as redundant is not a difference between them.
		expect(
			once(
				'<style>.a{color:red}</style><style type="text/css">.b{color:blue}</style>',
				{ ...drops, mergeStyles: true }
			)
		).toBe("<style>.a{color:red}.b{color:blue}</style>");
		expect(
			once(
				'<script type="text/javascript">var a=1</script><script>var b=2</script>',
				{ ...drops, mergeScripts: true }
			)
		).toBe("<script>var a=1\n;var b=2</script>");
		// One it keeps is still a difference.
		expect(
			once(
				"<style media=screen>.a{color:red}</style><style>.b{color:blue}</style>",
				{
					...drops,
					mergeStyles: true
				}
			)
		).toContain("</style><style>");
		expect(
			once("<script type=module>var a=1</script><script>var b=2</script>", {
				...drops,
				mergeScripts: true
			})
		).toContain("</script><script>");
	});

	it("merges across a comment the print drops", () => {
		const once = (
			/** @type {string} */ html,
			/** @type {EXPECTED_ANY} */ opts
		) => new SourceProcessor().process(html, { mode: "minify", ...opts }).code;
		const two =
			"<style>.a{color:red}</style><!--c--><style>.b{color:blue}</style>";
		expect(once(two, { mergeStyles: true })).toBe(
			"<style>.a{color:red}.b{color:blue}</style>"
		);
		// A comment the print keeps is still something between them.
		expect(
			once(two, { mergeStyles: true, transforms: { comments: "all" } })
		).toBe(two);
	});

	it("rewrites a referenced value with the quoting switch off", () => {
		// The switch freezes the quoting, not the value: a rewrite that changes
		// what the value says leaves the source spelling of it unusable.
		const frozen = (/** @type {string} */ html) =>
			new SourceProcessor().process(html, {
				mode: "minify",
				transforms: { normalizeAttributeQuotes: false }
			}).code;
		expect(frozen('<a href="&#x20;/a&#x20;">y</a>')).toContain('href="/a"');
		expect(frozen('<input type="&#x54;&#x45;&#x58;&#x54;">')).toContain(
			'type="text"'
		);
		// The `&` a decoded URL holds is written out bare: `y=` is no reference,
		// and an attribute would not read one there even if it were.
		expect(frozen('<a href="&#x20;/a?x=1&amp;y=2&#x20;">y</a>')).toContain(
			'href="/a?x=1&y=2"'
		);
	});

	it("writes a reference the parser cannot read back as one", () => {
		// `<` and `>` mean nothing inside a quoted value, and an `&` no reference
		// can start after it is data — but one that could start a reference stays.
		expect(minify('<p title="&lt;b&gt;bold&lt;/b&gt;">t</p>')).toBe(
			'<p title="<b>bold</b>">t'
		);
		expect(minify('<p title="a &amp; b">t</p>')).toBe('<p title="a & b">t');
		expect(minify('<a href="?a=1&amp;b=2">t</a>')).toBe(
			'<a href="?a=1&b=2">t</a>'
		);
		// A bare value ends at `>`, so the value is quoted rather than the
		// reference kept — one character shorter, and the same value.
		expect(minify("<p title=a&gt;b>t</p>")).toBe('<p title="a>b">t');
	});

	it("reads a value's last run as the whole of it, unlike a text node's", () => {
		// Text keeps the escape because the next sibling could complete the run
		// once a comment between them goes (`&am` + `p;`); an attribute value
		// ends at its delimiter, so nothing can follow it there.
		expect(minify("<p>a &amp;am</p>")).toBe("<p>a &amp;am");
		expect(minify('<p title="a &amp;am">t</p>')).toBe('<p title="a &am">t');
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

	it("is dropped where every name of the tag is a word", () => {
		expect(minify("<p a=1 a=2>x</p>")).toBe("<p a=1>x");
		expect(minify('<p data-x="1" data-x="2">x</p>')).toBe("<p data-x=1>x");
		expect(minify('<svg><rect x="1" x="2"/></svg>')).toBe(
			"<svg><rect x=1 /></svg>"
		);
	});

	it("is carried over where the tag spells a foreign delimiter", () => {
		// `{%` / `%}` tokenize as attribute names, so `{% endif %}` repeats both
		// and §13.2.5.33 drops them. What the print may not do is write that drop
		// out: the bytes between the names it kept are the template's, so they are
		// copied from the source rather than rebuilt from the attributes.
		expect(minify("<div {{cond}} id=a id=b></div>")).toBe(
			"<div {{cond}} id=a id=b></div>"
		);
		expect(minify("<div {{#if x}} data-a=1 {{/if}} data-a=2></div>")).toBe(
			"<div {{#if x}} data-a=1 {{/if}} data-a=2></div>"
		);
		expect(
			minify('<input type="text"{% if required %} required{% endif %}>')
		).toBe("<input type=text {% if required %} required{% endif %}>");
	});

	it("keeps a name this print left bare off the template's next byte", () => {
		// A quoted value ends at its quote, so the source needed nothing between
		// it and `{%`. Collapsing it to a bare name leaves the two to fuse.
		expect(
			minify('<input type="checkbox"{% if on %} checked="checked"{% endif %}>')
		).toBe("<input type=checkbox {% if on %} checked {% endif %}>");
		expect(
			minify('<li class="row"{% for x in y %} data-x="1"{% endfor %}>a</li>')
		).toBe("<li class=row {% for x in y %} data-x=1 {% endfor %}>a");
		// A `/` terminates a bare name by itself, so it still needs no space.
		expect(minify("<div {{#if x}} a {{/if}} a></div>")).toBe(
			"<div {{#if x}} a {{/if}} a></div>"
		);
	});

	it("still spells the attributes the tag does keep the one way", () => {
		// Every spelling of the same tag prints as one, which is what a tag echoed
		// whole could not do: the name folds, the references decode, the quotes go.
		for (const tag of [
			'<input type="text"{% if x %} a{% endif %}>',
			"<input type='text'{% if x %} a{% endif %}>",
			'<input type="&#x74;ext"{% if x %} a{% endif %}>'
		]) {
			expect(minify(tag)).toBe("<input type=text {% if x %} a{% endif %}>");
		}
	});

	it("keeps an empty value written onto a name the block spells", () => {
		// What the sweep's two surviving `{%` expectations report: the print drops
		// `=""` elsewhere, and a tag carrying template syntax keeps what was written.
		expect(minify('<p a="">t</p>')).toBe("<p a>t");
		expect(minify('<input type="text"{% if x %} a{% endif %}="">')).toBe(
			'<input type=text {% if x %} a{% endif %}="">'
		);
		expect(minify("<input type='text'{% if x %} a{% endif %}=''>")).toBe(
			"<input type=text {% if x %} a{% endif %}=''>"
		);
	});

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
			minify('<INPUT TYPE="TEXT"{% if isRequired %} required{% endif %}>')
		).toMatchSnapshot();
	});

	it("separates an unquoted value from what the source wrote next", () => {
		// Dropping the quotes leaves nothing between the value and the template, and
		// an unquoted value reads on to the next ASCII whitespace or `>`.
		expect(
			minify('<img src="a.png"{% if lazy %} loading="lazy"{% endif %}/>')
		).toBe("<img src=a.png {% if lazy %} loading=lazy {% endif %}/>");
		// A `/` the tokenizer read as a separator is one of those bytes too.
		expect(minify('<p a="b"/{{x}} c=1 c=1>t</p>')).toBe(
			"<p a=b /{{x}} c=1 c=1>t"
		);
		expect(minify('<img src="a.png" {{x}} b=1 b=2 c="d"/>')).toBe(
			"<img src=a.png {{x}} b=1 b=2 c=d />"
		);
	});

	it("leaves the values it has no minifier for as the source wrote them", () => {
		// A nested language is read by the renderer the host hands in, and none is
		// set here, so both are the source's own bytes with the references decoded.
		expect(
			minify('<p style="color : red ;"{% if x %} a{% endif %}>t</p>')
		).toBe('<p style="color : red ;"{% if x %} a{% endif %}>t');
		expect(
			minify('<p onclick="a  &amp;&amp;  b()"{% if x %} a{% endif %}>t</p>')
		).toBe('<p onclick="a  &&  b()"{% if x %} a{% endif %}>t');
	});

	it("keeps the block however the engine spells its delimiters", () => {
		// Jinja, Nunjucks, Liquid and Twig close with a word rather than a `/`, and
		// admit the tight and the whitespace-control spelling beside the spaced one.
		expect(minify('<input type="text"{%if required%} required{%endif%}>')).toBe(
			"<input type=text {%if required%} required{%endif%}>"
		);
		expect(
			minify('<input type="text"{%- if required -%} required{%- endif -%}>')
		).toBe("<input type=text {%- if required -%} required{%- endif -%}>");
		expect(
			minify('<li class="row"{% for x in y %} data-x="1"{% endfor %}>t</li>')
		).toBe("<li class=row {% for x in y %} data-x=1 {% endfor %}>t");
		// Two blocks in one tag, the second opening where the first closed.
		expect(
			minify(
				'<input type="text"{% if a %} required{% endif %}{% if b %} disabled{% endif %}>'
			)
		).toBe(
			"<input type=text {% if a %} required{% endif %}{% if b %} disabled{% endif %}>"
		);
	});

	it("minifies the attributes the block is written around", () => {
		// What rebuilding the tag buys over echoing it: an attribute inside the
		// block is minified like any other, the boolean and the list alike.
		expect(
			minify('<input type="checkbox"{% if on %} checked="checked"{% endif %}>')
		).toBe("<input type=checkbox {% if on %} checked {% endif %}>");
		expect(
			minify('<p class="  a   b  "{% if wide %} data-c="2"{% endif %}>t</p>')
		).toBe('<p class="a b"{% if wide %} data-c=2 {% endif %}>t');
	});

	it("reads a block written against the element name as part of it", () => {
		// A tag name runs to the first ASCII whitespace, `/` or `>`, so `<span{%`
		// names an element nothing closes: the space is the template's to write.
		expect(minify('<span{% if x %} title="a"{% endif %}>t</span>')).toBe(
			"<span{% if x %} title=a {% endif %}>t</span{%>"
		);
		expect(minify('<span {% if x %} title="a"{% endif %}>t</span>')).toBe(
			"<span {% if x %} title=a {% endif %}>t</span>"
		);
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
		expect(minify('<div class="a \n b">x</div>')).toContain('class="a b"');
		expect(minify('<a href=x ping="/p1 \n /p2">l</a>')).toContain(
			'ping="/p1 /p2"'
		);
	});

	it("trims a list whose separators are otherwise already collapsed", () => {
		// Padding at either end is all the rewriting these need — the scan that
		// decides whether a list is already collapsed has to see it.
		expect(minify('<div class="a b ">x</div>')).toContain('class="a b"');
		expect(minify('<div class=" a b">x</div>')).toContain('class="a b"');
		expect(minify('<div class="ab ">x</div>')).toContain("class=ab");
	});

	it("drops a repeated token only where the DOM folds it away", () => {
		// `class` / `rel` reflect a `DOMTokenList`, which is an ordered set.
		expect(minify('<div class="a b a">x</div>')).toContain('class="a b"');
		expect(minify('<link rel="preload preload" href=x>')).toContain(
			"rel=preload"
		);
		// `ping` is read back as written and sends one request per token; the
		// other two reflect no token list either.
		expect(minify('<a href=x ping="/p /p">l</a>')).toContain('ping="/p /p"');
		expect(minify('<table><tr><td headers="h h">c</table>')).toContain(
			'headers="h h"'
		);
		expect(minify('<div accesskey="k k">x</div>')).toContain('accesskey="k k"');
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
		expect(minify('<div class="btn{%  if  x  %}">y</div>')).toContain(
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

	it("sorts an element's attributes by name", () => {
		expect(
			minify('<div zz="1" aa="2" mm="3">x</div>', { sortAttributes: true })
		).toBe("<div aa=2 mm=3 zz=1>x</div>");
	});

	it("leaves a tag alone where a name is another language's", () => {
		// Sorting `{{`, `if}}` and the rest by name would reorder the statement
		// the delimiters spell, which no byte count is worth.
		expect(
			minify('<a href="x"{{#if y}} target="_blank"{{/if}}>t</a>', {
				sortAttributes: true
			})
		).toBe("<a href=x {{#if y}} target=_blank {{/if}}>t</a>");
		expect(
			minify('<input type="text"{% if required %} required{% endif %}>', {
				sortAttributes: true
			})
		).toBe("<input type=text {% if required %} required{% endif %}>");
	});

	it("sorts a class list, and only `class`", () => {
		expect(
			minify('<div class="zz aa mm">x</div>', { sortTokenLists: true })
		).toBe('<div class="aa mm zz">x</div>');
		// `ping` is the order the requests go out in.
		expect(minify('<a ping="/z /a">l</a>', { sortTokenLists: true })).toBe(
			'<a ping="/z /a">l</a>'
		);
	});

	it("sorts a token that is another's prefix before it", () => {
		expect(
			minify('<div class="btn-sm btn btn-lg">x</div>', {
				sortTokenLists: true
			})
		).toBe('<div class="btn btn-lg btn-sm">x</div>');
	});

	it("drops a set's repeats, ordered or not", () => {
		expect(
			minify('<div class="b a b a c">x</div>', { sortTokenLists: true })
		).toBe('<div class="a b c">x</div>');
		expect(minify('<div class="b a b a c">x</div>')).toBe(
			'<div class="b a c">x</div>'
		);
	});

	it("leaves a list holding a foreign delimiter in its written order", () => {
		// Sorting one would move the statements away from what they wrap.
		const list = 'class="btn{% if active %} btn-active{% endif %}"';
		expect(minify(`<div ${list}>x</div>`, { sortTokenLists: true })).toBe(
			`<div ${list}>x</div>`
		);
	});

	it("ranks on the attributes that reach the output, not the dropped ones", () => {
		// `<input type=text>` is redundant and goes, so counting it would rank
		// `type` above `checked` on the first pass and tie them on the second.
		const options = { removeRedundantAttributes: "all", sortAttributes: true };
		const once = minify(
			"<input type=text><input type=checkbox checked>",
			options
		);
		expect(once).toBe("<input><input checked type=checkbox>");
		expect(minify(once, options)).toBe(once);
	});

	it("leaves foreign content alone, where a name is not case-folded", () => {
		expect(
			minify('<svg><rect zz="1" aa="2"/></svg>', { sortAttributes: true })
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
			processor.processAsync("<p>x</p>", {
				mode: "minify",
				renderEmbeddedSource: () => undefined
			})
		).rejects.toThrow("boom");

		explode = false;

		expect(processor.process("<p>y</p>", { mode: "minify" }).code).toBe("<p>y");
	});

	it("keeps `srcdoc` off the deferred path when the caller says so", () => {
		// Both renderers set: `deferSrcdoc: false` asks for the attribute on the
		// normal path, so it is answered synchronously and collected nowhere.
		/** @type {import("../../../lib/html/syntax-parser").DeferredEmbeddedSource[]} */
		const holes = [];
		const { code } = new SourceProcessor().process(
			'<iframe srcdoc="<p>  a  </p>"></iframe>',
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
		const html = '<iframe srcdoc="<p>  a  </p>"></iframe>';
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
		const html = "<style>a{b:c}</style><style>d{e:f}</style>";
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
			'<p style="  color : #ff0000 ; margin : 0px  ">x</p>',
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
			minify('<p style="  color : #ff0000 ; margin : 0px  ">x</p>')
		);
		// Webpack's own renderer, put behind a declining one, is what answers.
		expect(
			minify(
				'<p style="  color : #ff0000 ; margin : 0px  ">x</p>',
				builtinEmbeddedRenderer()
			)
		).toBe("<p style=color:red;margin:0>x");
	});

	it("writes a deferred `style` attribute back in whatever shape its answer needs", async () => {
		expect(
			(await deferred('<p style="  color : red  ">x</p>', () => "color:red"))
				.code
		).toBe("<p style=color:red>x");
		// Only a foreign element's `/>` reads whether a value left the tag ending
		// unquoted, so on an html element an answer needing quotes is taken.
		expect(
			(
				await deferred(
					'<p style="  color : red  ">x</p>',
					() => 'content:"a b"'
				)
			).code
		).toBe("<p style='content:\"a b\"'>x");
	});

	it("gives a `style` attribute the transforms a block's contents get", () => {
		// Webpack's own renderer composes a block-contents list the way the CSS
		// printer composes a rule's block: longhands merge into their shorthand.
		const own = builtinEmbeddedRenderer();
		expect(minify('<p style="top:0;right:0;bottom:0;left:0">x</p>', own)).toBe(
			"<p style=inset:0>x"
		);
		expect(
			minify(
				'<p style="margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px">x</p>',
				own
			)
		).toBe("<p style=margin:1px>x");
		// Foreign content is the same declaration list.
		expect(
			minify(
				'<svg><rect style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"/></svg>',
				own
			)
		).toBe("<svg><rect style=padding:0 /></svg>");
		// Nothing opened a block, so a `}` closes none: it is a parse error whose
		// bad declaration runs to the next `;` — two properties, so both survive it.
		expect(minify('<p style="color:red;};background:blue">x</p>', own)).toBe(
			"<p style=color:red;background:blue>x"
		);
		// No `;` after it, so the bad declaration runs to the end.
		expect(
			minify('<p style="background:red;}background:blue">x</p>', own)
		).toBe("<p style=background:red>x");
		// Inside a value it is a token like any other, leaving a declaration a
		// browser drops — so it is handed back exactly as written.
		expect(
			minify('<p style="background:red};background:blue">x</p>', own)
		).toBe("<p style=background:red};background:blue>x");
	});

	it("minifies and offers a `style` attribute carrying character references", () => {
		// `&quot;` is a quote to CSS, not an entity, so the list is minified from the
		// decoded text and spelled back from there — a reference the source only
		// needed for its own delimiter does not survive as one.
		const html = '<p style="content: &quot;x&quot; ; color : red">y</p>';

		expect(offered(html)).toEqual([
			["css", "block-contents", 'content: "x" ; color : red']
		]);
		const own = builtinEmbeddedRenderer();
		expect(minify(html, own)).toBe("<p style='content:\"x\";color:red'>y");
		// Foreign content too: SVG and MathML `style` is the same declaration list.
		expect(minify('<svg><rect style="fill : &quot;a&quot;"/></svg>', own)).toBe(
			"<svg><rect style='fill:\"a\"'/></svg>"
		);
	});

	it("offers an inline `<style>`, a `style` attribute and a `<script>`", () => {
		expect(
			offered(
				'<p style="color : red">x</p><style>.a { color : red }</style><script>var a = 1</script>'
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
		expect(offered("<script>var a = 1</script>")).toEqual([
			["javascript", "script", "var a = 1"]
		]);
		expect(
			offered('<script type="text/javascript">var a = 1</script>')
		).toEqual([["javascript", "script", "var a = 1"]]);
		expect(
			offered('<script type="  TEXT/JavaScript  ">var a = 1</script>')
		).toEqual([["javascript", "script", "var a = 1"]]);
	});

	it("offers a module script as the module production", () => {
		// The goal symbol is not readable off the body: this one parses under
		// both, and only the element says which it is.
		expect(offered('<script type="module">var a = 1</script>')).toEqual([
			["javascript", "module", "var a = 1"]
		]);
		expect(offered('<script type="  MODULE  ">import "x"</script>')).toEqual([
			["javascript", "module", 'import "x"']
		]);
	});

	it("offers a run of both, each under its own production", () => {
		expect(
			offered(
				'<script>a()</script><script type="module">import "x"</script><script>b()</script>'
			)
		).toEqual([
			["javascript", "script", "a()"],
			["javascript", "module", 'import "x"'],
			["javascript", "script", "b()"]
		]);
	});

	it("carries the production onto the deferred path", async () => {
		const { code, offered: holes } = await deferred(
			'<script>a()</script><script type="module">import "x"</script>',
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
		const html = '<button onclick="  foo( 1 , 2 )  ">x</button>';

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
		const html = '<form onsubmit="return  false"><input></form>';

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
		expect(offered('<button onclick="var = broken(">x</button>')).toEqual([
			["javascript", "event-handler", "var = broken("]
		]);
	});

	it("offers a handler only where the name is one on that element", () => {
		// `onunload` is a handler on `<body>` and text a script may read anywhere
		// else, so only one of these two holds JavaScript.
		expect(offered('<div onunload="a( 1 )">x</div>')).toEqual([]);
		expect(offered('<body onunload="a( 1 )">x</body>')).toEqual([
			["javascript", "event-handler", "a( 1 )"]
		]);
		// Foreign content carries the global ones too.
		expect(offered('<svg><circle onclick="f( 1 )"/></svg>')[0]).toEqual([
			"javascript",
			"event-handler",
			"f( 1 )"
		]);
	});

	it("never offers an empty handler", () => {
		// A reference spelling whitespace stays as written, so nothing is offered
		// for it either — writing it out would make the attribute read as empty.
		expect(
			offered('<button onclick="  " onmouseover="" onfocus="&#32;">x</button>')
		).toEqual([]);
	});

	it("keeps a minified handler through the print's own re-parse", () => {
		// The adoption agency makes this print verify itself by re-parsing, which
		// reads a renderer's answer as a value the print got wrong unless told.
		expect(minify('<p>1<b>2<i onclick="f( 1 )">3</b>4</i>5</p>', squeeze)).toBe(
			'<p>1<b>2<i onclick=f(1)>3</i></b><i onclick="f( 1 )">4</i>5'
		);
	});

	it("offers every handler the document holds", () => {
		expect(
			offered('<p onclick="f( 1 )">a</p><p onclick="f( 1 )">b</p>')
		).toEqual([
			["javascript", "event-handler", "f( 1 )"],
			["javascript", "event-handler", "f( 1 )"]
		]);
	});

	it("offers a handler carrying character references decoded", () => {
		// `&amp;&amp;` is an operator to JavaScript rather than an entity, and the
		// answer is escaped back for the value it lands in.
		const html = '<button onclick="a&amp;&amp;b( 1 )">x</button>';

		expect(offered(html)).toEqual([
			["javascript", "event-handler", "a&&b( 1 )"]
		]);
		expect(minify(html, squeeze)).toBe("<button onclick=a&&b(1)>x</button>");
	});

	it("quotes a handler answer that needs it", () => {
		expect(
			minify('<button onclick="f( &quot;a&quot; )">x</button>', squeeze)
		).toBe("<button onclick='f(\"a\")'>x</button>");
	});

	it("keeps a handler the renderer answered longer than the source", () => {
		// A minifier ends a statement it was handed without one, so the shortest
		// handlers come back a byte longer than they were written.
		expect(minify('<p onclick="x">a</p>', () => "x;")).toBe("<p onclick=x>a");
	});

	it("leaves a handler alone where the renderer declines it", () => {
		// Exactly what an untapped run writes, down to the quoting — and a renderer
		// answering with what it was handed spells the same thing.
		const html = '<button onclick="foo( 1 )" title="  a  ">x</button>';
		const written = '<button onclick="foo( 1 )" title="  a  ">x</button>';

		expect(minify(html, () => undefined)).toBe(minify(html));
		expect(minify(html, () => undefined)).toBe(written);
		expect(minify(html, (source) => source)).toBe(written);
	});

	it("answers a handler on a deferred print, `/>`-spelled tag included", async () => {
		expect(
			await deferred('<button onclick="  foo( 1 , 2 )  ">x</button>', squeeze)
		).toEqual({
			code: "<button onclick=foo(1,2)>x</button>",
			offered: [["javascript", "event-handler", "  foo( 1 , 2 )  "]]
		});
		// A foreign `/>` reads back whether the last value ended unquoted, which an
		// answer that has not arrived cannot decide: the source's quoting stands.
		expect(
			(await deferred('<svg><circle onclick="f( 1 )"/></svg>', squeeze)).code
		).toBe('<svg><circle onclick="f(1)"/></svg>');
		// There the answer is written only where it is shorter than the source: the
		// quoting is already decided, so an equal one would only be a rewrite.
		expect(
			(await deferred('<svg><circle onclick="f(1)"/></svg>', squeeze)).code
		).toBe('<svg><circle onclick="f(1)"/></svg>');
	});

	// Stands in for a JSON minifier.
	const compactJson = (/** @type {string} */ source) =>
		JSON.stringify(JSON.parse(source));

	it("offers a URL attribute's `data:` payload as its media type's language", () => {
		const html =
			'<img src="data:image/svg+xml,<svg>  </svg>">' +
			'<iframe src="  data:text/html,<p>  a  </p>  "></iframe>' +
			"<object data='data:application/json,{ \"a\" : 1 }'></object>";

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
			'<a href="data:application/json,{ &quot;a&quot; : &quot;&apos;&quot; }">x</a>';

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
				'<a href="data:application/json;charset=utf-8,{ &quot;a&quot; : 1 }">x</a>',
				compactJson
			)
		).toBe("<a href='data:application/json;charset=utf-8,{\"a\":1}'>x</a>");
	});

	it("keeps a `data:` URL the renderer declined or answered no shorter", () => {
		const html = '<a href="data:application/json,{&quot;a&quot;:1}">x</a>';

		expect(minify(html, () => undefined)).toBe(minify(html));
		expect(minify(html, (source) => source)).toBe(minify(html));
		expect(minify(html, (source) => `${source}   `)).toBe(minify(html));
	});

	it("answers a `data:` payload on a deferred print", async () => {
		expect(
			await deferred(
				"<object data='data:application/json,{ \"a\" : 1 }'></object>",
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
		minify("<style>.a{color:red}</style><script>var a=1</script>", (s, i) => {
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
			'<p style="  color : red  ">x</p>' +
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
				'<script type="application/json">{ "a": 1 }</script><script type="application/ld+json">{ "b": 2 }</script>'
			)
		).toEqual([
			["json", "stylesheet", '{ "a": 1 }'],
			["json", "stylesheet", '{ "b": 2 }']
		]);
	});

	it("replaces the built-in CSS and JSON minifiers", () => {
		expect(
			minify(
				'<style>.a { color : red }</style><script type="application/json">{ "a" : 1 }</script>',
				(source) => source.toUpperCase()
			)
		).toBe(
			'<style>.A { COLOR : RED }</style><script type=application/json>{ "A" : 1 }</script>'
		);
	});

	it("leaves an inline script alone when there is no renderer", () => {
		expect(minify("<script>var   a   =   1</script>")).toBe(
			"<script>var   a   =   1</script>"
		);
	});

	it("declines a body the renderer returns unchanged", () => {
		const source = "<style>.a { color : red }</style>";
		expect(minify(source, (s) => s)).toBe(source);
	});

	it("keeps the body when the renderer throws", () => {
		expect(
			minify("<style>.a{color:red}</style>", () => {
				throw new Error("nope");
			})
		).toBe("<style>.a{color:red}</style>");
	});

	it("writes a `style` attribute back as its renderer answered", () => {
		expect(
			minify('<p style="  color : red ;  ">x</p>', () => "color:red")
		).toBe("<p style=color:red>x");
		// Whatever it answers is quoted and escaped to stay one attribute, so a
		// renderer cannot spell its way out of the value.
		expect(
			minify('<p style="  color : red ;  ">x</p>', () => 'content:"a" b')
		).toBe("<p style='content:\"a\" b'>x");
	});

	it("never offers an empty body", () => {
		expect(
			offered('<style> </style><script></script><p style=" "></p>')
		).toEqual([]);
	});

	it("offers what an inline `<svg>` nests, its `style` attribute included", () => {
		// Foreign content: every other attribute there is adjusted or means
		// something else, but `style` is a declaration list exactly like HTML's.
		expect(
			offered(
				'<svg viewBox="0 0 2 2"><style>.s { fill : red }</style><rect style="fill : red"/><script>var b = 2</script></svg>'
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
				'<svg viewBox="0 0 2 2"><style>.s { fill : red }</style><rect style="fill : red"/><script>var b = 2</script></svg>'
			]
		]);
	});

	it("offers each body exactly once, including on a `/>`-spelled tag", () => {
		// A tag the source spells `/>` is serialized twice — once by the streaming
		// walk, once by the printer — and a renderer must not see it twice.
		expect(
			offered('<svg viewBox="0 0 2 2"><rect style="fill : red"/></svg>')
		).toEqual([
			["css", "block-contents", "fill : red"],
			[
				"svg",
				"foreign-element",
				'<svg viewBox="0 0 2 2"><rect style="fill : red"/></svg>'
			]
		]);
	});

	it("offers only the outermost `<svg>`, its nested bodies already rendered", () => {
		/** @type {string[]} */
		const svg = [];
		const out = minify(
			'<svg viewBox="0 0 2 2"><style>  .s { fill : red }  </style><svg><rect/></svg></svg>',
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
		expect(offered("<svg/>")).toEqual([["svg", "foreign-element", "<svg/>"]]);
	});

	it("keeps a map the renderer attached to an inline `<style>` / `<script>`", () => {
		// A `sourceMappingURL` in the body is the only map a browser honours for
		// inline content, so a renderer attaches its own and nothing composes it.
		const out = minify(
			"<div>\n  <style>  .a { color : red }  </style>\n  <script>  var a = 1  </script>\n</div>",
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
				'<p style="  color : red ;  ">x</p>',
				(s) => `${s}/*# sourceMappingURL=data:application/json;base64,e30= */`
			)
		).toBe(
			'<p style="  color : red ;  /*# sourceMappingURL=data:application/json;base64,e30= */">x'
		);
	});

	it("offers the document an `<iframe srcdoc>` holds, decoded", () => {
		expect(
			offered('<iframe srcdoc="&lt;p&gt;   hello   &lt;/p&gt;"></iframe>')
		).toEqual([["html", "stylesheet", "<p>   hello   </p>"]]);
		// Empty carries no document, and a foreign-content `<iframe>` is an SVG
		// element that happens to share the name.
		expect(offered('<iframe srcdoc=""></iframe>')).toEqual([]);
		expect(
			offered('<svg><iframe srcdoc="&lt;p&gt;x&lt;/p&gt;"/></svg>')
		).toEqual([
			["svg", "foreign-element", '<svg><iframe srcdoc="<p>x</p>"/></svg>']
		]);
	});

	it("writes a rendered srcdoc back so it parses to what came out", () => {
		const payload = "<p class=\"a\" data-x='y'>a & b < c > d</p>";
		const out = minify(
			'<iframe srcdoc="&lt;p&gt;x&lt;/p&gt;"></iframe>',
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
			'<iframe srcdoc="&lt;p&gt;x&lt;/p&gt;"></iframe><style>.a{color:red}</style>';
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
				'<style type="text/plain">raw</style><script type="text/template">raw</script>'
			)
		).toEqual([]);
	});

	it("quotes a bare `srcdoc` a synchronous renderer answered", () => {
		// An unquoted value carries no delimiter to keep, so the answer alone
		// decides one — and it needs quotes whatever it holds.
		expect(
			minify("<p><iframe srcdoc=&lt;p&gt;a></iframe>", () => '<p a="b">')
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
			'<p style="color:rgba(255,0,0,.5)">x</p><style>.a{color:rgba(255,0,0,.5)}</style>',
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
		expect(minifyLegacy('<p style="background: hwb(194 0% 0%)">x')).toBe(
			lowered
		);
		expect(minifyLegacy('<p style="background&#x3a; hwb(194 0% 0%)">x')).toBe(
			lowered
		);
	});

	it("keeps a lowered list that holds both quotes", () => {
		expect(
			minifyLegacy(`<p style="content:'\\''; background: hwb(194 0% 0%)">x`)
		).toBe(
			`<p style="content:'\\'';background:#00c3ff;background:hwb(194 0% 0%)">x`
		);
	});

	it("keeps the source's delimiter for a lowered list where quotes are frozen", () => {
		expect(
			new SourceProcessor().process(
				"<p style='background&#x3a; hwb(194 0% 0%)'>x",
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
		const plain = minifyLegacy(`<p style="content:'\\'';color:red">x`);
		expect(plain).toBe(`<p style="content:'\\'';color:red">x`);
		expect(
			minifyLegacy(`<p style="content:&#39;\\&#39;&#39;;color:red">x`)
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
			await min('<iframe src="data:text/html,<p>a<!-- c --></p>"></iframe>')
		).toBe('<iframe src="data:text/html,<p>a"></iframe>');
		expect(
			await min("<a href='data:application/json,{ \"a\" : 1 }'>x</a>")
		).toBe("<a href='data:application/json,{\"a\":1}'>x</a>");
	});

	it("minifies an SVG `data:` URL under `svg`, and leaves it as written without", async () => {
		const page = '<img src="data:image/svg+xml,<svg></svg>">';
		const svg = await htmlMinify({ "page.html": page }, undefined, {
			svg: true
		});

		expect(svg.code).toBe('<img src="data:image/svg+xml,<svg/>">');
		expect(await min(page)).toBe(page);
	});

	it("drops the comments `some` names, as no comment it reaches carries anything", async () => {
		const result = await htmlMinify(
			{ "page.html": "<!-- keep --><p>a</p><!-- foo -->" },
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
					'<!--[if lt IE 9]><script src="h.js"></script><link rel="stylesheet"  href="a.css"><![endif]-->'
				)
			).toBe(
				"<!--[if lt IE 9]><script src=h.js></script><link rel=stylesheet href=a.css><![endif]-->"
			);
		});

		it.each([
			[
				"a wrapper one opens and another closes",
				'<!--[if IE]><div class="ie"><![endif]--><p>x</p><!--[if IE]></div><![endif]-->'
			],
			["the `<html>` it spells", '<!--[if IE]><html class="ie"><![endif]-->'],
			["a row of the table it sits in", "<table><!--[if IE]><tr><td>a</td></tr><![endif]--></table>"]
		])("keeps %s as written", async (_, page) => {
			const body = page.slice(page.indexOf("<!--["), page.lastIndexOf("-->") + 3);

			expect(await conditional(page)).toContain(body);
		});

		it("keeps the end tags what follows the comment reads", async () => {
			expect(
				await conditional('<!--[if IE]><p  class="a" >a</p><![endif]--><span>b</span>')
			).toBe("<!--[if IE]><p class=a>a</p><![endif]--><span>b</span>");
		});

		it("leaves a comment that only starts like one, and a plain one, to the document", async () => {
			expect(
				await conditional("<p>a</p><!--[if IE]> no end --><!-- plain -->")
			).toBe("<p>a</p><!--[if IE]> no end -->");
			expect(await conditional("<p>a</p>")).toBe("<p>a");
		});
	});

	it("reads a Buffer input as UTF-8", async () => {
		const { code } = await htmlMinify({
			"page.html": Buffer.from(
				"<html><body><p>ça va à Zürich</p></body></html>",
				"utf8"
			)
		});

		expect(code).toBe("<body><p>ça va à Zürich</body></html>");
	});

	it("keeps server-side template tags", async () => {
		// `<?php … ?>` is a bogus comment per §13.2.5.42, so the inert-comment rule
		// would delete the whole directive from a copied template.
		expect(
			await min("<?php echo $t; ?>\n<html><body><p>a</p></body></html>")
		).toBe("<?php echo $t; ?><body><p>a</body></html>");
		expect(await min("<html><body><!-- inert --><p>a</p></body></html>")).toBe(
			"<body><p>a</body></html>"
		);
	});

	it("keeps text-level template placeholders unescaped", async () => {
		// Escaping these to `&lt;%= t %&gt;` breaks the server-side render.
		expect(await min("<div>   <%= t %>   </div>")).toBe(
			"<div>   <%= t %>   </div>"
		);
		expect(await min("<div>{{ t }}</div>")).toBe("<div>{{ t }}</div>");
	});

	it("still escapes text that would re-parse as markup", async () => {
		// `a &lt;b&gt;c` decodes to `a <b>c`; emitting the `<` raw would build a
		// real `<b>` element, so that one stays escaped. A bare `>` is only ever a
		// character in text.
		expect(await min("<p>a &lt;b&gt;c")).toBe("<p>a &lt;b>c");
		expect(await min("<p>a&amp;b")).toBe("<p>a&amp;b");
		// Foster-parented text merges into one node whose range no longer covers
		// its data — the source slice would drop the `c`.
		expect(await min("<table>a<tr><td>b</td></tr>c</table>")).toBe(
			"ac<table><tr><td>b</table>"
		);
		// A trailing `<` has to stay escaped: dropping a comment after it would
		// let it fuse with the next sibling into a tag.
		expect(await min("<p>a<</p>")).toBe("<p>a&lt;");
		expect(await min("<p>a<<!--c--></p>")).toBe("<p>a&lt;");
	});

	it("keeps template expressions containing ampersands", async () => {
		// `&&` is everywhere in EJS/PHP conditionals; escaping it to `&amp;&amp;`
		// breaks the server-side render just as escaping `<` does.
		expect(await min("<div><%= a && b %></div>")).toBe(
			"<div><%= a && b %></div>"
		);
		expect(await min("<div><% if (a && b) { %>x<% } %></div>")).toBe(
			"<div><% if (a && b) { %>x<% } %></div>"
		);
		expect(await min("<p>a & b")).toBe("<p>a & b");
		expect(await min("<p>a &foo; b")).toBe("<p>a &foo; b");
	});

	it("escapes a character reference left open at the end", async () => {
		// The next sibling could complete it (`a &am` + `p;`) once a comment
		// between them is dropped, so only a closed tail passes through.
		expect(await min("<p>a &</p>")).toBe("<p>a &amp;");
		expect(await min("<p>a &am</p>")).toBe("<p>a &amp;am");
		expect(await min("<p>a &am<!--c-->p;</p>")).toBe("<p>a &amp;amp;");
	});

	it("keeps the body of literal-text elements raw", async () => {
		// `script` / `style` bodies are not markup, so `<` must not be escaped —
		// `a &lt; b` would change what the script does. A `<style>` body is still
		// run through the CSS minifier, which is not an escaping pass.
		expect(await min("<script>if (a < b) { x(); }</script>")).toBe(
			"<script>if (a < b) { x(); }</script>"
		);
		expect(await min("<style>.a[x='<'] { color: red }</style>")).toBe(
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
				'<p><iframe srcdoc="&lt;!-- x --&gt;&lt;p&gt;a&lt;/p&gt;"></iframe>'
			)
		).toBe('<p><iframe srcdoc="<p>a"></iframe>');
	});

	it("reaches a `srcdoc` the source wrote bare", async () => {
		// An unquoted value holds a document too, and gets quotes back: a space
		// or a `>` in the minified text would otherwise end the attribute.
		expect(await min("<p><iframe srcdoc=&lt;p&gt;a&lt;/p&gt;></iframe>")).toBe(
			'<p><iframe srcdoc="<p>a"></iframe>'
		);
	});

	it("leaves a `srcdoc` in foreign content alone", async () => {
		// An `<iframe>` in SVG is an SVG element that shares the name, and its
		// `srcdoc` is not the HTML attribute.
		expect(
			await min('<p><svg><iframe srcdoc="&lt;!-- k --&gt;"></iframe></svg>')
		).toBe('<p><svg><iframe srcdoc="<!-- k -->"></iframe></svg>');
	});
});

describe("htmlMinify — one document reaching every embedded site", () => {
	const htmlMinify = require("../../../lib/html/htmlMinify");

	// One document per site the print offers, down to two `<iframe srcdoc>` —
	// one quoted, one written bare.
	const DOCUMENT = `<!doctype html>
<html lang="en">
<head>
<title>   every embedded body   </title>
<style>
  /* a comment */
  .a { color : #ff0000 ; margin : 10px 10px 10px 10px }
  .svg { background : url("data:image/svg+xml,<svg>   <rect  fill='red' />   </svg>") }
  .css { background : url("data:text/css,.i {  color : #ff0000  }") }
  .html { background : url("data:text/html,<div>  <!-- x -->  <p>hi</p>  </div>") }
  .json { background : url('data:application/json,{ "a" :  1 }') }
  .js { background : url("data:text/javascript,var  a  =  1 ;") }
  .b64 { background : url("data:text/css;base64,LmlubmVyIHsgIGNvbG9yIDogI2ZmMDAwMCAgfQ==") }
  .png { background : url("data:image/png;base64,AAAA") }
</style>
<script type="application/json">  { "a" :  1 , "b" : [ 1 , 2 ] }  </script>
<script>  var  a  =  1 ;  function  f ( ) { return  a }  </script>
</head>
<body>
<p style="  COLOR : #ff0000 ;  margin : 10px 10px 10px 10px  " onclick="  f( 1 )  ;  g( 2 )  ;  h( 3 )  ">styled</p>
<svg viewBox="0 0 2 2">   <rect  fill="red"  />   </svg>
<iframe srcdoc="&lt;!-- c --&gt;&lt;style&gt;.s{ color : #ff0000 }&lt;/style&gt;&lt;p&gt;   deep   &lt;/p&gt;"></iframe>
<iframe srcdoc=&lt;p&gt;bare&lt;/p&gt;></iframe>
</body>
</html>`;

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
		// it is, and one `html` per `<iframe srcdoc>`.
		expect(offered).toEqual([
			"css",
			"json",
			"javascript/script",
			"css/block-contents",
			"javascript/event-handler",
			"svg/foreign-element",
			"html",
			"html"
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

	describe("cloned / reconstructed formatting elements", () => {
		it("keeps the reconstructed <b> around text after an implied </p>", () => {
			expect(minify("<p><b>a<p>b")).toBe("<p><b>a</b><p><b>b</b>");
		});

		it("keeps the adoption-agency clone of <b> inside <p>", () => {
			expect(minify("<b><p>x</b>y</p>")).toBe("<b></b><p><b>x</b>y");
		});

		it("keeps cloned attributes on the reconstructed element", () => {
			// The reconstructed clone is synthesized, not sliced from source, so
			// there is no spelling to beat and the shortest one is written.
			expect(minify('<b x="1"><p>x</b>y</p>')).toBe(
				"<b x=1></b><p><b x=1>x</b>y"
			);
		});

		it("keeps the reconstructed <b> in a full document round-trip", () => {
			expect(
				minify(
					"<!DOCTYPE html><html><head></head><body><p><b>a<p>b</body></html>"
				)
			).toBe(
				"<!doctype html><head></head><body><p><b>a</b><p><b>b</b></body></html>"
			);
		});

		it("escapes a quote-holding cloned attribute value safely", () => {
			expect(minify("<b a='x\"y'><p>t</b>")).toBe(
				"<b a='x\"y'></b><p><b a='x\"y'>t</b>"
			);
		});

		it("rebuilds renamed void tokens instead of dropping them", () => {
			expect(minify('<image src="a&amp;b">')).toBe("<img src=a&b>");
			expect(minify("a</br>b")).toBe("a<br>b");
		});

		it("materializes an implied <body> once attributes merge onto it", () => {
			expect(minify('<div>a</div><body class="x">')).toBe(
				"<body class=x><div>a</div></body>"
			);
		});

		it("still omits parser-inserted html/head/body and table sections", () => {
			expect(minify("<p>x")).toBe("<p>x");
			expect(minify("<table><tr><td>x</table>")).toBe(
				"<table><tr><td>x</table>"
			);
			expect(minify("<table><td>x")).toBe("<table><td>x</table>");
		});
	});

	describe("<noscript> content", () => {
		// A browser with scripting on reads it as raw text, so it is written back
		// as the source spelled it, for either reader.
		it("keeps the text inside <noscript> as written", () => {
			expect(minify("<body><noscript>a &lt;b&gt; c</noscript>")).toBe(
				"<body><noscript>a &lt;b&gt; c</noscript></body>"
			);
		});

		it("keeps the markup inside <noscript> as written", () => {
			expect(minify('<noscript><link href="x"></noscript>')).toBe(
				'<noscript><link href="x"></noscript>'
			);
		});

		it("keeps what a <noscript> in <head> holds inside it", () => {
			// Read with scripting off, the `<img>` leaves the head for the body,
			// where a reader with scripting on would load it too.
			expect(
				minify(
					"<!doctype html><head><noscript><img src=x.gif></noscript><title>t</title></head><p>hi"
				)
			).toBe(
				"<!doctype html><head><noscript><img src=x.gif></noscript><title>t</title></head><p>hi"
			);
		});

		it("keeps the head whitespace a reader with scripting off reads as body text", () => {
			// That reader leaves the head at the `<img>`, so what follows is in the body.
			expect(
				minify(
					"<!doctype html><head><noscript><img src=x></noscript> <title>t</title></head><p>x"
				)
			).toBe(
				"<!doctype html><head><noscript><img src=x></noscript> <title>t</title></head><p>x"
			);
			expect(
				minify("<!doctype html><head><noscript>PASS</noscript></head>\n<body>x")
			).toBe(
				"<!doctype html><head><noscript>PASS</noscript></head>\n<body>x</body>"
			);
			// `<!-->` closes at once, so `PASS` is text to that reader, not a comment.
			expect(
				minify(
					"<!doctype html><head><noscript><!-->PASS<!-- --></noscript> <title>t</title></head><p>x"
				)
			).toBe(
				"<!doctype html><head><noscript><!-->PASS<!-- --></noscript> <title>t</title></head><p>x"
			);
			expect(
				minify(
					"<!doctype html><head><noscript><!-- a --!>PASS<!-- b --></noscript> <title>t</title></head><p>x"
				)
			).toBe(
				"<!doctype html><head><noscript><!-- a --!>PASS<!-- b --></noscript> <title>t</title></head><p>x"
			);
			// The mode passes a `<style>` through, but only void elements are read as safe.
			expect(
				minify(
					"<!doctype html><head><noscript><style>a{}</style></noscript> <title>t</title></head><p>x"
				)
			).toBe(
				"<!doctype html><head><noscript><style>a{}</style></noscript> <title>t</title></head><p>x"
			);
		});

		it("keeps a stray `</noscript>` that closes a nested one with scripting off", () => {
			// With scripting on, the outer body is text up to the first end tag and
			// the second one closes nothing; with it off, the second closes the outer.
			expect(
				minify("<body><noscript><noscript>a</noscript>b</noscript>\n<p>x")
			).toBe("<body><noscript><noscript>a</noscript>b</noscript>\n<p>x</body>");
			expect(
				minify(
					"<body><noscript><noscript>a</noscript>b &amp; c</NOSCRIPT >&lt;d<p>x"
				)
			).toBe(
				"<body><noscript><noscript>a</noscript>b & c</NOSCRIPT >&lt;d<p>x</body>"
			);
		});

		it("escapes the text as a whole where an end tag quotes a `>`", () => {
			// The tag ends past the quoted `>`, so its pieces do not add up to the text.
			expect(minify('<p>a</noscript x=">">b')).toBe("<p>ab");
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
				"<!doctype html><head><title>t</title><noscript>a</noscript></head>\n<body><p>x",
				options
			).code;
			expect(once).toBe(
				"<!doctype html><title>t</title><noscript>a</noscript><p>x"
			);
			expect(new SourceProcessor().process(once, options).code).toBe(once);
		});

		it("drops the head whitespace where every reader keeps the head", () => {
			expect(
				minify(
					"<!doctype html><head><noscript><link rel=a href=b><!-- c --></noscript> <title>t</title></head><p>x"
				)
			).toBe(
				"<!doctype html><head><noscript><link rel=a href=b><!-- c --></noscript><title>t</title></head><p>x"
			);
			expect(
				minify(
					"<!doctype html><head><noscript><!-- a --!><!----><link rel=a href=b></noscript> <title>t</title></head><p>x"
				)
			).toBe(
				"<!doctype html><head><noscript><!-- a --!><!----><link rel=a href=b></noscript><title>t</title></head><p>x"
			);
			expect(
				minify(
					"<!doctype html><head><noscript><META charset=x></noscript> <title>t</title></head><p>x"
				)
			).toBe(
				"<!doctype html><head><noscript><META charset=x></noscript><title>t</title></head><p>x"
			);
			expect(
				minify(
					"<!doctype html><head><noscript></noscript> <title>t</title></head><p>x"
				)
			).toBe(
				"<!doctype html><head><noscript></noscript><title>t</title></head><p>x"
			);
		});
	});

	describe("comments", () => {
		it("keeps both halves of a downlevel-revealed conditional block", () => {
			expect(minify('<!--[if !IE]><!--><link href="x"><!--<![endif]-->')).toBe(
				"<!--[if !IE]><!--><link href=x><!--<![endif]-->"
			);
			expect(minify("<!--[if IE]><p>ie only</p><![endif]-->")).toBe(
				"<!--[if IE]><p>ie only</p><![endif]-->"
			);
		});

		it("keeps server-side include directives", () => {
			expect(minify('<!--#include virtual="a.html" -->')).toBe(
				'<!--#include virtual="a.html" -->'
			);
		});
	});

	describe("<plaintext>", () => {
		it("never emits a </plaintext> end tag", () => {
			expect(minify("<plaintext>foo")).toBe("<plaintext>foo");
		});
	});

	describe("opening-tag whitespace", () => {
		it("collapses the run before a valueless attribute", () => {
			expect(minify("<p   hidden   class='x'>t</p>")).toBe(
				"<p hidden class=x>t"
			);
			expect(minify("<input    disabled>")).toBe("<input disabled>");
			expect(minify("<p   a   b   c>t</p>")).toBe("<p a b c>t");
		});

		it("keeps a foreign element's self-closing slash", () => {
			expect(minify("<svg><circle   r='1'   /></svg>")).toBe(
				"<svg><circle r=1 /></svg>"
			);
			// After an unquoted value the `/` needs its space, or it would fuse
			// into the value.
			expect(minify("<svg><circle   r=1   /></svg>")).toBe(
				"<svg><circle r=1 /></svg>"
			);
			expect(minify("<svg><circle/></svg>")).toBe("<svg><circle/></svg>");
		});

		it("leaves a `/` that is the last character of an unquoted value", () => {
			expect(minify("<a href=x/>t</a>")).toBe("<a href=x/>t</a>");
		});

		it("drops a `/` the attribute it separated left behind", () => {
			/**
			 * @param {string} source html source
			 * @returns {string} minified serialization
			 */
			const minifyAll = (source) =>
				new SourceProcessor().process(source, {
					mode: "minify",
					removeRedundantAttributes: "all"
				}).code;
			// The `/` stood before an attribute the redundant-default drop then took
			// out, so nothing is left for it to separate.
			expect(minifyAll("<input a/type=text>")).toBe("<input a>");
			expect(minifyAll("<input a/type=text b>")).toBe("<input a b>");
			expect(minifyAll("<form a/method=get>x</form>")).toBe("<form a>x</form>");
			// One the drop left alone still separates at the same byte.
			expect(minifyAll("<input a/b>")).toBe("<input a/b>");
		});

		it("writes back a `/` the tokenizer read as the separator", () => {
			// A template engine reads `{{/if}}` as one word, and the space this print
			// used to put there instead split it. Both separate, at the same byte.
			expect(minify('<a href="x"{{#if y}} target="_blank"{{/if}}>t</a>')).toBe(
				"<a href=x {{#if y}} target=_blank {{/if}}>t</a>"
			);
			expect(minify("<p a/b>t</p>")).toBe("<p a/b>t");
			// A run holding whitespace still collapses to the one space it needs.
			expect(minify("<p a / b>t</p>")).toBe("<p a b>t");
			// After an unquoted value the `/` would read as its last character, so
			// the space stands instead.
			expect(minify('<p a="b"/c>t</p>')).toBe("<p a=b c>t");
		});

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

		it("folds the name of a tag that carries nothing else", () => {
			expect(minify("<DIV>t</DIV>")).toBe("<div>t</div>");
			// Foreign content keeps its source bytes, name included.
			expect(minify("<svg><TITLE>t</TITLE></svg>")).toBe(
				"<svg><TITLE>t</TITLE></svg>"
			);
		});
	});

	// Every other minify transform is covered end to end by
	// `configCases/html/minimize-transforms`. CR cases cannot live there:
	// `.gitattributes` checks `test/` out with LF, so a CR needs a string here.
	describe("implied <body> with leading whitespace", () => {
		it("materializes the tag so the text node survives", () => {
			// Found by running the html5lib serializer corpus through minify: a
			// transparent implied `<body>` puts the run where re-parsing drops it,
			// since the modes before `<body>` starts ignore whitespace.
			expect(minify("</html> foo")).toBe("<body> foo</body></html>");
			expect(minify("</body> foo")).toBe("<body> foo</body>");
			expect(minify("<colgroup> foo")).toBe("<body> foo</body>");
			// Nothing to keep when the run is not in the body to begin with.
			expect(minify(" foo")).toBe("foo");
			expect(minify("<p>x</p>")).toBe("<p>x");
		});
	});

	describe("carriage returns in text", () => {
		it("normalizes a CRLF to one newline", () => {
			expect(minify("<p>a\r\nb</p>")).toBe("<p>a\nb");
		});

		it("normalizes a lone CR to a newline", () => {
			// Preprocessing maps CR to LF without changing length, so the raw
			// source is not the text's serialization even at equal lengths.
			expect(minify("<p>a\rb</p>")).toBe("<p>a\nb");
			expect(minify("<p>a\r\rb</p>")).toBe("<p>a\n\nb");
		});

		it("keeps a CRLF text run whole when it leads an insertion mode", () => {
			// `leadingWs` splits this run, and its source span has to survive the
			// CRLF collapsing or the tail is dropped. `<colgroup>` both splits the
			// run and keeps it, where `<head>` / `<html>` drop theirs as inert.
			expect(minify("<table><colgroup>\r\n\t<col></colgroup></table>")).toBe(
				"<table><colgroup>\n\t<col></table>"
			);
			expect(minify("<table>\r\n\t<tr><td>x</table>")).toBe(
				minify("<table>\n\t<tr><td>x</table>")
			);
		});

		it("keeps whitespace that decoded from character references", () => {
			// Decoding shortens the run, so the split cannot count its offsets in
			// the source either.
			expect(minify("<table><colgroup>&#10;&#9;<col></colgroup></table>")).toBe(
				"<table><colgroup>\n\t<col></table>"
			);
		});

		it("leaves a CR inside a literal-text element alone", () => {
			expect(minify("<script>a\r\nb</script>")).toBe("<script>a\nb</script>");
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
		expect(new SourceProcessor().process("<p>x</p>")).toBeUndefined();
	});

	it("beautifies by re-serializing rather than rewriting", () => {
		// Ugly is allowed — nothing is re-indented — but the source's own attribute
		// quoting, comments and end tags all have to come back.
		const source =
			'<!DOCTYPE html><div id=a class="x"><!-- c --><p>hi <b>there</b></p><ul><li>one<li>two</ul></div>';
		expect(print(source, "beautify")).toBe(
			'<!DOCTYPE html><div id=a class="x"><!-- c --><p>hi <b>there</b></p><ul><li>one</li><li>two</li></ul></div>'
		);
		expect(print(source, "minify")).toBe(
			"<!doctype html><div id=a class=x><p>hi <b>there</b><ul><li>one<li>two</ul></div>"
		);
	});

	it("escapes text to the letter of \u00A713.3 outside minification", () => {
		// A bare `>` is only ever a character, and so is a `<` before a space, so
		// minification keeps both; the CR is a reference either way.
		const source = "<p>a &amp; b &lt; c &gt; d &#13; e</p>";
		expect(print(source, "beautify")).toBe(
			"<p>a &amp; b &lt; c &gt; d &#13; e</p>"
		);
		expect(print(source, "minify")).toBe("<p>a & b < c > d &#13; e");
	});

	it("keeps a `<` that stands as a character, so a second pass adds nothing", () => {
		// The comment splits the text in two, and dropping it merges them: escaping
		// per node rather than per `<` would then escape what the first pass kept.
		const once = print("<boo/>hay\n<<<<>foo\n<!-- -->>><", "minify");
		expect(once).toBe("<boo>hay\n<<<<>foo\n>>&lt;</boo>");
		expect(print(once, "minify")).toBe(once);
	});

	it("beautifies to something that minifies back the same", () => {
		for (const source of [
			'<!DOCTYPE html><div id=a class="x"><!-- c --><p>hi</p></div>',
			"<table><tr><td>x</table>",
			"<div><pre>\n\nkeep</pre><template><p>t</p></template></div>",
			"<svg><path/></svg><math><mi>x</mi></math>",
			"<p><b>a<p>b"
		]) {
			expect(print(print(source, "beautify"), "minify")).toBe(
				print(source, "minify")
			);
		}
	});
});

describe("SourceProcessor — printing in pieces", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} source html source
	 * @returns {string} minified serialization
	 */
	const minify = (source) =>
		new SourceProcessor().process(source, { mode: "minify" }).code;

	// Most of a document prints as open tag, children, end tag, each piece
	// leaving as the walk reaches it. These are the exceptions: elements printed
	// whole, and pieces decidable only once something inside has printed.

	it("prints a long sibling chain a piece at a time", () => {
		// The store is what this avoids: nothing but the node being printed is in
		// it, so a wide document costs its output rather than a multiple of it.
		const source = `<div id=a>${"<span>x</span>".repeat(200)}</div>`;
		expect(minify(source)).toBe(source);
	});

	for (const name of ["pre", "textarea", "listing"]) {
		it(`re-adds the leading newline <${name}> would lose on re-parsing`, () => {
			// The parser eats one newline going in, so a value that starts with one
			// needs a second — knowable only once the children are in, which is why
			// this element prints whole.
			expect(minify(`<div><${name}>\n\nkeep</${name}></div>`)).toBe(
				`<div><${name}>\n\nkeep</${name}></div>`
			);
			expect(minify(`<div><${name}>x</${name}></div>`)).toBe(
				`<div><${name}>x</${name}></div>`
			);
		});

		it(`swallows a newline only in the token right after <${name}>`, () => {
			// §13.2.6.4.7 ignores the newline only if it is *the next token*, so an
			// end tag, a comment or a doctype in between ends the offer — the
			// newline after them belongs to the document and renders.
			expect(minify(`<div><${name}></${name}>\nafter</div>`)).toBe(
				`<div><${name}></${name}>\nafter</div>`
			);
			// `<textarea>` is RCDATA, so nothing but text can come between.
			if (name === "textarea") return;
			expect(minify(`<div><${name}><!--c-->\nkeep</${name}></div>`)).toBe(
				`<div><${name}>\n\nkeep</${name}></div>`
			);
			expect(
				minify(`<div><${name}><!DOCTYPE html>\nkeep</${name}></div>`)
			).toBe(`<div><${name}>\n\nkeep</${name}></div>`);
			expect(minify(`<${name}><span></span>\nkeep</${name}>`)).toBe(
				`<${name}><span></span>\nkeep</${name}>`
			);
		});
	}

	it("drops an omitted tag that nothing printed inside", () => {
		expect(minify("")).toBe("");
		expect(minify("<html><body>")).toBe("<body></body></html>");
		// The comment goes, but the `</body>` closing the element was written.
		expect(minify("</body><!--c-->")).toBe("</body>");
	});

	it("keeps the end tag of a `<tbody>` whose start tag is omitted", () => {
		// Its start tag goes, its end tag stays — a `<caption>` after it would
		// otherwise re-parse into the row group.
		expect(minify("<table><tr><td>x</tbody><caption>c</caption></table>")).toBe(
			"<table><tr><td>x</tbody><caption>c</table>"
		);
		expect(minify("<table><tbody><tr><td>x</table>")).toBe(
			"<table><tr><td>x</table>"
		);
		expect(minify("<table><colgroup><col></colgroup><tr><td>y</table>")).toBe(
			"<table><col><tr><td>y</table>"
		);
	});

	it("keeps the end tag of a `/>` element that has children", () => {
		// `/>` only closes the tag in foreign content; in HTML it is ignored, and
		// whether the end tag is needed hangs on what ends up inside.
		expect(minify("<div/>x</div>")).toBe("<div>x</div>");
		expect(minify("<div/></div>")).toBe("<div>");
		expect(minify("<svg><path/><circle/></svg>")).toBe(
			"<svg><path/><circle/></svg>"
		);
	});

	it("prints a `<template>`'s content fragment in its place", () => {
		expect(minify("<div><template><p>a</p></template></div>")).toBe(
			"<div><template><p>a</template></div>"
		);
		expect(minify("<template></template>")).toBe("<template></template>");
	});

	it("drops a last child's end tag only when the parent's puts it back", () => {
		// "Any other end tag" walks past what is not special, so `</select>` closes
		// an `<optgroup>` / `<option>` however the parent is spelled.
		expect(
			minify("<select><optgroup><option>a</option></optgroup></select>")
		).toBe("<select><optgroup><option>a</select>");
		expect(minify("<ruby><rt>a</rt></ruby>")).toBe("<ruby><rt>a</ruby>");
		// A special one blocks that walk, so it needs a parent whose end tag
		// generates implied end tags.
		expect(minify("<div><p>x</p></div>")).toBe("<div><p>x</div>");
		expect(minify("<canvas><p>x</p></canvas>")).toBe(
			"<canvas><p>x</p></canvas>"
		);
		expect(minify("<my-el><p>x</p></my-el>")).toBe("<my-el><p>x</p></my-el>");
		// `</template>` closes what is open in the content fragment.
		expect(minify("<div><template><p>x</p></template></div>")).toBe(
			"<div><template><p>x</template></div>"
		);
	});

	it("drops a ruby segment's end tag only inside a `ruby`", () => {
		expect(minify("<ruby><rt>a</rt><rt>b</rt></ruby>")).toBe(
			"<ruby><rt>a<rt>b</ruby>"
		);
		// Without one the follower's start tag closes nothing, so this one would
		// go on to hold it.
		expect(minify("<div><rt>a</rt><rt>b</rt></div>")).toBe(
			"<div><rt>a</rt><rt>b</div>"
		);
		// A scope marker between the two ends the search, whether it is an element
		// `ruby` cannot reach past or a content fragment above it.
		expect(
			minify("<ruby><table><tr><td><rt>a</rt><rt>b</rt></table></ruby>")
		).toBe("<ruby><table><tr><td><rt>a</rt><rt>b</table></ruby>");
		expect(
			minify("<ruby><template><rt>a</rt><rt>b</rt></template></ruby>")
		).toBe("<ruby><template><rt>a</rt><rt>b</template></ruby>");
		// So does leaving HTML: the `ruby` above is in another namespace's subtree.
		expect(
			minify(
				"<ruby><svg><foreignObject><rt>a</rt><rt>b</rt></foreignObject></svg></ruby>"
			)
		).toBe(
			"<ruby><svg><foreignObject><rt>a</rt><rt>b</rt></foreignObject></svg></ruby>"
		);
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
		["whitespace between head and body", "</head>\n"],
		["a space between head and body", "</head> "],
		["a comment after body", "</body><!--ab-->"],
		["a comment after html", "</html><!--x-->"],
		// Serializing writes back the newline the parser drops — in HTML only, so a
		// MathML `textarea`, which keeps its own, must not gain one.
		["a foreign textarea's leading newline", "<math><textarea>\ny"],
		["an html textarea's leading newline", "<textarea>\ny"],
		["a pre's leading newline", "<pre>\ny"],
		// §4.13 pairs the `<colgroup>` tags, and a `<template>` behind one does not
		// close it: the head rules take it where it stands.
		["two colgroups a col each", "<table><col>y<col>"],
		["a template behind a colgroup", "<table><col></br><template>"],
		// A `<select>` inserts no active-formatting marker, so `</marquee>` clears
		// the `<b>` rather than stopping short and rebuilding it behind the marquee.
		["formatting a marquee cleared", "<marquee><b><select></marquee>x"],
		// §13.2.6.4.7 ignores a `<form>` start tag while the pointer is set, so a
		// nested one needs the end tag that cleared it written back in front.
		["a form inside a form", "<form><div></form><form>"],
		["a form a button holds", "<form><button></form><form>"],
		// Foster parenting puts a node before the table it was written inside, so in
		// tree order its start tag reaches what the table had kept out of scope.
		["a list fostered out of a table", "<p><table><ol>"],
		["a definition fostered out of one", "<dd><table><dd>"],
		["an option fostered out of one", "<option><table><option>"],
		["a heading fostered out of one", "<h2><table><h1>"],
		["ruby fostered out of one", "<ruby><rtc><table><rb>"],
		["a form the table kept", "<table><p><form>"],
		["an input that ends a select", "<select><table><input>"],
		["a foreign element fostered out of one", "<h2><table><svg><h1>"],
		["a style the fostered element holds", "<p><table><p><style>"],
		["a newline the fostered pre kept", "<table><pre><head>\n"],
		// A `<template>` anywhere above suspends the form element pointer, so the
		// end tag that a nested form otherwise needs would only close the outer one.
		["a form a template holds", "<template><form><form>"],
		// A scope rule ends the nearest match on the stack rather than the parent,
		// so what a fostered run would close can sit any number of elements above.
		["an input under a fostered div", "<select><table><div><input>"],
		["a button under a fostered list", "<button><table><ol><button>"],
		["a select above what holds the table", "<select><span><table><input>"],
		// Whitespace a table kept and text it fostered stay two nodes: moved back in
		// beside each other they would fuse into one.
		["text beside whitespace a table kept", "<dt><table> </nav>x<p>"],
		["a comment behind a column group", "<table><col><!--c-->"],
		["a form a foreign element holds", "<form><svg><form>"],
		["a hidden input the table keeps", "<select><table><input type=hidden>"],
		["an input the table fosters", "<select><table><input type=text>"],
		["a fostered list of several items", "<p><table><ol><li>a</li><li>b</li>"],
		["a run fostered inside template content", "<template><table><p><ol>"],
		["a foreign run with children", "<p><table><svg><desc>d</desc>"],
		["a run a template's content holds", "<template><table><li><p>"],
		["a second column group behind a run", "<dd><table><col><dd><col>"],
		[
			"a run that moves beside one that cannot",
			"<p><table><ol></table><div><table><b>"
		],
		// And where tree order already re-parses, it is left alone.
		["a paragraph fostered out of one", "<table><p>"],
		// Every scope stops at a table, so a formatting element written inside one
		// reaches an ancestor of the same name only once printed outside it.
		["a formatting element the table held out of scope", "<nobr><table><nobr>"],
		["one under a run that closes the holder", "<p><table><i><ol>"],
		[
			"a foreign element fostered out of a table",
			"<i><article><table><desc></i>"
		],
		// §13.2.6.5 inserts a foreign `<form>` without consulting the form pointer.
		["a form in foreign content inside another", "<form><svg><form><dd>"],
		// §13.2.4.3 rebuilds these from the list of active formatting elements, so
		// no tag placement reaches them and the source is what prints.
		[
			"a run holding a rebuilt formatting element",
			"<nobr><table><b><colgroup><nobr>"
		],
		[
			"one rebuilt behind a row group",
			"<button><table><nobr><button><tbody><option>"
		],
		["a rebuilt one an end tag closed", "<table><i><tfoot><a></i><li><rtc>"],
		["two the source never closed", "<table><b><b><tr><img>"],
		["a second table inside the run's own", "<b><table><b><table>x<div>"],
		// The run's holder is read back off its own tag, which the source may have
		// spaced out before the `>`.
		["a spaced-out tag holding a run", "<b ><table><b><table>x<div>"],
		[
			"an end tag the region already carries",
			"<i><h1><table><a><thead></i><dd></p> <noframes>"
		],
		["a run under an implied body", "<table><a><tr>0"],
		// The table keeps whitespace-only text and fosters the rest, so the run
		// cannot come back beside it without the two fusing.
		["a run beside whitespace the table kept", "<p><table>\n<br>0 <li>"],
		["text the table kept before a run", "<p><table>0 \n</main>\n<figcaption>"],
		// §13.2.6.4.7 gives `a` and `nobr` a start-tag rule of their own, so writing
		// a rebuilt one back is not the same as never having removed it.
		["a rebuilt nobr a heading left on the list", "<h2><nobr><h2><nobr>"],
		["a rebuilt a behind a marker", "<a><template><applet></template><a>"],
		// A marquee's marker hides the outer `<b>` from the list, so the rebuilt one
		// inside it is a second element of the same name rather than the same one.
		["a name repeated below a marker", "<b><marquee><b><table><a>x"],
		// §13.2.6.4.7 stops the dd/dt loop at a special element, and generates
		// implied end tags for an `<hr>` while a `<select>` is in scope.
		["a list item a select held open", "<dt><p><select><dd>"],
		// §13.2.6.4.7 stops the `li` loop at a special element that is not
		// `address`/`div`/`p`, leaving the item below it open.
		["an item a section kept open", "<ul><li><section><li>x"],
		["an hr the table held out of a select's scope", "<select><dt><table><hr>"],
		// The `</form>` a nested form needs generates implied end tags of its own.
		[
			"a nested form behind something implied",
			"<form><center></form><rt><form>"
		],
		// §13.2.6.4.7's close-a-p list is not §4.13's tag-omission list.
		["a p closed by a start tag only the parser lists", "<p><table><center>"],
		// The run and the table's own children only read in source order while the
		// two do not overlap.
		[
			"a run written inside a sibling's span",
			"<rb><table><tbody><rb><th><table> </h2>x\n<li>"
		],
		[
			"a run beside a table a template holds",
			"<table><mtext><template><table><tfoot><rt><rtc>"
		],
		// A parser-implied element carries attributes once a later tag merges them
		// on, so it prints its tags — and it has no name in the source to echo.
		[
			"a comment behind an implied html the source gave attributes",
			"ab<html B=2 a=1></html><!--0-->"
		],
		["one behind an implied body", "</body><!--x--><body class=b>"]
	])("keeps %s", (_name, source) => {
		expect(reparsed(source)).toBe(serializeHtmlTree(parseHtml(source)));
	});

	it("closes a merged-attribute implied element by name, not with `</>`", () => {
		// Its end tag is generated from the source range, which a parser-inserted
		// element does not have — the slice of one spells `</>`.
		expect(
			new SourceProcessor().process("ab<html B=2 a=1></html><!--0-->", {
				mode: "beautify"
			}).code
		).toBe('<html b="2" a="1">ab</html><!--0-->');
	});

	it("prints a run it cannot re-nest from the source that built it", () => {
		// §13.2.4.3 makes the second `<b>` from the list of active formatting
		// elements, so no arrangement of tags places it — the source does.
		expect(
			new SourceProcessor().process("<nobr><table><b><colgroup><nobr>", {
				mode: "beautify"
			}).code
		).toBe("<nobr><table><b><colgroup><nobr>");
	});

	// From wpt's `html/syntax/serializing-html-fragments`. Held to the tree, not
	// to §13.3's text: this printer echoes the source rather than re-serializing.
	describe("wpt serialization cases", () => {
		it.each([
			["a bare ampersand in an attribute", "<span><a b='&'></a></span>"],
			["a no-break space in an attribute", "<span><a b='&nbsp;'></a></span>"],
			["a quote in an attribute", "<span><a b='\"'></a></span>"],
			["a less-than in an attribute", '<span><a b="<"></a></span>'],
			["a greater-than in an attribute", '<span><a b=">"></a></span>'],
			[
				"an escaped javascript url",
				'<span><a href="javascript:&quot;&lt;>&quot;"></a></span>'
			],
			[
				"a namespaced attribute on svg",
				'<span><svg xlink:href="a"></svg></span>'
			],
			[
				"an xmlns attribute on svg",
				'<span><svg xmlns:svg="test"></svg></span>'
			],
			// Raw-text and escapable-raw-text elements: the markup inside them is
			// text, and printing it back must not let it become tags again.
			["markup inside style", "<span><style><&></style></span>"],
			["markup inside xmp", "<span><xmp><&></xmp></span>"],
			["markup inside iframe", "<span><iframe><&></iframe></span>"],
			["markup inside noembed", "<span><noembed><&></noembed></span>"],
			["markup inside noframes", "<span><noframes><&></noframes></span>"],
			["a comment", "<span><!--data--></span>"],
			[
				"nested elements",
				"<span><a><b><c></c></b><d>e</d><f><g>h</g></f></a></span>"
			],
			["an unquoted attribute value", "<span b=c></span>"],
			// Scripting is off in webpack, so `<noscript>` holds markup rather than
			// text — wpt's escaping.html is the case that says so.
			["markup inside noscript", "<span><noscript><&></noscript></span>"],
			["unescaped noscript content", "<noscript>& <></noscript>"],
			["escaped noscript content", "<noscript>&amp;&nbsp;&lt;&gt;</noscript>"],
			["an element inside noscript", "<noscript><b>x</b></noscript>"],
			[
				"a link inside noscript in head",
				"<head><noscript><link href=x></noscript>"
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
		["implied list items", "<ul><li>a<li>b</ul>"],
		["implied table sections", "<table><tr><td>1<td>2"],
		["an implied paragraph", '<div   class="x"    id=y ><p>z'],
		// Nothing the author wrote is rewritten: quoting, case and the spacing
		// inside a tag all survive.
		["attribute spelling", "<A HREF='x'   dATa-Y=1 >t</A>"],
		["an unquoted attribute", "<img src=a.png alt=hi>"],
		// The round-trip fallback: shapes no tag placement reproduces print from
		// the source that built them.
		["a fostered formatting run", "<nobr><table><b><colgroup><nobr>"],
		["a list fostered out of a table", "<p><table><ol>"],
		["a form the table kept", "<table><p><form>"],
		// Raw text keeps its content, and a comment survives.
		["raw text", "<style>a{b:c}</style><script>1<2</script>"],
		// The same two names in a foreign subtree hold character data, not raw
		// text, so what they carry stays escaped.
		["a foreign script", "<svg><script>&lt;b&gt;</script></svg>"],
		["a foreign style", "<svg><style>&lt;/style&gt;</style></svg>"],
		["a comment", "<div><!--c--></div>"]
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
			["a body implied before leading whitespace", "</html> leading ws"]
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
			"<ul>\n<li>a<ul>\n<li>b</li>\n</ul>\n</li>"
		],
		["a term nested behind a division", "<dl>\n<dt>a<div>\n<dt>b</div>\n</dl>"],
		["a link inside a link", '<a href="/x">a<b>\n<a href="/y">b</a></b></a>'],
		["a second form", '<form action="/a">\n<p>x<form action="/b">y'],
		["a run fostered out of a table", "<p><table>\n<ol>\n<li>x"],
		[
			"an inline sheet under a nested list",
			"<ul><li>a<ul>\n<li><style>  a { color : #ff0000 }  </style>"
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
		const source = "<nobr><table><b><colgroup><nobr>  x  ";
		expect(minify(source)).toBe(source);
	});

	it("minifies a document whose deferred svg the guard reads back", async () => {
		// An `<svg>` subtree is offered whole, so the print holds a marker where it
		// stood; this document also fosters, so the guard re-parses the print.
		const source =
			'<table>\n\t<svg viewBox="0 0 8 8">   <circle cx="4" cy="4" r="3"/>   </svg>\n\t<tr><td class="a  b">y</td></tr>\n</table>\n';
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
			minify('<p style="color: #ff0000"><b style="color: #ff0000">', {
				renderEmbeddedSource: builtinEmbeddedRenderer()
			})
		).toBe("<p style=color:red><b style=color:red></b>");
	});

	it("runs a caller's renderer for every style attribute, repeats included", () => {
		// The renderer is handed every `style=""`, so a memo keyed on the value
		// alone would hand the second attribute the first one's result. It is
		// offered the declaration list itself — `as` says so — and answers with one.
		let calls = 0;
		const code = minify('<p style="color: red"><b style="color: red">', {
			renderEmbeddedSource: (source, info) =>
				info.type === "css" ? `--call:${++calls}` : source
		});
		expect(calls).toBe(2);
		expect(code).toBe("<p style=--call:1><b style=--call:2></b>");
	});

	it("does not carry a style attribute's result into a renderer with other options", () => {
		const html = '<p style="width: 16px">';
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
		expect(deepestTagName("<body><my-widget>")).toBe("my-widget");
		expect(deepestTagName("<body><my-gadget>")).toBe("my-gadget");
		expect(deepestTagName("<body><MY-WIDGET>")).toBe("my-widget");
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
		expect(deepestTagName("<body><my-widget>")).toBe("my-widget");
	});

	it("hands out one shared string for a known name", () => {
		// What lets the memo keep a known name across parses: the entry is this
		// constant, not a slice of the document that asked for it.
		const first = deepestTagName("<body><section>");
		const second = deepestTagName("<body><SECTION>");
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
	const SOURCE = '<p><iframe srcdoc="&lt;p&gt;a"></iframe>';

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
			await min("<p><iframe srcdoc='&lt;p&gt;a'></iframe>", () => "<p>b")
		).toBe("<p><iframe srcdoc='<p>b'></iframe>");
		expect(await min(SOURCE, () => "<p>b")).toBe(
			'<p><iframe srcdoc="<p>b"></iframe>'
		);
	});

	it("gives a `srcdoc` the source wrote bare the quotes its answer needs", async () => {
		// An unquoted value carries no delimiter to keep, so the answer's own
		// content is all there is to go on.
		expect(
			await min("<p><iframe srcdoc=&lt;p&gt;a></iframe>", () => '<p a="b">')
		).toBe("<p><iframe srcdoc='<p a=\"b\">'></iframe>");
	});

	it("leaves the attribute as written when an async renderer declines", async () => {
		// Declining on the deferring path puts the attribute back as the source
		// spelled it: the raw value, references and delimiter included.
		expect(await min(SOURCE, () => Promise.resolve(undefined))).toBe(
			'<p><iframe srcdoc="&lt;p&gt;a"></iframe>'
		);
		expect(
			await min("<p><iframe srcdoc=&lt;p&gt;a></iframe>", () =>
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
			await min('<p style="margin: 0 auto">x</p>', () => "color:red")
		).toBe("<p style=color:red>x");
	});

	it("keeps an answer that now needs quotes", async () => {
		expect(
			await min('<p style="color: red">x</p>', () => "margin:0 auto")
		).toBe('<p style="margin:0 auto">x');
	});

	it("minifies a `data:` payload the answer shortens past its quotes", async () => {
		// The shape webpack's own default reaches through the css minifier: with
		// the payload minified the whole value fits unquoted.
		expect(
			await min(
				"<p style=\"background:url('data:text/css,  .q  {  color : red  }  ')\">x</p>",
				() => "background:url(data:text/css,.q{color:red})"
			)
		).toBe("<p style=background:url(data:text/css,.q{color:red})>x");
	});

	it("declines an answer that would change a foreign `/>`", async () => {
		// Whether a space must precede a foreign `/>` is decided when the tag
		// closes, too early to wait for the answer, so the source's spelling stands.
		expect(
			await min("<svg><rect style=color:red /></svg>", (source, info) =>
				info.type === "css" ? "margin:0 auto" : undefined
			)
		).toBe("<svg><rect style=color:red /></svg>");
		// An answer that keeps the tag ending as the source had it is taken.
		expect(
			await min('<svg><rect style="color: red" /></svg>', (source, info) =>
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

		await min('<p onclick="  f( 1 )  ">x</p>', (source, info) => {
			asked.push([source, info.as]);
			return undefined;
		});

		// Handed over as written: an engine that takes only whole scripts wraps it
		// itself, which is a choice a renderer supporting the production must keep.
		expect(asked).toEqual([["  f( 1 )  ", "event-handler"]]);
	});

	it("writes the answer back", async () => {
		expect(await min('<p onclick="  f( 1 )  ">x</p>', () => "f(1)")).toBe(
			"<p onclick=f(1)>x"
		);
	});

	it("carries a `return` through, which is what a handler body may hold", async () => {
		expect(
			await min('<form onsubmit="return  false"><input></form>', (source) => {
				expect(source).toBe("return  false");
				return "return!1";
			})
		).toBe("<form onsubmit=return!1><input></form>");
	});

	it("keeps the handler where the renderer declines", async () => {
		expect(await min('<p onclick="f( 1 )">x</p>', () => undefined)).toBe(
			'<p onclick="f( 1 )">x'
		);
	});

	it("reports what a renderer threw over a handler", async () => {
		// A body no JavaScript production holds is the renderer's to report, as an
		// inline `<script>` that does not parse is.
		const { code, errors } = await htmlMinify(
			{ "page.html": '<p onclick="var = broken(">x</p>' },
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
			"a.html": "<p class='x'>  a  </p>"
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
				"<!--! a -->\n<p>a</p>\n\t<!-- b --><p>b</p> <!-- c -->\n"
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
				'<!--! top --><iframe srcdoc="<!--! inner --><p>x</p>"></iframe>'
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
			'<p style="color:  #ff0000 ;">x</p>',
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
				'<p style="color:  #ff0000 ;">x</p>',
				(source) => source
			)
		).toBe('<p style="color:  #ff0000 ;">x');
		expect(
			await deferredStyle(
				'<p style="color:  #ff0000 ;" id=q>x</p>',
				(source) => source
			)
		).toBe('<p style="color:  #ff0000 ;" id=q>x');
	});

	it("takes what a deferred renderer answers, longer or not", async () => {
		expect(
			await deferredStyle(
				'<p style="color:  #ff0000 ;">x</p>',
				() => "color:blue"
			)
		).toBe("<p style=color:blue>x");
		expect(
			await deferredStyle(
				'<p style="color:  #ff0000 ;">x</p>',
				() => "color:rgb(255 0 0)"
			)
		).toBe('<p style="color:rgb(255 0 0)">x');
	});

	it("offers a deferred renderer the list, not its spelling", async () => {
		/** @type {string[]} */
		const offered = [];
		const code = await deferredStyle(
			'<p style="color&#x3a;red">x</p>',
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
			'<p style="margin:0 auto">x</p>',
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
			await deferredStyle('<p style="margin:0 auto">x</p>', () => undefined)
		).toBe('<p style="margin:0 auto">x');
	});

	it("keeps one a deferred renderer declines as written", async () => {
		expect(
			await deferredStyle('<p style="color:  #ff0000 ;">x</p>', () => undefined)
		).toBe('<p style="color:  #ff0000 ;">x');
	});

	it("trims the whitespace around a URL, until told not to", () => {
		const html = '<a href="  /a  ">x</a>';
		expect(minify(html)).toBe("<a href=/a>x</a>");
		expect(minify(html, off({ normalizeUrlAttributes: false }))).toBe(
			'<a href="  /a  ">x</a>'
		);
	});

	it("trims the whitespace around a `<script src>`", () => {
		expect(minify('<script src="  /a.js  "></script>')).toBe(
			"<script src=/a.js></script>"
		);
	});

	it.each([
		['<img src="  a.png  " alt=a>', '<img src="  a.png  " alt=a>'],
		['<form action="  /post  "></form>', '<form action="  /post  "></form>'],
		['<video poster="  p.png  "></video>', '<video poster="  p.png  "></video>']
	])("keeps the whitespace in %s with the switch off", (html, expected) => {
		expect(minify(html, off({ normalizeUrlAttributes: false }))).toBe(expected);
	});

	it("collapses only the canonical spelling by default", () => {
		expect(minify('<input checked="checked" disabled="">')).toBe(
			"<input checked disabled>"
		);
		expect(minify('<input checked="false">')).toBe("<input checked=false>");
	});

	it("collapses any value at `all`", () => {
		expect(
			minify(
				'<input checked="false">',
				off({ collapseBooleanAttributes: "all" })
			)
		).toBe("<input checked>");
		expect(
			minify(
				'<input checked="checked">',
				off({ collapseBooleanAttributes: "all" })
			)
		).toBe("<input checked>");
	});

	it("collapses at `all` only where the attribute is a boolean one", () => {
		// `contenteditable` is enumerated and `checked` is not boolean on a `<p>`,
		// so neither is a presence the value may go from.
		expect(
			minify(
				'<p contenteditable="contenteditable">x</p>',
				off({ collapseBooleanAttributes: "all" })
			)
		).toBe("<p contenteditable=contenteditable>x");
		expect(
			minify(
				'<p checked="false">x</p>',
				off({ collapseBooleanAttributes: "all" })
			)
		).toBe("<p checked=false>x");
	});

	it("keeps every spelling with the switch off", () => {
		expect(
			minify(
				'<input checked="checked">',
				off({ collapseBooleanAttributes: false })
			)
		).toBe("<input checked=checked>");
		// The tokenizer reads `x` and `x=""` as the same attribute, so the bare
		// name is not this switch's to keep.
		expect(
			minify('<input checked="">', off({ collapseBooleanAttributes: false }))
		).toBe("<input checked>");
	});

	it("sorts a token list with list normalization off", () => {
		const html = '<p class="b a c">x</p>';
		expect(
			minify(html, {
				sortTokenLists: true,
				transforms: { normalizeListAttributes: false }
			})
		).toBe('<p class="a b c">x');
		expect(minify(html, off({ normalizeListAttributes: false }))).toBe(
			'<p class="b a c">x'
		);
	});

	it("sorts no list the DOM does not read as a set", () => {
		// `ping` is the order its requests go out in, so it is no set to sort.
		expect(
			minify('<a ping="  b   a ">x</a>', {
				sortTokenLists: true,
				transforms: { normalizeListAttributes: false }
			})
		).toBe('<a ping="  b   a ">x</a>');
	});
});

describe("SourceProcessor — reflected attributes are read per element", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	// Each case pairs the element the table names with one it does not, so a
	// rewrite keyed on the attribute name alone fails the second half.
	it("collapses a boolean attribute only where it is reflected", () => {
		expect(minify('<marquee truespeed="truespeed">x</marquee>')).toBe(
			"<marquee truespeed>x</marquee>"
		);
		expect(minify('<div truespeed="truespeed">x</div>')).toBe(
			"<div truespeed=truespeed>x</div>"
		);
		expect(minify('<dir compact="compact"><li>x</li></dir>')).toBe(
			"<dir compact><li>x</dir>"
		);
		expect(minify('<div compact="compact">x</div>')).toBe(
			"<div compact=compact>x</div>"
		);
	});

	it("normalizes an integer attribute only where it is reflected", () => {
		expect(
			minify('<marquee scrollamount="0010" scrolldelay="0085">x</marquee>')
		).toBe("<marquee scrollamount=10 scrolldelay=85>x</marquee>");
		expect(minify('<div scrollamount="0010">x</div>')).toBe(
			"<div scrollamount=0010>x</div>"
		);
		expect(minify('<div scrolldelay="0085">x</div>')).toBe(
			"<div scrolldelay=0085>x</div>"
		);
		expect(minify('<marquee hspace="007" vspace="008">x</marquee>')).toBe(
			"<marquee hspace=7 vspace=8>x</marquee>"
		);
		expect(minify('<div hspace="007">x</div>')).toBe("<div hspace=007>x</div>");
		expect(minify('<div vspace="008">x</div>')).toBe("<div vspace=008>x</div>");
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
		expect(minify("<br>")).toBe("<br>");
	});

	it("clears it on an end tag, which drops every attribute it parsed", () => {
		const src = `${oversizedDocument()}</b class="c" class="d">`;
		expect(minify(src)).toContain("data-659-99=1></i>");
		expect(minify("<br>")).toBe("<br>");
	});

	it("clears it on a start tag the tokenizer only emitted at EOF", () => {
		const src = `${oversizedDocument()}<b class="c" class="d"`;
		expect(minify(src)).toContain("data-659-99=1></i>");
		expect(minify("<br>")).toBe("<br>");
	});
});

// HTML §13.2.3.1: the decoder takes a leading BOM as the encoding's mark, so the
// document the parser sees starts after it.
describe("SourceProcessor — a byte order mark", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	const page = "﻿<!DOCTYPE html><title>t</title><p>x";

	it("keeps the doctype it stands before and prints it first when minifying", () => {
		expect(new SourceProcessor().process(page, { mode: "minify" }).code).toBe(
			"﻿<!doctype html><title>t</title><p>x"
		);
	});

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
		const html = "<table>x<tr><td>a</table>";
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
		["beautify", "<cite><b><cite><i><cite><i><cite><i><div>X</b>TEST", ""],
		[
			"minify",
			'<p><font size=4><font size=4><font size=4><font size="5"><font size=4><p>X',
			""
		],
		["beautify", "<svg><![CDATA[\u0000]]></svg><frameset>", ""],
		["minify", "<body><?a$><?b$><?good?>", ""],
		["beautify", "<a><table><td><a><table></table><a></tr><a></table><a>", ""],
		[
			"beautify",
			'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN"><html></html>',
			""
		],
		[
			"minify",
			"<table><tr></strong></b></em></i></u></strike></s></blink></tt></pre></big></small></font></select></h1></h2></h3></h4></h5></h6></body></br></a></img></title></span></style></script></table></th></td></tr></frame></area></link></param></hr></input></col></base></meta></basefont></bgsound></embed></spacer></p></dd></dt></caption></colgroup></tbody></tfoot></thead></address></blockquote></center></dir></div></dl></fieldset></listing></menu></ol></ul></li></nobr></wbr></form></button></marquee></object></html></frameset></head></iframe></image></isindex></noembed></noframes></noscript></optgroup></option></plaintext></textarea>",
			""
		],
		["beautify", "<nobr><table><marquee></table><nobr>", ""],
		["minify", "<!doctype html><table><tbody><tr><plaintext></plaintext>", ""],
		[
			"beautify",
			"<select><option>A<select><option>B<select><option>C<select><option>D<select><option>E<select><option>F<select><option>G<select>",
			""
		],
		["beautify", "<g></path>X", "svg path"],
		["minify", "<math><tbody><mo><tfoot>", "tbody"],
		["beautify", "<body foo='bar'><body foo='baz' yo='mama'>", ""],
		["beautify", "</b test", ""],
		["minify", "<body><?_>", ""],
		["beautify", "<!-- inside </script> -->", "script"],
		["beautify", "<?", ""],
		["beautify", "<form><form>", "template"],
		["beautify", "<input><option>", "select"],
		["beautify", "<table><a>1<p>2</a>3</p>", ""],
		["beautify", "<!doctype html><div><body><frameset>", ""],
		["minify", "<body><template><tr></tr><td></td></template>", ""],
		[
			"beautify",
			"<body a=b><template><div></div><body c=d><div></div></body></template></body>",
			""
		],
		[
			"beautify",
			'<!DOCTYPE html SYSTEM "http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd"><p><table>',
			""
		],
		[
			"minify",
			'<!DOCTYPE html><body><title>X</title><meta name=z><link rel=foo><style>\nx { content:"</style" } </style>',
			""
		],
		["beautify", "<?#", ""],
		["beautify", "<select><hr>", ""],
		["beautify", "<p><table></p>", ""],
		["beautify", "<select><input>", ""],
		["beautify", "<button><button>", ""],
		["beautify", "<p><code x</code></p>\n", ""],
		["minify", '<div bar="ZZ&gt=YY"></div>', ""],
		[
			"minify",
			'<html><body>\n<p><font size="7">First paragraph.</p>\n<p>Second paragraph.</p></font>\n<b><p><i>Bold and Italic</b> Italic</p>',
			""
		],
		["beautify", "<!---x", ""],
		["minify", "<!doctype>", ""],
		["beautify", "<frameset>X", "svg desc"],
		["beautify", "<body><?xml>", ""],
		["beautify", "<body><?start", ""],
		["beautify", "<body><?start?", ""],
		["beautify", "<div><svg></div>a", ""],
		["beautify", "<!DOCTYPE ...>Hello", ""],
		["beautify", "<table><tr><div><td>", ""],
		["beautify", "<!doctype html><math/><foo>", ""],
		["beautify", "<math><annotation-xml></svg>x", ""],
		["beautify", "<!doctype html><table>abc<!--foo-->", ""],
		["beautify", "<!DOCTYPE html><textarea>\n</textarea>", ""],
		["beautify", '<!DOCTYPE html PUBLIC "html"><p><table>', ""],
		["beautify", "<html a=b><template><div><html b=c><span></template>", ""],
		[
			"beautify",
			"<p><b id=a><b id=a><b id=a><b><object><b id=a><b id=a>X</object><p>Y",
			""
		],
		[
			"beautify",
			'<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2//EN"\n   "http://www.w3.org/TR/html4/strict.dtd"><p><table>',
			""
		],
		["beautify", "</", ""],
		["beautify", "<body><!\u0000>", ""],
		["beautify", "<dd>1</foo>", ""],
		["beautify", "<script><!--", ""],
		["minify", "FOO&&&&gt;BAR", ""],
		["beautify", "<svg><![CDATA[", ""],
		["beautify", "</html><!--abc-->", "html"],
		["beautify", "<!doctypehtml><p><li>", ""],
		["beautify", "<template><a><table><a>", ""],
		["beautify", "<b><em><foo><foo><foo><aside></b>", ""],
		["beautify", "<br>BC<form>D<div>E</form>F</div>G", "template"],
		["beautify", "<div><sarcasm><div></div></sarcasm></div>", ""],
		[
			"beautify",
			"<div><a><b><div><div><div><div><div><div><div><div><div><div></a>",
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
			["an ancestor's end tag", "<p><button><plaintext>a</p>"],
			["a list item's", "<ul><li><plaintext>x"],
			["a template's", "<template><plaintext>a</template>b"],
			["an implied body's", "</html> <plaintext>x"],
			["a rebuilt formatting element's", "<p><b>x</p>y<plaintext>z"],
			["a cell's", "<table><td><plaintext>a"],
			["the table one was fostered out of", "<table><rb><dd><plaintext>a"]
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

		it("still ends one in foreign content, which is no PLAINTEXT state", () => {
			expect(print("<svg><plaintext>a</plaintext>b", BEAUTIFY)).toBe(
				"<svg><plaintext>a</plaintext>b</svg>"
			);
			keepsTree("<svg><plaintext>a</plaintext>b", MINIFY);
		});

		it("prints a script the input ran out in double-escaped as written", () => {
			// §13.2.5.20 on: past `<!--` and `<script`, a `</script>` only ends the
			// double escape, so the one this would add is more of the body.
			for (const source of [
				"<!doctype html><script><!--<script ",
				"<p><script><!--<SCRIPT/>x</p>",
				"<script><!--<script>a</scripts>-"
			]) {
				for (const options of [BEAUTIFY, MINIFY]) {
					expect(print(source, options)).toBe(source);
					keepsTree(source, options);
				}
			}
			// Where the escape ended, or never doubled, the end tag closes it.
			for (const [source, expected] of [
				[
					"<script><!--<script></script>x",
					"<script><!--<script></script>x</script>"
				],
				["<script><!--<script>--->x", "<script><!--<script>--->x</script>"],
				["<script><!--<scripts>x", "<script><!--<scripts>x</script>"],
				["<script><!-- a -->", "<script><!-- a --></script>"]
			]) {
				expect(print(source, BEAUTIFY)).toBe(expected);
				keepsTree(source, BEAUTIFY);
			}
		});

		it("prints the source where the tree has something after it", () => {
			// The comment went after `<body>`, behind the `<plaintext>` in tree
			// order, so no print in tree order keeps it out of the text.
			for (const source of [
				"</body><!--c--><p><plaintext>a",
				"<b></body><?pi?><plaintext>a",
				"<template><tbody><li><td><plaintext>x"
			]) {
				expect(print(source, BEAUTIFY)).toBe(source);
				expect(print(source, MINIFY)).toBe(source);
			}
		});
	});

	describe("a start tag left out where the parser puts its content elsewhere", () => {
		it.each([
			// §13.1.2.4 keeps `<html>` only before a comment, and `<?…>` is a bogus
			// comment to HTML.
			["a processing instruction first in <html>", "<html><?x><head>", MINIFY],
			["one after </body>", "<body>x</body><?x>", ALL],
			["one after </head>", "<head></head><?x><body>", ALL],
			["one after </html>", "</html><?x>", ALL],
			// §13.2.6.4.6 hands each of these to the head from "after head".
			["a title opening the body", "<body><title>x</title>y", ALL],
			["a base opening it", "<!DOCTYPE html><body><base>A", ALL],
			["a bgsound opening it", "<body><bgsound>A", ALL],
			["a basefont opening it", "<body><basefont>A", ALL],
			["noframes opening it", "<body><noframes>x</noframes>y", ALL],
			// "In head" reads a `<noscript>` too, before an omitted `</head>`.
			[
				"a noscript opening an implied body",
				"<tr><noscript><li></html>",
				BEAUTIFY
			],
			["one behind an ignored body tag", "<tbody><body><noscript><i>", MINIFY],
			// The first thing that prints is what decides, past dropped whitespace.
			[
				"a head element behind dropped whitespace",
				"</body> <template>x",
				COLLAPSED
			],
			["a base behind it", "<link><tfoot>\n<base><p>", COLLAPSED],
			[
				"a processing instruction behind it",
				"<col>\n</table><?pi?><p>",
				COLLAPSED
			],
			// An `<html>` in foreign content is an element like any other.
			["an svg html element", "<li><svg><html><script></script>", MINIFY],
			["a MathML one", "<math><html><mi>x</mi></html></math>", MINIFY],
			// Only "in table" implies a `<tbody>` or `<colgroup>`: a template's
			// content takes the `<tr>` / `<col>` as it stands.
			[
				"a tbody in template content",
				"<template><tbody><tr><td>x</tbody><p>",
				MINIFY
			],
			[
				"one behind other content",
				"<template><tbody><area></p><tr> \n <tr>",
				MINIFY
			],
			[
				"a colgroup in template content",
				"<template><colgroup><col></colgroup><p>",
				MINIFY
			]
		])("keeps %s", (_name, source, options) => {
			keepsTree(source, options);
		});

		it("still leaves out the ones the parser implies", () => {
			expect(print("<html><!--x--><head>", MINIFY)).toBe(
				"<head></head></html>"
			);
			expect(print("<body><p>x", ALL)).toBe("<p>x");
			expect(print("<table><tbody><tr><td>x</table>", MINIFY)).toBe(
				"<table><tr><td>x</table>"
			);
			expect(
				print("<table><colgroup><col></colgroup><tr><td>x</table>", MINIFY)
			).toBe("<table><col><tr><td>x</table>");
			expect(
				print("<template><tbody><tr><td>x</tbody></template>", MINIFY)
			).toBe("<template><tbody><tr><td>x</template>");
		});
	});

	describe("a fragment", () => {
		it("keeps the whitespace its root holds, which renders as the context's", () => {
			// The `<html>` a fragment parse roots its nodes in stands for the context
			// element, so what it holds is no whitespace outside a formatting context.
			expect(
				print("<body>\n<div>", { ...MINIFY, fragmentContext: "div" })
			).toBe("\n<div></div>");
			keepsTree("<body>\n<div>", { ...MINIFY, fragmentContext: "div" });
			// A document's is still dropped.
			expect(print("<html>\n<head></head>\n<body>", MINIFY)).toBe(
				"<head></head><body></body></html>"
			);
		});

		it("never writes its root as an `<html>` tag", () => {
			const KEPT = { ...MINIFY, transforms: { comments: true } };
			for (const source of [" <b>x</b>", "<!--a--><b>x</b>", "<meta> x"]) {
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

		it("leaves out a table group a table context implies", () => {
			// The root stands for the `<table>`, so "in table" reads the `<col>` and
			// `<tr>` there, and implies the group around each.
			for (const [source, expected] of [
				["<colgroup><col>", "<col>"],
				["<tbody><tr><td>x", "<tr><td>x"]
			]) {
				expect(print(source, { ...MINIFY, fragmentContext: "table" })).toBe(
					expected
				);
				keepsTree(source, { ...MINIFY, fragmentContext: "table" });
			}
			// Under a `<div>` context the parser implies neither.
			expect(
				print("<template><colgroup><col></template>", {
					...MINIFY,
					fragmentContext: "div"
				})
			).toBe("<template><colgroup><col></template>");
		});

		it("reads a form in a template context as template contents", () => {
			// Template contents never set the form element pointer, so the nested
			// form needs no `</form>` in front of it.
			expect(
				print("<form><form>", { ...BEAUTIFY, fragmentContext: "template" })
			).toBe("<form><form></form></form>");
			keepsTree("<form><form>", { ...BEAUTIFY, fragmentContext: "template" });
		});

		it.each([
			["svg path", "<th><p><html lang=en></tt><svg><dt>"],
			[
				"svg path",
				"<plaintext>&amp;<p class=x><xmp><head><math/>\n</option>\n"
			],
			["svg path", "<p class=x><mo><xmp><input></i></caption>&amp;<listing>"],
			[
				"select",
				"<svg/><select><ruby><input type=hidden><p class=x><math/><noembed>"
			],
			[
				"table",
				"<caption><math/><h2><a href=x><input></caption><source><thead><mi>"
			],
			["style", "<form><"]
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
				'<p><script type="text/javascript">a()</script><input value="" class=""><span></span><b/>x&amp y</p>';
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

	describe("an end tag the parser does not read where the source did", () => {
		it("keeps `</caption>` before anything but a table part", () => {
			// §13.1.2.4 lets it go unless whitespace or a comment follows, but "in
			// caption" only ends at a table part: a `<script>` beside it, which the
			// table's content model allows, would go inside it.
			const source =
				"<table><caption>x</caption><script>a()</script><tr><td>y</table>";
			expect(print(source, MINIFY)).toBe(source);
			keepsTree(source, MINIFY);
			keepsTree("<template><caption></table><script>", MINIFY);
			expect(
				print("<table><caption>x</caption><tbody><tr><td>y</table>", MINIFY)
			).toBe("<table><caption>x<tr><td>y</table>");
			expect(print("<table><caption>x</caption></table>", MINIFY)).toBe(
				"<table><caption>x</table>"
			);
		});

		it("reads back a print with a form nested in another", () => {
			// The `</form>` written in front of the inner one clears the form element
			// pointer, so the outer form's own end tag is then ignored, and the `</b>`
			// that follows it restructures both.
			for (const source of [
				"<b><form><applet></form><form>",
				"<b id=1><form></div><button><tbody></body><applet></form><h1>&lt;b&gt;<form>"
			]) {
				keepsTree(source, BEAUTIFY);
				keepsTree(source, MINIFY);
			}
			expect(print("<form><div></form><form>x", BEAUTIFY)).toBe(
				"<form><div></form><form>x</form></div></form>"
			);
		});
	});

	describe("text fostered out of a table", () => {
		it("prints what merged into the text before the table", () => {
			// The fostered run joined the text node in front of the table without
			// taking its range along, and both spellings happen to be five long.
			const source = "&amp;<table>&lt;b&gt;<</frameset>";
			for (const options of [BEAUTIFY, MINIFY]) {
				expect(print(source, options)).toMatch(
					/^&(?:amp;)?&lt;b(?:&gt;|>)&lt;/
				);
				keepsTree(source, options);
			}
		});

		it("prints a run behind leading whitespace an implied body keeps", () => {
			// The body printing from source held its start tag back without the end
			// tag that goes with it once it prints, and the walk read an undefined one.
			const source = "<tr> <table><tr><option><li>";
			for (const options of [BEAUTIFY, MINIFY]) {
				expect(print(source, options)).toBe(`<body>${source.slice(4)}`);
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
			const source = "<div><b>x</b><template><i>t</i></template></div><p>y";
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
				"<div><b>x</b></div><p>y",
				MINIFY,
				NodeType.Document
			);
			expect(code).toBe("<div><b>x</b></div><p>y");
			expect(log).toEqual(["-doc"]);
			expect(
				skipping(
					"<a><b/></a>",
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
		// Only the bytes between candidates go: the list itself is the same.
		[
			"<img srcset='  a.png 1x,  b.png   2x '>",
			'<img srcset="a.png 1x,b.png 2x">'
		],
		// A descriptor-less URL keeps the space that ends it before the next.
		["<img srcset='a.png, b.png 2x'>", "<img srcset='a.png, b.png 2x'>"],
		["<img srcset='a.png 1x , b.png'>", '<img srcset="a.png 1x,b.png">'],
		["<img srcset=',,a.png,, 1x'>", '<img srcset="a.png, 1x">'],
		[
			"<link rel=preload imagesrcset='a.png  100w,b.png 200w'>",
			'<link rel=preload imagesrcset="a.png 100w,b.png 200w">'
		],
		// What the parser rejects is left as written: no valid descriptor holds a
		// `(`, and a list of no candidate is no list.
		["<img srcset='a.png 1x (x)'>", "<img srcset='a.png 1x (x)'>"],
		["<img srcset=' , '>", "<img srcset=' , '>"],
		// A comma list loses the whitespace around each comma only.
		[
			"<img sizes=' (max-width: 1px)  1px , 2px ' srcset='a.png 100w'>",
			"<img sizes=\"(max-width: 1px)  1px,2px\" srcset='a.png 100w'>"
		],
		["<input accept=' image/*  , .png '>", "<input accept=image/*,.png>"],
		["<map><area coords=' 1 , 2 '></map>", "<map><area coords=1,2></map>"],
		// The viewport list's grammar skips the whitespace around its separators,
		// whichever reference spells the name.
		[
			"<meta name=viewport content=' width = device-width , initial-scale=1 '>",
			'<meta name=viewport content="width=device-width,initial-scale=1">'
		],
		[
			"<meta name='&#118;iewport' content=' a = 1 ,  b=2 '>",
			'<meta name=viewport content="a=1,b=2">'
		],
		[
			"<meta name=description content=' a = 1 '>",
			"<meta name=description content=' a = 1 '>"
		],
		// An integer is written the one way its rules read it, and a value they do
		// not read as one is left alone.
		[
			"<table><tr><td colspan=' 02' rowspan='+3'>x</table>",
			"<table><tr><td colspan=2 rowspan=+3>x</table>"
		],
		[
			"<input tabindex='-0'><input tabindex='-07'><input maxlength='1e3'>",
			"<input tabindex=0><input tabindex=-7><input maxlength=1e3>"
		],
		[
			"<ol start='-01'><li value=' 3'>a</ol>",
			"<ol start=-1><li value=3>a</ol>"
		],
		// Two tokens are one only when every character matches, whatever packed key
		// the comparison starts from.
		[
			`<p class='ab a${"x".repeat(64)}b abcb axxb abcb'>t`,
			`<p class="ab a${"x".repeat(64)}b abcb axxb">t`
		]
	])("rewrites %s", (source, expected) => {
		expect(minify(source)).toBe(expected);
	});

	it("keeps a list as written where its normalization is switched off", () => {
		const options = { transforms: { normalizeListAttributes: false } };
		expect(minify("<img srcset='  a.png 1x,  b.png   2x '>", options)).toBe(
			"<img srcset='  a.png 1x,  b.png   2x '>"
		);
		expect(
			minify("<meta name=viewport content=' width = device-width '>", options)
		).toBe("<meta name=viewport content=' width = device-width '>");
	});

	it.each([
		// The shortest spelling of a value carrying references, `=` keeping it
		// quoted and the `&` that opens nothing left bare.
		["<p title=a&amp;b=c>t", '<p title="a&b=c">t'],
		// `&#` opens a numeric reference whatever follows it.
		[
			"<p>&amp;#;x</p><a title='&amp;#;x'>t</a>",
			"<p>&amp;#;x</p><a title=&amp;#;x>t</a>"
		],
		// A rewrite holding both quotes and no reference cannot take other quotes, so
		// the source spelling stands.
		["<img srcset=a'\"b.png,,>", "<img srcset=a'\"b.png,,>"],
		[
			"<p class=' a '>x<p class=\" a'b \">y<p class=' a\"b '>z",
			"<p class=a>x<p class=\"a'b\">y<p class='a\"b'>z"
		],
		[
			'<p class=" a\'&quot;b ">w<p a="x\'y&quot;z">t',
			"<p class='a&#39;\"b'>w<p a='x&#39;y\"z'>t"
		]
	])("writes %s in the shortest quoting", (source, expected) => {
		expect(minify(source)).toBe(expected);
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

	it("keeps the delimiter where quoting is frozen, even for a rewritten value", () => {
		const options = { transforms: { normalizeAttributeQuotes: false } };
		expect(
			minify(
				"<p class='  a  b  '>x<p title='a\"b' class=' c '>y<p class=\" d'e \">z",
				options
			)
		).toBe("<p class='a b'>x<p title='a\"b' class='c'>y<p class=\"d'e\">z");
		// Re-escaped, the rewrite costs more than the source spelled: a `&#34;` is
		// one byte shorter than the `&quot;` this writes, but the value changed.
		expect(minify('<p class="&#34;&#34;&#34;&#34;\' x ">t', options)).toBe(
			'<p class="&quot;&quot;&quot;&quot;\' x">t'
		);
	});

	it("drops an empty attribute only on an element that defines it", () => {
		expect(
			minify(
				"<x-foo rel='' id=''></x-foo><a rel='' href=x>t</a><link rel><output for=''></output>",
				{ removeEmptyAttributes: true }
			)
		).toBe("<x-foo rel></x-foo><a href=x>t</a><link><output></output>");
		// A style the renderer reads as nothing is empty too, however it is spelled.
		expect(
			minify("<p style='&#x20;'>x<p style='a:b&#59;'>y", {
				removeEmptyAttributes: true,
				renderEmbeddedSource: R
			})
		).toBe("<p>x<p style=a:b>y");
	});

	it("sorts what prints, a dropped attribute ranking with no name", () => {
		expect(
			minify("<input type=text a=1 b=2><input b=3 type=text>", {
				sortAttributes: true,
				removeRedundantAttributes: "all"
			})
		).toBe("<input b=2 a=1><input b=3>");
		// A DTD default is no attribute the tag wrote, so it does not count.
		expect(
			new SourceProcessor().process(
				'<!DOCTYPE d [<!ATTLIST d a CDATA "v">]><d c="2" b="1"/><e c="3"/>',
				{ xml: true, mode: "minify", sortAttributes: true }
			).code
		).toBe('<!DOCTYPE d [<!ATTLIST d a CDATA "v">]><d c="2" b="1"/><e c="3"/>');
	});

	it("leaves a body as written where the answer is no text", () => {
		expect(
			minify("<style>a { color : red }</style><p style='a : b'>x", {
				embeddedAnswers: () => undefined
			})
		).toBe("<style>a { color : red }</style><p style='a : b'>x");
		expect(
			minify("<p style='a : b'>x<svg/>", {
				renderEmbeddedSource: () => undefined
			})
		).toBe("<p style='a : b'>x<svg/>");
		expect(minify("<p style='a : b'>x", { renderEmbeddedSource: R })).toBe(
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
				"<p><style>a{color:red}</style> <style>b{color:red}</style>x<style>c{color:red}</style>y<style>d{color:red}</style>",
				{ mergeStyles: true, renderEmbeddedSource: R }
			)
		).toBe(
			"<p><style>a,b{color:red}</style> x<style>c{color:red}</style>y<style>d{color:red}</style>"
		);
		expect(
			minify(
				"<p><style media=print>a{color:red}</style><style media=print>b{color:red}</style><style media=screen>c{color:red}</style><style title=x>d{color:red}</style>",
				{ mergeStyles: true, renderEmbeddedSource: R }
			)
		).toBe(
			"<p><style media=print>a,b{color:red}</style><style media=screen>c{color:red}</style><style title=x>d{color:red}</style>"
		);
		// Composed rather than streamed, a template's content folds the same way.
		expect(
			minify(
				"<template><style>a{color:red}</style><style>b{color:red}</style></template>",
				{ mergeStyles: true, renderEmbeddedSource: R }
			)
		).toBe("<template><style>a,b{color:red}</style></template>");
	});

	it("folds a script into the one before only across whitespace and dropped comments", () => {
		const options = { mergeScripts: true };
		expect(
			minify(
				"<p><script>a()</script>x<script>b()</script><script>c()</script><!--x--><script>d()</script>",
				options
			)
		).toBe("<p><script>a()</script>x<script>b()\n;c()\n;d()</script>");
		expect(
			minify("<p><script>a()</script><!--x--><script>b()</script>", {
				...options,
				transforms: { comments: true }
			})
		).toBe("<p><script>a()</script><!--x--><script>b()</script>");
		expect(
			minify(
				"<template><script>a()</script><script>b()</script></template>",
				options
			)
		).toBe("<template><script>a()\n;b()</script></template>");
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
			tree("<p>a &amp; b &lt; c &gt; d&nbsp;e&#10;f&#13;g")
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
			"<math><mi><template shadowrootmode=open></template></mi></math>",
			{}
		],
		[
			"shadow roots on hosts",
			"<span><template shadowrootmode=open>a</template></span><my-el><template shadowrootmode=closed>b</template></my-el><font-face><template shadowrootmode=open>c</template></font-face>",
			{}
		],
		[
			"a shadow root the adoption agency leaves on its host",
			"<b><div><template shadowrootmode=open>s</template>x</b>y",
			{}
		],
		// Quirks mode reads `<p><table>` its own way.
		[
			"a 4.01 frameset doctype",
			'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN"><p><table>',
			{}
		],
		[
			"a 4.01 transitional doctype",
			'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><p><table>',
			{}
		],
		[
			"a frameset after a comment behind body",
			"</body><!--x--><frameset>",
			{ transforms: { comments: true } }
		],
		["a dd under a foreignObject", "<svg><foreignObject><dd>x", {}],
		[
			"an end tag form in template content",
			"<template><div></form>x</div></template>",
			{}
		],
		[
			"an end tag an svg title stops",
			"<svg><title><span></foo>x</span></title></svg>",
			{}
		],
		[
			"identical formatting elements with valueless attributes",
			"<b x><b x><b x><b x>a</b></b></b></b><i y=a><i y=ab><i y=a>b",
			{}
		],
		[
			"identical ones with referenced values",
			"<b id=&amp;><b id=&amp;><b id=&amp;><b id=&amp;>c",
			{}
		],
		["formatting behind two markers", "<a><applet><object><a>x", {}],
		[
			"a nested form under foreign content",
			"<form><svg><foreignObject></form><form>x",
			{}
		],
		["an input the table fosters", "<table><input name=x type=text>", {}],
		[
			"a noscript a reader without scripts leaves the head at",
			"<head><noscript><p>x</p></noscript></head> <body>y",
			{ removeImpliedTags: "all" }
		],
		[
			"whitespace a foreignObject keeps",
			"<svg><foreignObject><p>x</p> </foreignObject></svg>",
			{}
		],
		[
			"empty elements inside a pre",
			"<pre><span></span>x<s></s></pre>",
			{ removeEmptyElements: true }
		],
		[
			"a kept comment behind a template's tbody",
			"<template><table><tbody><tr><td>x</td></tr></tbody><!--keep--></table></template>",
			{ transforms: { comments: true } }
		],
		[
			"a tbody before a tfoot in template content",
			"<template><table><tbody><tr><td>x</td></tr></tbody><tfoot></tfoot></table></template>",
			{}
		],
		[
			"an implied tbody kept in template content",
			"<template><table><tr><td>x</table></template>",
			{ transforms: { removeOptionalTags: false } }
		],
		[
			"a rebuilt formatting element in template content",
			"<template><b>1<p>2</b>3</p></template>",
			{}
		],
		[
			"an svg stylesheet",
			"<svg><style>a { color : red }</style></svg>",
			{ renderEmbeddedSource: R }
		],
		[
			"a fragment's styles, attributes and booleans read back",
			"<style>a{color:red}</style><style>b{color:red}</style><style type=text/css>c{color:red}</style><input disabled=disabled><input type=text>",
			{
				fragmentContext: "div",
				mergeStyles: true,
				removeRedundantAttributes: "all",
				renderEmbeddedSource: R
			}
		],
		[
			"a `select` fragment's merged styles, read back",
			"<style>a{color:red}</style><style>b{color:red}</style><style type=text/css>c{color:red}</style><option selected=selected>",
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
		for (const source of ["<!DOCTYPE ht\0ml><p>", "<?pi a\0b?><p>"]) {
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
		for (const source of ["a</style>\0b", "a</style>b", "</x>\0a"]) {
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
				"<p>a</p>\n<pre>\nx</pre><p> é&amp;</p>b<textarea>\n\n</textarea>",
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
		const log = walk(`${"<p></p>".repeat(50000)}<frameset>`);
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
			`<!DOCTYPE html><html><body><form>${"<p>x</p>".repeat(
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
		processor.process(`${"<p>x</p>".repeat(BIG)}<b>y</b><i>z</i>`);
		expect(log.slice(-2)).toEqual(["p", "b"]);
		log.length = 0;
		processor.process("<b>y</b>");
		expect(log).toEqual(["html", "head", "body", "b"]);
	});

	it("walks an XML document once at its end", () => {
		/** @type {string[]} */
		const names = [];
		new SourceProcessor()
			.use({ [NodeType.Element]: (path) => names.push(path.name()) })
			.process("<a><b/></a>", { xml: true });
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
			"<rt><table><input disabled=disabled><svg><p class=x><col> </ol>x</caption>"
		],
		[
			"a holder whose end tag the source wrote after the run",
			"<div><nobr><table><b><colgroup><nobr></table></nobr></div>y"
		],
		[
			"a holder that prints composed",
			"<listing><table><object><object><tbody><input disabled=disabled><!--c--><table><b id=1><h1><svg>"
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
			"<svg><style>a { b : c }</style></svg><style>d { e : f }</style>",
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
