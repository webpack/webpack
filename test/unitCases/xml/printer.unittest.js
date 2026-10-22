"use strict";

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

	it("should hand the stylesheets the target's browsers", async () => {
		const { code } = await xmlMinify({ "image.svg": SOURCE }, undefined, {
			environment: { browsers: ["chrome 50"], vendorPrefixes: true }
		});
		expect(code).toMatchSnapshot();
	});

	it("should hand the stylesheets the CSS minifier's options", async () => {
		const { code } = await xmlMinify(
			{ "image.svg": '<svg xmlns="http://www.w3.org/2000/svg"><style>a{width:96px}</style></svg>' },
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
		const input = { "image.svg": '<svg  xmlns = "http://www.w3.org/2000/svg" viewBox = "0 0 1 1"><path z = "1" style = "fill: #ff0000" a = "2" /></svg>' };
		for (const sortAttributes of [undefined, false, true]) {
			const { code } = await xmlMinify(input, undefined, { sortAttributes });
			expect(code).toBe(sortAttributes
				? '<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"><path a="2" style="fill:red" z="1"/></svg>'
				: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path z="1" style="fill:red" a="2"/></svg>');
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
	const SVG = "<svg xmlns='http://www.w3.org/2000/svg'  >  <rect   width='1' />  </svg>";
	const MINIFIED = "<svg xmlns='http://www.w3.org/2000/svg'>  <rect width='1'/>  </svg>";
	const OFFER = { type: "svg", hostType: "css" };

	it("should minify one with the XML minifier, quoting with `'` on a tie", () => {
		const render = builtinEmbeddedRenderer({ svg: true });
		expect(render(SVG, OFFER)).toBe(MINIFIED);
		// A value holding `'` still takes the quote that costs nothing.
		expect(render(`<svg  a="'" b='x' />`, OFFER)).toBe(`<svg a="'" b='x'/>`);
	});

	it("should print a tie in `\"` unless asked otherwise", () => {
		/**
		 * @param {("\"" | "'")=} xmlQuote the quote a tie takes
		 * @returns {string} the printed document
		 */
		const print = (xmlQuote) =>
			new webpack.html.syntax.SourceProcessor().process("<a  b='c' />", {
				xml: true,
				mode: "minify",
				xmlQuote
			}).code;
		expect(print(undefined)).toBe('<a b="c"/>');
		expect(print("'")).toBe("<a b='c'/>");
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
		expect(render("<svg/>", OFFER)).toBeUndefined();
		expect(builtinEmbeddedRenderer()(SVG, OFFER)).toBeUndefined();
	});

	it("should decline one offered while an HTML parse is running", () => {
		const render = builtinEmbeddedRenderer({ svg: true });
		/** @type {(string | undefined)[]} */
		const answers = [];
		new webpack.html.syntax.SourceProcessor().process("<svg> </svg>", {
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
	const source = `<?xml version="1.0"?>
<!DOCTYPE svg [ <!ENTITY ns "http://www.w3.org/2000/svg"> <!ATTLIST svg version CDATA "1.1"> ]>
<!-- drawn by hand -->
<svg xmlns="&ns;" viewBox = "0 0 10 10"  data-q='say "hi"' data-both="it's &quot;q&quot;" data-ws="a
b&#10;c">
  <title>A &amp; B &gt; C</title>
  <g><!-- inert --></g>
  <path d="M0 0L10 10" ></path>
  <br></br>
  <text>&ns;</text>
  <style><![CDATA[a > b { fill: red } a < b && c]]></style>
  <script><![CDATA[x]]></script>
  <?render mode="fast"?>
</svg>
`;

	it("should write XML back as written when beautifying", () => {
		expect(printXml(source, "beautify")).toMatchSnapshot();
	});

	it("should write the shortest well-formed XML when minifying", () => {
		const minified = printXml(source, "minify");
		expect(minified).toMatchSnapshot();
		expect(printXml(minified, "minify")).toBe(minified);
	});

	it("should hand SVG and XHTML stylesheets to the embedded renderer", () => {
		const { builtinEmbeddedRenderer } = require("../../../lib/html/builtinEmbeddedRenderer");
		const document = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:h="http://www.w3.org/1999/xhtml">
<style type="text/css"><![CDATA[
	.a  { fill : #FFFFFF ; }
	text > tspan { stroke: red }
	a[href="x&y"] { fill: blue }
]]></style>
<rect style="fill: #ff0000 ;  stroke : none"/>
<h:style>p  { color : red }</h:style>
<foreignObject><h:p style="color : red">x</h:p></foreignObject>
<x:style xmlns:x="urn:not-css">keep  { this }</x:style>
<g xmlns="urn:not-css" style="keep : this"><style>keep { this }</style></g>
<style>a { b : c }<!-- split --></style>
<style type="text/less">@c: red; .b { fill: @c }</style>
<style type=" TEXT/CSS ">b { c : d }</style>
</svg>`;
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

	it("should write only what the target browsers read", () => {
		const { builtinEmbeddedRenderer } = require("../../../lib/html/builtinEmbeddedRenderer");
		const document =
			'<svg xmlns="http://www.w3.org/2000/svg"><style>g > .b { fill: rgba(0,0,255,0.5) } @media (min-width: 0px) { .e { fill: red } } .p { user-select: none }</style><rect style="fill: rgba(255,0,0,0.5)"/></svg>';
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
			'<svg xmlns="http://www.w3.org/2000/svg"><style>a { b : c }</style><rect style="fill: red"/><style> </style></svg>',
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
			'<svg xmlns="http://www.w3.org/2000/svg"><style>a { b : c }</style><rect style="fill : red"/></svg>';
		expect(printXml(document, "minify")).toBe(
			'<svg xmlns="http://www.w3.org/2000/svg"><style>a { b : c }</style><rect style="fill : red"/></svg>'
		);
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
		const { builtinEmbeddedRenderer } = require("../../../lib/html/builtinEmbeddedRenderer");
		expect(
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(
					'<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:style>a { b : c }</s:style><style>d { e : f }</style></s:svg>',
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
			'<svg xmlns="http://www.w3.org/2000/svg"><style>a { b : c }</style><rect style="fill : red"/></svg>';
		const { code } = await new SourceProcessor().processAsync(document, {
			xml: true,
			mode: "minify",
			renderEmbeddedSource: () => Promise.resolve(undefined)
		});
		expect(code).toBe(document);
	});

	it("should close what the input ran out in", () => {
		expect(printXml("<r><!-- open", "beautify")).toBe("<r><!-- open--></r>");
		expect(printXml("<r><![CDATA[a<b", "beautify")).toBe("<r>a&lt;b</r>");
		expect(printXml("<r><![CDATA[]]>]]&gt;&#13;", "minify")).toBe(
			"<r>]]&gt;&#13;</r>"
		);
	});

	it("should escape an `&` that opens no reference when minifying", () => {
		expect(printXml("<r>&amp", "minify")).toBe("<r>&amp;amp</r>");
		expect(printXml("<r>a & b</r>", "minify")).toBe("<r>a &amp; b</r>");
		expect(printXml('<r a="&amp x" b="&#38"/>', "minify")).toBe(
			'<r a="&amp;amp x" b="&amp;#38"/>'
		);
		expect(printXml("<r>&undeclared;</r>", "minify")).toBe(
			"<r>&undeclared;</r>"
		);
	});

	it("should close a blank stylesheet the input ran out in", () => {
		const { builtinEmbeddedRenderer } = require("../../../lib/html/builtinEmbeddedRenderer");
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
			minify('<svg xmlns="http://www.w3.org/2000/svg"><style>\n<![CDATA[\n')
		).toBe('<svg xmlns="http://www.w3.org/2000/svg"><style>\n\n</style></svg>');
		expect(
			minify(
				'<svg xmlns="http://www.w3.org/2000/svg"><style><![CDATA[ ]]></style></svg>'
			)
		).toBe(
			'<svg xmlns="http://www.w3.org/2000/svg"><style><![CDATA[ ]]></style></svg>'
		);
	});
});
