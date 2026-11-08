"use strict";

const { fixture } = require("../../helpers/fixture");

const webpack = require("../../../");

const { xmlMinify } = webpack.html;

const SOURCE = fixture(
	"xml",
	"xml-minify-should-minify-the-document-and-the-stylesheets-it-holds"
);

describe("xmlMinify", () => {
	it("should minify the document and the stylesheets it holds", async () => {
		const { code } = await xmlMinify({ "image.svg": SOURCE });
		expect(code).toMatchSnapshot();
	});

	it("should report what the CSS minifier throws and keep the stylesheets", async () => {
		// `unusedSymbols` that is no list stands in for anything that makes it throw.
		const unreadable = /** @type {string[]} */ (/** @type {unknown} */ (42));
		const { code, errors } = await xmlMinify(
			{ "image.svg": SOURCE },
			undefined,
			{ css: { unusedSymbols: unreadable } }
		);
		expect(code).toContain(".dot { fill: #ff0000; user-select: none; }");
		expect(code).toContain('style="stroke: #00ff00"');
		expect(errors).toHaveLength(2);
	});

	it("should hand the stylesheets the target's browsers", async () => {
		const { code } = await xmlMinify({ "image.svg": SOURCE }, undefined, {
			environment: { browsers: ["chrome 50"], vendorPrefixes: true }
		});
		expect(code).toMatchSnapshot();
	});

	it("should hand the stylesheets the CSS minifier's options", async () => {
		const { code } = await xmlMinify(
			{
				"image.svg": fixture(
					"xml",
					"xml-minify-should-hand-the-stylesheets-the-css-minifier-s-options"
				)
			},
			undefined,
			{ css: { convertLengthUnits: true } }
		);
		expect(code).toMatchSnapshot();
	});

	it("should read a Buffer as UTF-8", async () => {
		const { code } = await xmlMinify({
			"data.xml": Buffer.from(
				fixture("xml", "xml-minify-should-read-a-buffer-as-utf-8")
			)
		});
		expect(code).toBe('<a title="café">x</a>');
	});

	it("should compact attribute spacing and optionally sort attributes", async () => {
		const input = {
			"image.svg": fixture(
				"xml",
				"xml-minify-should-compact-attribute-spacing-and-optionally-sort-attributes"
			)
		};
		for (const sortAttributes of [undefined, false, true]) {
			const { code } = await xmlMinify(input, undefined, { sortAttributes });
			expect(code).toBe(
				sortAttributes
					? '<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"><path a="2" style="fill:red" z="1"/></svg>'
					: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path z="1" style="fill:red" a="2"/></svg>'
			);
		}
	});

	it("should describe itself to the minimizer plugin", () => {
		expect(xmlMinify.supportsWorkerThreads()).toBe(true);
		expect(xmlMinify.getTypes()).toEqual(["xml"]);
		expect(xmlMinify.filter("image.svg")).toBe(true);
		expect(xmlMinify.filter("feed.XML?v=1")).toBe(true);
		expect(xmlMinify.filter("image.svg#abc123")).toBe(true);
		expect(xmlMinify.filter("image.svg.map")).toBe(false);
		expect(xmlMinify.filter("image.svg.gz")).toBe(false);
		expect(xmlMinify.filter("page.html")).toBe(false);
	});
});

describe("SVG data URLs", () => {
	const { builtinEmbeddedRenderer, htmlMinify } = webpack.html;
	const { cssMinify } = webpack.css;
	const SVG =
		fixture("xml", "svg-data-urls-should-minify-one-with-the-xml-minifier-quoting-with-on-a-tie");
	const MINIFIED =
		"<svg xmlns='http://www.w3.org/2000/svg'>  <rect width='1'/>  </svg>";
	const OFFER = { type: "svg", hostType: "css" };

	it("should minify one with the XML minifier, quoting with `'` on a tie", () => {
		const render = builtinEmbeddedRenderer({ svg: true });
		expect(render(SVG, OFFER)).toBe(MINIFIED);
		// A value holding `'` still takes the quote that costs nothing.
		expect(render(fixture("xml", "svg-data-urls-should-minify-one-with-the-xml-minifier-quoting-with-on-a-tie-2"), OFFER)).toBe(`<svg a="'" b='x'/>`);
	});

	it("should minify the ones an inline stylesheet holds, and only those", () => {
		const render = builtinEmbeddedRenderer({ svg: true });
		expect(
			render(
				`a{background:url("data:image/svg+xml,${SVG}")}b{background:url("data:text/css,a { color : red }")}`,
				{ type: "css", hostType: "html" }
			)
		).toBe(
			`a{background:url("data:image/svg+xml,${MINIFIED}")}b{background:url("data:text/css,a { color : red }")}`
		);
	});

	it("should decline what it is not asked for, or cannot shorten", () => {
		const render = builtinEmbeddedRenderer({ svg: true });
		// An inline `<svg>` is the HTML printer's.
		expect(render(SVG, { ...OFFER, as: "foreign-element" })).toBeUndefined();
		expect(render(fixture("xml", "svg-data-urls-should-decline-what-it-is-not-asked-for-or-cannot-shorten"), OFFER)).toBeUndefined();
		expect(builtinEmbeddedRenderer()(SVG, OFFER)).toBeUndefined();
	});

	it("should decline one offered while an HTML parse is running", () => {
		const render = builtinEmbeddedRenderer({ svg: true });
		/** @type {(string | undefined)[]} */
		const answers = [];
		new webpack.html.syntax.SourceProcessor().process(fixture("xml", "svg-data-urls-should-decline-one-offered-while-an-html-parse-is-running"), {
			mode: "minify",
			renderEmbeddedSource: () => {
				answers.push(render(SVG, OFFER));
				return undefined;
			}
		});
		expect(answers).toEqual([undefined]);
	});

	it("should minify the ones a stylesheet holds, after the caller's renderer", async () => {
		const css = `a{background:url("data:image/svg+xml,${SVG}")}b{background:url("data:text/css,a { color : red }")}`;
		const { code } = await cssMinify({ "a.css": css }, undefined, {
			svg: true
		});
		expect(code).toBe(
			`a{background:url("data:image/svg+xml,${MINIFIED}")}b{background:url("data:text/css,a { color : red }")}`
		);
		const answered = await cssMinify({ "a.css": css }, undefined, {
			svg: true,
			renderEmbeddedSource: (source, info) =>
				info.type === "css" ? "a{color:red}" : undefined
		});
		expect(answered.code).toBe(
			`a{background:url("data:image/svg+xml,${MINIFIED}")}b{background:url(data:text/css,a{color:red})}`
		);
		const own = await cssMinify({ "a.css": css }, undefined, {
			svg: true,
			renderEmbeddedSource: () => "<svg/>"
		});
		expect(own.code).toContain("url(data:image/svg+xml,<svg/>)");
	});

	it("should minify the ones a page holds only when asked", async () => {
		const html = `<img src="data:image/svg+xml,${SVG}">`;
		expect(
			(await htmlMinify({ "a.html": html }, undefined, { svg: true })).code
		).toBe(`<img src="data:image/svg+xml,${MINIFIED}">`);
		expect((await htmlMinify({ "a.html": html })).code).toBe(html);
	});
});

// Each fixture's print under its option sets is in `invariants.unittest.js`'s
// snapshot; these hold the printer with a renderer or helper in the way.
describe("SourceProcessor — XML printing", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	it("should hand SVG and XHTML stylesheets to the embedded renderer", () => {
		const {
			builtinEmbeddedRenderer
		} = require("../../../lib/html/builtinEmbeddedRenderer");
		const document = fixture("xml", "source-processor-xml-printing-should-hand-svg-and-xhtml-stylesheets-to-the");
		expect(
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(document, {
					xml: true,
					mode: "minify",
					renderEmbeddedSource: builtinEmbeddedRenderer()
				})
			).code
		).toMatchSnapshot();
	});

	it("should read a stylesheet across the comments it drops", () => {
		const {
			builtinEmbeddedRenderer
		} = require("../../../lib/html/builtinEmbeddedRenderer");
		const document = fixture(
			"xml",
			"source-processor-xml-printing-reads-a-style-sheet-across-the-comments-it-drops"
		);
		expect(
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(document, {
					xml: true,
					mode: "minify",
					renderEmbeddedSource: builtinEmbeddedRenderer()
				})
			).code
		).toBe(
			[
				'<svg xmlns="http://www.w3.org/2000/svg">',
				"<style>a{b:c}d{e:f}g>h{i:j}</style>",
				'<style>a { b : c }<!--#include virtual="x" -->d { e : f }</style>',
				"<style>a { b : c }<g/>d { e : f }</style>",
				"<style>  </style>",
				'<style type="text/less">a { b : c }d { e : f }</style>',
				"</svg>"
			].join("\n")
		);
	});

	it("should self-close a stylesheet the renderer minifies away", () => {
		const {
			builtinEmbeddedRenderer
		} = require("../../../lib/html/builtinEmbeddedRenderer");
		/**
		 * @param {string} document an XML document
		 * @returns {string} the minified document
		 */
		const minify = (document) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(document, {
					xml: true,
					mode: "minify",
					renderEmbeddedSource: builtinEmbeddedRenderer()
				})
			).code;
		const svg = '<svg xmlns="http://www.w3.org/2000/svg">';
		const name =
			"source-processor-xml-printing-should-self-close-a-stylesheet-the-renderer";
		// An empty rule, and a prelude the input ran out in before its block.
		for (const suffix of ["", "-2"]) {
			const minified = minify(fixture("xml", `${name}${suffix}`));
			expect(minified).toBe(`${svg}<style/></svg>`);
			expect(minify(minified)).toBe(minified);
		}
		expect(minify(fixture("xml", `${name}-3`))).toBe(
			`${svg}<style>a{b:c}</style></svg>`
		);
	});

	it("should write only what the target browsers read", () => {
		const {
			builtinEmbeddedRenderer
		} = require("../../../lib/html/builtinEmbeddedRenderer");
		const document =
			fixture("xml", "source-processor-xml-printing-should-write-only-what-the-target-browsers-read");
		/**
		 * @param {string[]=} browsers the browserslist selection
		 * @returns {string} the minified document
		 */
		const minify = (browsers) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(document, {
					xml: true,
					mode: "minify",
					renderEmbeddedSource: builtinEmbeddedRenderer(
						browsers === undefined ? undefined : { environment: { browsers } }
					)
				})
			).code;
		expect(minify()).toMatchSnapshot("every ability");
		expect(minify(["chrome 60", "safari 10", "ie 11"])).toMatchSnapshot(
			"legacy browsers"
		);
	});

	it("should defer an XML stylesheet to an asynchronous renderer", async () => {
		/** @type {string[]} */
		const offered = [];
		const { code } = await new SourceProcessor().processAsync(
			fixture("xml", "source-processor-xml-printing-should-defer-an-xml-stylesheet-to-an-asynchronous"),
			{
				xml: true,
				mode: "minify",
				renderEmbeddedSource: (
					/** @type {string} */ source,
					/** @type {{ as?: string }} */ hole
				) => {
					offered.push(source);
					return Promise.resolve(hole.as ? 'fill:"a<b"' : "a<b{}");
				}
			}
		);
		expect(offered).toEqual(["a { b : c }", "fill: red"]);
		expect(code).toMatchSnapshot();
	});

	it("should write a rendered stylesheet in the shortest character data", () => {
		const { _xmlCharacterData } = require("../../../lib/html/syntax-parser");
		expect(_xmlCharacterData("a>b{}")).toBe("a>b{}");
		expect(_xmlCharacterData("a]]>b\r")).toBe("a]]&gt;b&#13;");
		expect(_xmlCharacterData("a<b&c")).toBe("<![CDATA[a<b&c]]>");
		expect(_xmlCharacterData("a<b]]>")).toBe("a&lt;b]]&gt;");
	});

	it("should leave a stylesheet as written when nothing renders it", () => {
		const document =
			fixture("xml", "source-processor-xml-printing-should-leave-a-stylesheet-as-written-when-nothing");
		expect(
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(document, {
					xml: true,
					mode: "minify",
					renderEmbeddedSource: () => undefined
				})
			).code
		).toBe(document);
	});

	it("should resolve a prefixed stylesheet's namespace through its own prefix", () => {
		const {
			builtinEmbeddedRenderer
		} = require("../../../lib/html/builtinEmbeddedRenderer");
		expect(
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(
					fixture("xml", "source-processor-xml-printing-should-resolve-a-prefixed-stylesheet-s-namespace"),
					{
						xml: true,
						mode: "minify",
						renderEmbeddedSource: builtinEmbeddedRenderer()
					}
				)
			).code
		).toBe(
			'<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:style>a{b:c}</s:style><style>d { e : f }</style></s:svg>'
		);
	});

	it("should keep a stylesheet an asynchronous renderer declines", async () => {
		const document =
			fixture("xml", "source-processor-xml-printing-should-leave-a-stylesheet-as-written-when-nothing");
		const { code } = await new SourceProcessor().processAsync(document, {
			xml: true,
			mode: "minify",
			renderEmbeddedSource: () => Promise.resolve(undefined)
		});
		expect(code).toBe(document);
	});

	it("should tell XML text well-formed as written from text a strict parser refuses", () => {
		const { isXmlWellFormedText } = require("../../../lib/html/syntax-parser");
		expect(isXmlWellFormedText("a &amp; b &#38; &#x26; &undeclared;")).toBe(
			true
		);
		expect(isXmlWellFormedText("a > b")).toBe(true);
		expect(isXmlWellFormedText("a & b")).toBe(false);
		expect(isXmlWellFormedText("&amp")).toBe(false);
		expect(isXmlWellFormedText("&1a;")).toBe(false);
		expect(isXmlWellFormedText("a < b")).toBe(false);
	});

	it("should close a blank stylesheet the input ran out in", () => {
		const {
			builtinEmbeddedRenderer
		} = require("../../../lib/html/builtinEmbeddedRenderer");
		/**
		 * @param {string} document an SVG
		 * @returns {string} the minified document
		 */
		const minify = (document) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(document, {
					xml: true,
					mode: "minify",
					renderEmbeddedSource: builtinEmbeddedRenderer()
				})
			).code;
		expect(
			minify(fixture("xml", "source-processor-xml-printing-should-close-a-blank-stylesheet-the-input-ran-out"))
		).toBe('<svg xmlns="http://www.w3.org/2000/svg"><style>\n\n</style></svg>');
		expect(
			minify(
				fixture("xml", "source-processor-xml-printing-should-close-a-blank-stylesheet-the-input-ran-out-2")
			)
		).toBe(
			'<svg xmlns="http://www.w3.org/2000/svg"><style><![CDATA[ ]]></style></svg>'
		);
	});
});
