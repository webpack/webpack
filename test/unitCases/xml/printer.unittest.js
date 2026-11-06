"use strict";

const { fixture } = require("../../helpers/fixture");

const webpack = require("../../../");

const { xmlMinify } = webpack.html;

const SOURCE = `<?xml version="1.0" encoding="UTF-8"?>
<!-- an editor's note -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
	<style>
		.dot { fill: #ff0000; user-select: none; }
	</style>
	<circle class="dot" cx="5" cy="5" r="4" style="stroke: #00ff00" />
</svg>
`;

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
				"image.svg":
					'<svg xmlns="http://www.w3.org/2000/svg"><style>a{width:96px}</style></svg>'
			},
			undefined,
			{ css: { convertLengthUnits: true } }
		);
		expect(code).toMatchSnapshot();
	});

	it("should read a Buffer as UTF-8", async () => {
		const { code } = await xmlMinify({
			"data.xml": Buffer.from("<a  title='café' >x</a >")
		});
		expect(code).toBe('<a title="café">x</a>');
	});

	it("should compact attribute spacing and optionally sort attributes", async () => {
		const input = {
			"image.svg":
				'<svg  xmlns = "http://www.w3.org/2000/svg" viewBox = "0 0 1 1"><path z = "1" style = "fill: #ff0000" a = "2" /></svg>'
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

describe("SourceProcessor — XML printing", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");

	/**
	 * @param {string} source XML source
	 * @param {"minify" | "beautify"} mode print mode
	 * @returns {string} printed XML
	 */
	const printXml = (source, mode) =>
		/** @type {{ code: string }} */ (
			new SourceProcessor().process(source, { xml: true, mode })
		).code;
	const source = fixture("xml", "source-processor-xml-printing-should-write-xml-back-as-written-when-beautifying");

	it("should report no error an entity's replacement text holds", () => {
		/** @type {string[]} */
		const reported = [];
		const options = {
			xml: true,
			mode: /** @type {const} */ ("minify"),
			parseError: (/** @type {string} */ _input, /** @type {string} */ c) => {
				reported.push(c);
			}
		};
		const { code } = new SourceProcessor().process(
			fixture("xml", "xml-syntax-parsing-should-leave-out-errors-in-an-entity-s-replacement-text"),
			options
		);
		expect(code).toMatchInlineSnapshot(
			`"<!DOCTYPE root [<!ENTITY value \\"<child\\">]><root>&value;</root>"`
		);
		expect(reported).toEqual([]);
	});

	it("should write XML back as written when beautifying", () => {
		expect(printXml(source, "beautify")).toMatchSnapshot();
	});

	it("should write the shortest well-formed XML when minifying", () => {
		const minified = printXml(source, "minify");
		expect(minified).toMatchSnapshot();
	});

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
		// An empty rule, and a prelude the input ran out in before its block.
		for (const body of ["<style>a{}</style>", "<style>.cut"]) {
			const minified = minify(`${svg}${body}</svg>`);
			expect(minified).toBe(`${svg}<style/></svg>`);
			expect(minify(minified)).toBe(minified);
		}
		expect(minify(`${svg}<style>a { b : c }</style></svg>`)).toBe(
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

describe("SourceProcessor — XML under an internal DTD subset", () => {
	const { SourceProcessor } = require("../../../lib/html/syntax");
	const { parseHtml } = require("../../../lib/html/syntax-parser");
	const serializeHtmlTree = require("../../helpers/serializeHtmlTree");

	/**
	 * @param {string} source XML source
	 * @param {"minify" | "beautify"} mode print mode
	 * @returns {string} printed XML
	 */
	const printXml = (source, mode) =>
		/** @type {{ code: string }} */ (
			new SourceProcessor().process(source, { xml: true, mode })
		).code;

	/**
	 * @param {string} source XML source
	 * @returns {string} its tree, comments left out as minifying leaves them
	 */
	const tree = (source) =>
		serializeHtmlTree(parseHtml(source, 0, { xml: true }))
			.replace(/^\| *<!--[\s\S]*?-->$\n?/gm, "")
			.trimEnd();

	const chain = Array.from(
		{ length: 18 },
		(_, i) => `<!ENTITY e${i} "&e${i + 1};">`
	).join("");

	it.each([
		// An entity whose replacement is markup builds elements, which no reference
		// is rebuilt from, so the document prints as written.
		[
			"markup an entity expands to",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-markup-an-entity")
		],
		[
			"markup with every kind of node",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-markup-with-every-kind")
		],
		[
			"a start tag an entity leaves open",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-start-tag-an-entity")
		],
		[
			"markup a reference cycle reaches",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-markup-a-reference")
		],
		[
			"markup past the depth searched",
			`<!DOCTYPE d [${chain}<!ENTITY e18 "<x/>">]><d>&e0;</d>`
		],
		[
			"text a chain expands to",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-text-a-chain-expands-to")
		],
		// §5.1: nothing after an unread parameter entity is processed.
		[
			"declarations past a parameter entity",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-declarations-past-a")
		],
		[
			"a subset an entity runs out in",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-subset-an-entity-runs")
		],
		["one a comment runs out in", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-one-a-comment-runs-out")],
		["one an instruction runs out in", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-one-an-instruction-runs")],
		[
			"one a declaration's literal runs out in",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-one-a-declaration-s")
		],
		// §3.3: a tokenized value is trimmed and collapsed, a default fills in, and
		// the first declaration of an attribute binds it.
		[
			"attribute-list declarations",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-attribute-list")
		],
		[
			"declarations for two elements",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-declarations-for-two")
		],
		[
			"a value already collapsed",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-value-already")
		],
		[
			"an attribute name that is no name",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-an-attribute-name-that")
		],
		["a quote where a name goes", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-quote-where-a-name")],
		[
			"an enumeration the subset ends in",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-an-enumeration-the")
		],
		[
			"a default the subset ends in",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-default-the-subset")
		],
		["a doctype the input ends in", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-doctype-the-input")],
		// §2.8: only the first DOCTYPE declares anything, and §4.2 the first
		// declaration of an entity binds it.
		[
			"a second doctype",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-second-doctype-back")
		],
		[
			"an entity declared twice",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-an-entity-declared")
		],
		["a public doctype", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-public-doctype-back")],
		["a system doctype", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-system-doctype-back")],
		["a doctype with no name", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-doctype-with-no-name")],
		// Line ends fold to LF, and a NUL reads as U+FFFD.
		[
			"carriage returns",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-carriage-returns-back")
		],
		[
			"NULs and a repeated attribute",
			fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-nuls-and-a-repeated")
		],
		// A misnested end tag closes what it names; one naming nothing is dropped,
		// and so is a tag the input ends inside.
		["misnested end tags", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-misnested-end-tags-back")],
		["a tag the input ends in", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-tag-the-input-ends-in")],
		["a value the input ends in", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-a-value-the-input-ends")],
		["attributes without a value or quotes", fixture("xml", "source-processor-xml-under-an-internal-dtd-subset-prints-attributes-without-a")]
	])("prints %s back to its tree", (_name, source) => {
		const minified = printXml(source, "minify");
		expect(minified).toMatchSnapshot();
		expect(tree(minified)).toBe(tree(source));
		expect(tree(printXml(source, "beautify"))).toBe(tree(source));
	});

});
