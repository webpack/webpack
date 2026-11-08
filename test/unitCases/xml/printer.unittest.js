"use strict";

const { fixture } = require("../../helpers/fixture");

const webpack = require("../../../");

const { xmlMinify } = webpack.html;

describe("xmlMinify", () => {
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

	it("takes the minimizer options as optional", async () => {
		const { code } = await xmlMinify({ "a.svg": "<svg ></svg>" }, undefined);
		expect(code).toBe("<svg/>");
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

// Each fixture's print under its option sets, renderers included, is in
// `invariants.unittest.js`'s snapshot; these hold the helpers the printer uses.
describe("SourceProcessor — XML printing", () => {
	it("should write a rendered stylesheet in the shortest character data", () => {
		const { _xmlCharacterData } = require("../../../lib/html/syntax-parser");
		expect(_xmlCharacterData("a>b{}")).toBe("a>b{}");
		expect(_xmlCharacterData("a]]>b\r")).toBe("a]]&gt;b&#13;");
		expect(_xmlCharacterData("a<b&c")).toBe("<![CDATA[a<b&c]]>");
		expect(_xmlCharacterData("a<b]]>")).toBe("a&lt;b]]&gt;");
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
});
