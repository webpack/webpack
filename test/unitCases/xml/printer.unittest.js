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
		const { code } = await xmlMinify({
				"a.svg": fixture("xml", "xml-minify-takes-the-minimizer-options-as-optional")
			}, undefined);
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
				fixture(
					"xml",
					"svg-data-urls-should-minify-the-ones-an-inline-stylesheet-holds-and-only-those"
				),
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

	it("should minify one offered while an HTML parse is running", () => {
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
		expect(answers).toEqual([MINIFIED]);
	});

	it("should minify the ones a stylesheet holds, after the caller's renderer", async () => {
		const css = fixture(
			"xml",
			"svg-data-urls-should-minify-the-ones-an-inline-stylesheet-holds-and-only-those"
		);
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
		const html = fixture(
			"xml",
			"svg-data-urls-should-minify-the-ones-a-page-holds-only-when-asked"
		);
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

describe("SourceProcessor — SVG minification", () => {
	const { SourceProcessor } = webpack.html.syntax;
	const { builtinEmbeddedRenderer, htmlMinify } = webpack.html;

	const svg = 'http://www.w3.org/2000/svg';

	const structure = { xml: true, mode: /** @type {const} */ ('minify'), cleanupSvgStructure: true, reuseSvgPaths: true, mergeSvgPaths: true, sortSvgDefinitions: true };

	const paint = 'fill="none" stroke="red" stroke-width="1" stroke-dasharray="none" shape-rendering="crispEdges" marker-start="none" marker-mid="none" marker-end="none"';

	const compact = { xml: true, mode: /** @type {const} */ ("minify"), shortenSvgNumbers: true, shortenSvgColors: true, shortenSvgPathData: true, removeEmptyElements: true };

	const { SVG_NUMERIC_ATTRIBUTES, SVG_PRESENTATION_NUMERIC_ATTRIBUTES, SVG_LENGTH_UNITS } = require("../../../lib/html/data");

	const numericExamples = {
		length: ["+001.500px", "1.5px"],
		number: ["+001.500", "1.5"],
		integer: ["+001", "1"],
		integerPair: ["+001, 002", "1 2"],
		percentage: ["+001.500%", "1.5%"],
		lengths: ["+001.500px, 0002.00em 0003.0%", "1.5px 2em 3%"],
		numbers: ["+001.500, 0002.00 0003.0", "1.5 2 3"],
		pair: ["+001.500, 0002.00", "1.5 2"],
		points: ["+001.500, 0002.00 0003.0,+04.000", "1.5 2 3 4"],
		viewBox: [" +000.00, 000.0, 0010.0, +0020.000 ", "0 0 10 20"],
		transform: ["translate(+001.00, -000.00) scale(002.00, +002.00) rotate(030.00 000.00 -000.00)", "translate(1) scale(2) rotate(30)"],
		path: ["M000.00,000.00 L001.00,002.00", "M0 0 1 2"]
	};

	it("should preserve DTD-declared style values instead of violating fixed defaults", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-dtd-declared-style-values");
		for (const options of [{ xml: true, mode: /** @type {const} */ ('minify') }, compact]) expect(new SourceProcessor().process(source, { ...options, renderEmbeddedSource: builtinEmbeddedRenderer() }).code).toBe(source);
	});

	it("should build complete deferred style attributes and omit an empty answer", () => {
		/** @type {import('../../../lib/html/syntax-parser').DeferredEmbeddedSource[]} */
		const holes = [];
		new SourceProcessor().process(fixture("xml", "source-processor-svg-minification-should-build-complete-deferred-style-attributes"), { xml: true, mode: 'minify', removeEmptyAttributes: true, deferEmbeddedSource: holes });
		expect(holes).toHaveLength(1);
		expect(holes[0].source).toBe('/* empty */');
		expect(holes[0].build('')).toBe('');
		expect(holes[0].build('fill:red')).toBe(' style="fill:red"');
		// An answer of only whitespace is the empty attribute the switch drops.
		const decides = /** @type {(rendered: string) => boolean} */ (holes[0].decides);
		expect(decides("")).toBe(true);
		expect(decides(" a ")).toBe(false);
	});

	it("should resolve deferred CSS before removing empty SVG containers", async () => {
		const source = fixture("xml", "source-processor-svg-minification-should-resolve-deferred-css-before-removing");
		const render = builtinEmbeddedRenderer();
		const options = { ...compact, removeEmptyAttributes: true, removeUnusedSvgNamespaces: true, renderEmbeddedSource: render };
		const expected = `<svg xmlns="${svg}"><g id="keep"/><path fill="red" style="stroke:red" d="M0 0" transform="scale(1)"/></svg>`;
		expect(new SourceProcessor().process(source, options).code).toBe(expected);
		expect((await new SourceProcessor().processAsync(source, { ...options, renderEmbeddedSource: async (source, info) => render(source, info) })).code).toBe(expected);
	});

	it("should preserve XML document roots and DTD-declared namespace attributes", () => {
		const root = fixture("xml", "source-processor-svg-minification-should-preserve-xml-document-roots-and-dtd");
		expect(new SourceProcessor().process(root, compact).code).toBe(root);
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-xml-document-roots-and-dtd-2");
		expect(new SourceProcessor().process(source, { ...compact, removeUnusedSvgNamespaces: true }).code).toBe(source);
	});

	it("should preserve empty switch alternatives that suppress visible fallback children", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-empty-switch-alternatives-that");
		expect(new SourceProcessor().process(source, compact).code).toBe(source);
	});

	it("should remove empty containers under a prefixed SVG parent", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-remove-empty-containers-under-a-prefixed");
		expect(new SourceProcessor().process(source, compact).code).toBe(`<s:svg xmlns:s="${svg}"/>`);
	});

	it("should preserve empty children required by a DTD content model", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-empty-children-required-by-a-dtd");
		expect(new SourceProcessor().process(source, compact).code).toBe(source);
	});

	it("should decline missing, failing and malformed color renderer answers", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-decline-missing-failing-and-malformed");
		const processor = new SourceProcessor();
		for (const renderEmbeddedSource of [undefined, () => undefined, () => '', () => 'stroke:red', () => 'fill:red;stroke:blue', () => { throw new Error('declined'); }]) {
			expect(processor.process(source, { ...compact, renderEmbeddedSource }).code).toBe(source);
		}
		expect(processor.process(source, { ...compact, renderEmbeddedSource: builtinEmbeddedRenderer({ transforms: { shortenColors: false } }) }).code).toBe(source);
	});

	it("should preserve DTD color references when they are shorter and honor XML quotes asynchronously", async () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-dtd-color-references-when-they");
		const render = builtinEmbeddedRenderer();
		const options = { ...compact, xmlQuote: /** @type {const} */ ("'"), renderEmbeddedSource: render };
		const once = new SourceProcessor().process(source, options).code;
		expect(once).toContain('fill="&c;"');
		expect(once).toContain("stroke='red'");
		expect((await new SourceProcessor().processAsync(source, { ...options, renderEmbeddedSource: async (source, info) => render(source, info) })).code).toBe(once);
	});

	it("should shorten full transform lists without folding or changing exponent notation", () => {
		const value = ' matrix(+001.00, 000.00, 000.00, 001.00, 010.00, -000.00), translate(+001.00e+02, 002.00) scale(001.00) rotate(090.00, 000, 000) skewX(001.00)skewY(-001.00) ';
		const source = fixture("xml", "source-processor-svg-minification-should-shorten-full-transform-lists-without");
		const once = new SourceProcessor().process(source, compact).code;
		expect(once).toBe(`<svg xmlns="${svg}"><g transform="translate(10) translate(+001.00e+02 2) rotate(90) skewX(1) skewY(-1)"/></svg>`);
		expect(new SourceProcessor().process(once, compact).code).toBe(once);
	});

	it("should preserve packed arc flags, implicit segments and exact path precision", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-packed-arc-flags-implicit");
		const once = new SourceProcessor().process(source, compact).code;
		expect(once).toBe(`<svg xmlns="${svg}"><path d="M0 0 1 2 .5.5A1 2 0 0110 20h9007199254740993"/></svg>`);
		expect(new SourceProcessor().process(once, compact).code).toBe(once);
	});

	it("should preserve SVG styles without interrupting an enclosing CSS data URL", () => {
		const source = `<svg xmlns="${svg}"><metadata>removed</metadata><style>@keyframes morph{to{d:path("M10 20L20 50L40 50")}}</style><path d="M010 020L010 030L040 030"/></svg>`;
		const css = `.icon { background: url("data:image/svg+xml,${encodeURIComponent(source)}"); color: red }`;
		const render = builtinEmbeddedRenderer({ svg: { shortenPathData: true, removeMetadata: true } });
		const info = { type: "css", hostType: "css" };
		const result = render(css, info);
		expect(typeof result).toBe("string");
		const decoded = decodeURIComponent(result || "");
		expect(decoded).toContain("M010 020L010 030L040 030");
		expect(decoded).toContain(String.raw`@keyframes morph{to{d:path(\"M10 20L20 50L40 50\")}}`);
		expect(decoded).toContain("color:red");
		expect(decoded).not.toContain("<metadata>");
		expect(render(result || "", info)).toBe(result);
	});

	it("should keep SVG style end tags inside an HTML stylesheet data URL", () => {
		const source = `<svg xmlns="${svg}"><style>a{fill:red}</style><path d="M010 020L010 030L040 030"/></svg>`;
		const css = `.icon { background: url("data:image/svg+xml,${encodeURIComponent(source)}") }`;
		for (const svg of [false, true, { shortenPathData: true }]) {
			const options = { mode: /** @type {"minify"} */ ("minify"), renderEmbeddedSource: builtinEmbeddedRenderer({ svg }) };
			const once = new SourceProcessor().process(fixture("xml", "source-processor-svg-minification-should-keep-svg-style-end-tags-inside-an-html"), options).code;
			expect(once).toContain(css);
			expect((once.match(/<\/style>/g) || []).length).toBe(1);
			expect(new SourceProcessor().process(once, options).code).toBe(once);
		}
	});

	it("should remove empty SVG containers while preserving referenced, styled and foreign content", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-remove-empty-svg-containers-while");
		const expected = source.replace('<g><g/><!--empty--><defs/></g>', '').replace('<g xmlns:p="urn:unused"/>', '');
		const once = new SourceProcessor().process(source, compact).code;
		expect(once).toBe(expected);
		expect(new SourceProcessor().process(once, compact).code).toBe(once);
		expect(new SourceProcessor().process(source, { ...compact, collapseWhitespace: true }).code).toBe(expected.replace('<g> </g>', ''));
		expect(new SourceProcessor().process(source, { ...compact, removeEmptyElements: false }).code).toBe(source.replace('<!--empty-->', ''));
	});

	it("should sort SVG symbol runs by ID while preserving whitespace, boundaries and references", async () => {
		const source = fixture("xml", "source-processor-svg-minification-should-sort-svg-symbol-runs-by-id-while");
		const expected = fixture("xml", "source-processor-svg-minification-should-sort-svg-symbol-runs-by-id-while-2");
		const processor = new SourceProcessor();
		const options = { xml: true, mode: /** @type {const} */ ("minify"), sortSvgSymbols: true };
		expect(processor.process(source, options).code).toBe(expected);
		expect(processor.process(expected, options).code).toBe(expected);
		expect((await processor.processAsync(source, options)).code).toBe(expected);
		expect(processor.process(source, { ...options, sortSvgSymbols: false }).code).toBe(source.replace('<!-- inert -->', ''));
		expect(processor.process(source, { ...options, mode: "beautify" }).code.indexOf('id="z"')).toBeLessThan(processor.process(source, { ...options, mode: "beautify" }).code.indexOf('id="a"'));
	});

	it("should preserve DTDs, duplicate XML IDs and non-SVG symbol order", () => {
		const processor = new SourceProcessor();
		const options = { xml: true, mode: /** @type {const} */ ("minify"), sortSvgSymbols: true };
		for (const name of ["source-processor-svg-minification-should-preserve-document-types-duplicate-xml-ids-and-non-2", "source-processor-svg-minification-should-preserve-document-types-duplicate-xml-ids-and-non-3", "source-processor-svg-minification-should-preserve-document-types-duplicate-xml-ids-and-non-4", "source-processor-svg-minification-should-preserve-document-types-duplicate-xml-ids-and-non-5", "source-processor-svg-minification-should-preserve-document-types-duplicate-xml-ids-and-non-6", "source-processor-svg-minification-should-preserve-document-types-duplicate-xml-ids-and-non-7", "source-processor-svg-minification-should-preserve-document-types-duplicate-xml-ids-and-non-8"]) {
			const source = fixture("xml", name);
			expect(processor.process(source, options).code).toBe(source);
		}
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-document-types-duplicate-xml-ids-and-non");
		expect(processor.process(source, options).code).toBe(source.replace('<s:symbol xml:id="z" id="b"/><s:symbol xml:id="a"/>', '<s:symbol xml:id="a"/><s:symbol xml:id="z" id="b"/>'));
	});

	it("should preserve primary IDs, kept comment barriers and HTML structure", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-primary-ids-kept-comment");
		const processor = new SourceProcessor();
		expect(processor.process(source, { xml: true, mode: "minify", sortSvgSymbols: true, transforms: { comments: "all" } }).code).toBe(source);
		expect(processor.process(source, { mode: "minify", sortSvgSymbols: true, convertSvgShapes: true, transforms: { comments: "all" } }).code).toBe(processor.process(source, { mode: "minify", transforms: { comments: "all" } }).code);
		const shapes = fixture("xml", "source-processor-svg-minification-should-preserve-primary-ids-kept-comment-2");
		expect(processor.process(shapes, { xml: true, mode: "minify", convertSvgShapes: true }).code).toBe(`<svg xmlns="${svg}"><path d="M10 20V30"/><path d="M20 30V40"/></svg>`);
	});

	it("should sort after XML subtree cleanup and keep the SVG data URL path shared", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-sort-after-xml-subtree-cleanup-and-keep");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), sortSvgSymbols: true, removeSvgMetadata: true, removeEmptyElements: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe(`<svg xmlns="${svg}"><symbol id="a"/><symbol id="z"/></svg>`);
		expect(processor.process(once, options).code).toBe(once);
		const render = builtinEmbeddedRenderer({ svg: { sortSymbols: true, removeMetadata: true, removeEmptyElements: true } });
		const rendered = render(`.x{background:url("data:image/svg+xml,${encodeURIComponent(source)}")}`, { type: "css", hostType: "html" });
		expect(typeof rendered).toBe('string');
		expect(decodeURIComponent(rendered || '').indexOf("id='a'")).toBeLessThan(decodeURIComponent(rendered || '').indexOf("id='z'"));
	});

	it("should preserve constrained shape types and convert shapes through the SVG renderer", () => {
		const source = `<svg xmlns="${svg}"><line x1="10" y1="20" x2="10" y2="30"/></svg>`;
		const processor = new SourceProcessor();
		const options = { xml: true, mode: /** @type {const} */ ("minify"), convertSvgShapes: true, sortAttributes: true };
		for (const name of ["source-processor-svg-minification-should-preserve-constrained-shape-types-and-2", "source-processor-svg-minification-should-preserve-constrained-shape-types-and-3", "source-processor-svg-minification-should-preserve-constrained-shape-types-and-4"]) expect(processor.process(fixture("xml", name), { ...options, sortAttributes: false }).code).toBe(fixture("xml", name));
		const render = builtinEmbeddedRenderer({ svg: { convertShapes: true } });
		expect(render(source, { type: "svg", hostType: "css" })).toBe(`<svg xmlns='${svg}'><path d='M10 20V30'/></svg>`);
		const removed = fixture("xml", "source-processor-svg-minification-should-preserve-constrained-shape-types-and");
		const once = processor.process(removed, { ...options, removeSvgMetadata: true }).code;
		expect(once).toBe(`<svg xmlns="${svg}"><path d="M10 20V30"/></svg>`);
		expect(processor.process(once, options).code).toBe(once);
	});

	it("should merge text exposed by empty containers before scanning namespace references", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-merge-text-exposed-by-empty-containers");
		const options = { ...compact, removeEmptyAttributes: true, collapseWhitespace: true, removeUnusedSvgNamespaces: true };
		const once = new SourceProcessor().process(source, options).code;
		expect(once).toBe(`<svg xmlns="${svg}" xmlns:p="urn:used">p:Thing<g xml:space="preserve"> </g></svg>`);
		expect(new SourceProcessor().process(once, options).code).toBe(once);
	});

	it("should preserve DTD constraints and reset every optimization after unread DTDs", () => {
		const body = fixture("xml", "source-processor-svg-minification-should-preserve-dtd-constraints-and-reset-every-2");
		const dtd = '<!DOCTYPE svg [<!ATTLIST svg fill CDATA #FIXED "#ff0000"><!ATTLIST path d CDATA #IMPLIED transform CDATA #IMPLIED><!ATTLIST g id CDATA "kept">]>';
		const processor = new SourceProcessor();
		const options = { ...compact, renderEmbeddedSource: builtinEmbeddedRenderer() };
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-preserve-dtd-constraints-and-reset-every"), options).code).toBe(dtd + body);
		for (const name of ["source-processor-svg-minification-should-preserve-dtd-constraints-and-reset-every-3", "source-processor-svg-minification-should-preserve-dtd-constraints-and-reset-every-4"]) expect(processor.process(fixture("xml", name), options).code).toBe(fixture("xml", name));
		expect(processor.process(body, options).code).toBe(`<svg xmlns="${svg}" fill="red"><path d="M0 0 1 2" transform="scale(1)"/></svg>`);
	});

	it("should leave foreign XML, HTML and beautified attributes unchanged", () => {
		const body = '<path fill="#ff0000" d="M000 000" transform="scale(001)"/>';
		const source = fixture("xml", "source-processor-svg-minification-should-leave-foreign-xml-html-and-beautified");
		const options = { ...compact, renderEmbeddedSource: builtinEmbeddedRenderer() };
		expect(new SourceProcessor().process(source, options).code).toBe(source);
		const svgSource = fixture("xml", "source-processor-svg-minification-should-leave-foreign-xml-html-and-beautified-2");
		expect(new SourceProcessor().process(svgSource, { ...options, mode: 'beautify' }).code).toBe(svgSource);
		// Inline in HTML the same switches reach SVG's own geometry.
		expect(new SourceProcessor().process(svgSource, { ...options, xml: false }).code).toContain('d="M0 0"');
	});

	it("should retain text-list positions, units and precision with DTD constraints", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-retain-text-list-positions-units-and");
		const expected = fixture("xml", "source-processor-svg-minification-should-retain-text-list-positions-units-and-2");
		const processor = new SourceProcessor();
		expect(processor.process(source, compact).code).toBe(expected);
		expect(processor.process(expected, compact).code).toBe(expected);
		const constrained = fixture("xml", "source-processor-svg-minification-should-retain-text-list-positions-units-and-3");
		expect(processor.process(constrained, compact).code).toContain('x="+001.500px, 0002.00em 0003.0%"');
		expect(processor.process(constrained, compact).code).toContain('stdDeviation="+002.00"');
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-retain-text-list-positions-units-and-4"), compact).code).toBe('<!DOCTYPE svg SYSTEM "svg.dtd">' + source);
		const html = processor.process(source, { ...compact, xml: false }).code;
		expect(html).toContain('x="1.5px 2em 3%"');
		expect(html).toContain('stdDeviation=2');
		for (const name of ["source-processor-svg-minification-should-retain-text-list-positions-units-and-5", "source-processor-svg-minification-should-retain-text-list-positions-units-and-6", "source-processor-svg-minification-should-retain-text-list-positions-units-and-7", "source-processor-svg-minification-should-retain-text-list-positions-units-and-8"]) {
			const invalid = fixture("xml", name);
			expect(processor.process(invalid, compact).code).toBe(invalid);
		}
	});

	it("should preserve DTD-declared matrix types and default animation attributes", () => {
		const body = `<svg xmlns="${svg}"><path transform="matrix(1 0 0 1 10 20)"/></svg>`;
		for (const name of ["source-processor-svg-minification-should-preserve-dtd-declared-matrix-types-and-2", "source-processor-svg-minification-should-preserve-dtd-declared-matrix-types-and-3"]) {
			expect(new SourceProcessor().process(fixture("xml", name), compact).code).toBe(fixture("xml", name));
		}
		const animated = fixture("xml", "source-processor-svg-minification-should-preserve-dtd-declared-matrix-types-and");
		expect(new SourceProcessor().process(animated, compact).code).toBe(animated);
	});

	it("should compact redundant inline SVG transform arguments using the HTML printer", async () => {
		const source = fixture("xml", "source-processor-svg-minification-should-compact-redundant-inline-svg-transform");
		const options = { mode: /** @type {const} */ ("minify"), shortenSvgNumbers: true };
		const expected = 'transform="translate(5) scale(2) rotate(30)"';
		expect(new SourceProcessor().process(source, options).code).toContain(expected);
		expect((await new SourceProcessor().processAsync(source, options)).code).toContain(expected);
		expect(new SourceProcessor().process(source, { ...options, shortenSvgNumbers: false }).code).toContain('transform="translate(5 0) scale(2 2) rotate(30 0 0)"');
	});

	it("should preserve unsupported presentation values, namespaces and DTD defaults", () => {
		const processor = new SourceProcessor();
		for (const name of ["source-processor-svg-minification-should-preserve-unsupported-presentation-values-6", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-7", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-8", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-9", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-10", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-11", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-12", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-13", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-14"]) {
			const source = fixture("xml", name);
			expect(processor.process(source, compact).code).toBe(source);
		}
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-unsupported-presentation-values");
		expect(processor.process(source, compact).code).toBe(source.replace('<custom opacity="+000.50"', '<custom opacity=".5"'));
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-2"), { ...compact, xml: false }).code).toContain('opacity=.5');
		const body = `<svg xmlns="${svg}"><g/><path stroke-width="0002.00"/></svg>`;
		const dtd = '<!DOCTYPE svg [<!ATTLIST g stroke-width CDATA "0002.00">]>';
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-3"), compact).code).toBe(dtd + body.replace('stroke-width="0002.00"', 'stroke-width="2"'));
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-4"), compact).code).toBe('<!DOCTYPE svg SYSTEM "svg.dtd">' + body);
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-preserve-unsupported-presentation-values-5"), { ...compact, xml: false }).code).toContain('opacity=+000.50');
	});

	it("should retain precision, negative zero, units and exponent spellings", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-retain-precision-negative-zero-units-and");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), shortenSvgNumbers: true };
		const once = new SourceProcessor().process(source, options).code;
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg"><rect x="9007199254740993" y="-0" width=".123456789123456789" height="+000.00e+03"/><path pathLength="001px" d="M000.00 000.00L001.00 002.00"/><polyline points="001e+02 +002.00E-02"/></svg>');
		expect(new SourceProcessor().process(once, options).code).toBe(once);
	});

	it("should preserve foreign namespaces, unknown geometry and qualified attributes", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-foreign-namespaces-unknown");
		expect(new SourceProcessor().process(source, { xml: true, mode: "minify", shortenSvgNumbers: true }).code).toBe(source.replace('<s:rect x="001.00"', '<s:rect x="1"'));
	});

	it("should preserve DTD constraints and reinitialize cleanup after unread DTDs", () => {
		const options = { xml: true, mode: /** @type {const} */ ("minify"), shortenSvgNumbers: true };
		const processor = new SourceProcessor();
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-dtd-constraints-and-reinitialize");
		expect(processor.process(source, options).code).toBe(source.replace('x="001.00"', 'x="1"'));
		for (const name of ["source-processor-svg-minification-should-preserve-dtd-constraints-and", "source-processor-svg-minification-should-preserve-dtd-constraints-and-2"]) {
			const document = fixture("xml", name);
			expect(processor.process(document, options).code).toBe(document);
		}
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-preserve-dtd-constraints-and-reinitialize-2"), options).code).toBe('<svg xmlns="http://www.w3.org/2000/svg" width="1"/>');
	});

	it("should preserve shorter entity spellings and reuse decoded numeric values", async () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-shorter-entity-spellings-and");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), shortenSvgNumbers: true };
		const once = new SourceProcessor().process(source, options).code;
		expect(once).toBe(source.replace('width="&n;"', 'width="1.5"'));
		expect((await new SourceProcessor().processAsync(once, options)).code).toBe(once);
	});

	it("should combine numeric cleanup with synchronous and deferred CSS rendering", async () => {
		const source = fixture("xml", "source-processor-svg-minification-should-combine-numeric-cleanup-with-synchronous");
		const render = builtinEmbeddedRenderer();
		const options = { xml: true, mode: /** @type {const} */ ("minify"), shortenSvgNumbers: true, removeUnusedSvgNamespaces: true, renderEmbeddedSource: render };
		const expected = '<svg xmlns="http://www.w3.org/2000/svg" width="1"><style>rect{fill:red}</style><rect x=".5" style="fill:red"/></svg>';
		expect(new SourceProcessor().process(source, options).code).toBe(expected);
		expect((await new SourceProcessor().processAsync(source, { ...options, renderEmbeddedSource: async (css, offer) => render(css, offer) })).code).toBe(expected);
		expect(new SourceProcessor().process(source, { ...options, xml: false }).code).toContain("width=1>");
	});

	it("should shorten inline SVG geometry in HTML and leave other namespaces alone", () => {
		const svgPart = '<svg viewBox="000 000 0024.0 24"><metadata><rdf:RDF/></metadata><path d="M000,000 l0 80-112 0" transform="translate(+001.00, 002.00)"/><rect width=+001.500px height="&#48;02"></rect></svg>';
		const source = fixture("xml", "source-processor-svg-minification-should-shorten-inline-svg-geometry-in-html-and");
		const options = { mode: /** @type {const} */ ("minify"), shortenSvgNumbers: true, shortenSvgPathData: true, removeSvgMetadata: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe('<!doctype html><p><svg viewBox="0 0 24 24"><path d="M0 0v80h-112" transform="translate(1 2)"/><rect width=1.5px height=2></rect></svg><math><mi width=001.00>x</mi></math><div d=M000,000 width=001.00></div>');
		expect(processor.process(once, options).code).toBe(once);
		const plain = processor.process(source, { mode: "minify" }).code;
		expect(plain).toContain('<metadata><rdf:RDF/></metadata><path d="M000,000 l0 80-112 0"');
		expect(processor.process(source, { ...options, removeSvgMetadata: false }).code).toContain("<metadata>");
	});

	it("should preserve a long unsupported numeric value without changing later parses", () => {
		const options = { xml: true, mode: /** @type {const} */ ("minify"), shortenSvgNumbers: true };
		// 30000 digits, spaces or zeros, each ending in what no number spells.
		for (const name of ["source-processor-svg-minification-should-preserve-a-long-unsupported-numeric", "source-processor-svg-minification-should-preserve-a-long-unsupported-numeric-2", "source-processor-svg-minification-should-preserve-a-long-unsupported-numeric-3"]) {
			const source = fixture("xml", name);
			expect(new SourceProcessor().process(source, options).code).toBe(source);
		}
		expect(new SourceProcessor().process(fixture("xml", "source-processor-svg-minification-should-preserve-a-long-unsupported-numeric-value"), options).code).toBe('<svg xmlns="http://www.w3.org/2000/svg" width="1"/>');
	});

	it("should inherit xml:space and allow a default override without collapsing SVG text", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-inherit-xml-space-and-allow-a-default");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), collapseWhitespace: true };
		const once = new SourceProcessor().process(source, options).code;
		expect(once).toBe('<root xml:space="preserve"><svg xmlns="http://www.w3.org/2000/svg"> <g> </g><g xml:space="default"><g/><text> A  <tspan xml:space="default"> B  </tspan> C </text></g> </svg></root>');
		expect(new SourceProcessor().process(once, options).code).toBe(once);
	});

	it("should remove deeply nested SVG indentation without recursive traversal", () => {
		const depth = 6000;
		const prefix = '<svg xmlns="http://www.w3.org/2000/svg">';
		const source = fixture("xml", "source-processor-svg-minification-should-remove-deeply-nested-svg-indentation");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), collapseWhitespace: true };
		const once = new SourceProcessor().process(source, options).code;
		expect(once).toBe(`${prefix}${"<g>".repeat(depth - 1)}<g/>${"</g>".repeat(depth - 1)}</svg>`);
		expect(new SourceProcessor().process(once, options).code).toBe(once);
	});

	it("should resolve namespace aliases and preserve generic and foreign XML", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-resolve-namespace-aliases-and-preserve");
		expect(new SourceProcessor().process(source, { xml: true, mode: "minify", collapseWhitespace: true }).code).toBe('<root xmlns:s="http://www.w3.org/2000/svg"> <s:svg><s:g/><s:g xmlns:s="urn:foreign"> <svg xmlns="http://www.w3.org/2000/svg"> <g> </g> </svg> </s:g><g> </g><s:g>\u00a0</s:g></s:svg> </root>');
	});

	it("should preserve DTD-defaulted xml:space and unread DTD defaults", () => {
		const options = { xml: true, mode: /** @type {const} */ ("minify"), collapseWhitespace: true };
		for (const name of ["source-processor-svg-minification-should-preserve-dtd-defaulted-xml-space-and", "source-processor-svg-minification-should-preserve-dtd-defaulted-xml-space-and-2", "source-processor-svg-minification-should-preserve-dtd-defaulted-xml-space-and-3"]) {
			const source = fixture("xml", name);
			expect(new SourceProcessor().process(source, options).code).toBe(source);
		}
	});

	it("should combine whitespace cleanup with data removal and retained comments", async () => {
		const source = fixture("xml", "source-processor-svg-minification-should-combine-whitespace-cleanup-with-data");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), collapseWhitespace: true, removeSvgMetadata: true, transforms: { comments: /** @type {const} */ ("all") } };
		const once = new SourceProcessor().process(source, options).code;
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg"><!--! keep --><g/><text>]]&gt;</text></svg>');
		expect(await new SourceProcessor().processAsync(once, options)).toMatchObject({ code: once });
	});

	it("should remove only unused prefixed namespace declarations within SVG", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-remove-only-unused-prefixed-namespace");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeUnusedSvgNamespaces: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe('<root xmlns:outer="urn:outer"><svg xmlns="http://www.w3.org/2000/svg" xmlns:x="urn:used"><x:item/><g/><g xmlns=""/><use x:href="#shape"/></svg></root>');
		expect(processor.process(once, options).code).toBe(once);
		expect(processor.process(source, { ...options, removeUnusedSvgNamespaces: false }).code).toBe(source);
		expect(processor.process(source, { ...options, mode: "beautify" }).code).toBe(source);
	});

	it("should retain prefixes in kept comments and scan long text without repeated suffix searches", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-retain-prefixes-in-kept-comments-and-scan");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeUnusedSvgNamespaces: true, transforms: { comments: /** @type {const} */ ("all") } };
		const processor = new SourceProcessor();
		expect(processor.process(source, options).code).toBe(source);
		expect(processor.process(source, { ...options, transforms: { comments: false } }).code).toBe(source.replace(' xmlns:p="urn:data"', "").replace("<!--p:Thing-->", ""));
	});

	it("should track namespace aliases, rebinding and Unicode prefixes", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-track-namespace-aliases-rebinding-and");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeUnusedSvgNamespaces: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe(source.replace(' xmlns:p="urn:outer"', ""));
		expect(processor.process(once, options).code).toBe(once);
	});

	it("should remove namespace references only after removing optional SVG data", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-remove-namespace-references-only-after");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), sortAttributes: true, removeUnusedSvgNamespaces: true, removeSvgMetadata: true, removeSvgEditorData: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>');
		expect(processor.process(once, options).code).toBe(once);
	});

	it("should reuse empty-attribute removal without HTML entity decoding or SVG defaults", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-reuse-empty-attribute-removal-without");
		const processor = new SourceProcessor();
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeEmptyAttributes: true };
		const once = processor.process(source, options).code;
		expect(once).toBe(source.replace(' class=" &#9;" id="" style=""', "").replace('style="&#160;"', 'style="\u00a0"'));
		expect(processor.process(once, options).code).toBe(once);
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-reuse-empty-attribute-removal-without-2"), options).code).toBe('<root class="" id="" style=""/>');
		expect(processor.process(source, { ...options, mode: "beautify" }).code).toBe(source);
	});

	it("should preserve attributes and namespace bindings declared by the DTD", () => {
		const dtd = '<!DOCTYPE svg [<!ENTITY ns "http://www.w3.org/2000/svg"><!ATTLIST svg xmlns CDATA "&ns;" xmlns:p CDATA "urn:default" id CDATA "fallback" class CDATA #IMPLIED style CDATA "fill:red">]>';
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-attributes-and-namespace");
		const processor = new SourceProcessor();
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeUnusedSvgNamespaces: true, removeEmptyAttributes: true };
		const once = processor.process(source, options).code;
		expect(once).toBe(source.replace(' xmlns:q="urn:unused"', ""));
		expect(processor.process(once, options).code).toBe(once);
	});

	it("should preserve QName-like data in non-CSS style bodies", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-qualified-name-like-data-in-non-css-style");
		expect(new SourceProcessor().process(source, { xml: true, mode: "minify", removeUnusedSvgNamespaces: true, renderEmbeddedSource: () => "" }).code).toBe(source);
	});

	it("should remove only SVG metadata when requested", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-remove-only-svg-metadata-when-requested");
		const processor = new SourceProcessor();
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeSvgMetadata: true };
		const once = processor.process(source, options).code;
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg"><title>Title</title><desc>Description</desc><g/><foreignObject><metadata xmlns="urn:data">keep</metadata></foreignObject><Metadata>case</Metadata></svg>');
		expect(processor.process(once, options).code).toBe(once);
		expect(processor.process(source, { ...options, removeSvgMetadata: false }).code).toBe(source);
		expect(processor.process(source, { ...options, mode: "beautify" }).code).toBe(source);
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-remove-only-svg-metadata-when-requested-2"), options).code).toBe('<metadata xmlns="http://www.w3.org/2000/svg">root</metadata>');
	});

	it("should remove empty-ID metadata and preserve IDs supplied by the DTD", () => {
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeSvgMetadata: true, removeEmptyAttributes: true };
		const processor = new SourceProcessor();
		const empty = fixture("xml", "source-processor-svg-minification-should-remove-empty-id-metadata-and-preserve-ids");
		expect(processor.process(empty, options).code).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
		const dtd = '<!DOCTYPE svg [<!ATTLIST metadata id CDATA "record">]>';
		const source = fixture("xml", "source-processor-svg-minification-should-remove-empty-id-metadata-and-preserve-ids-2");
		expect(processor.process(source, options).code).toBe(source);
	});

	it("should preserve editor subtrees containing IDs and inherited xml:id values", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-editor-subtrees-containing-ids");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeSvgMetadata: true, removeSvgEditorData: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe(source.replace('<e:view>drop</e:view>', ''));
		expect(processor.process(once, options).code).toBe(once);
	});

	it("should preserve DTD content models and declared editor attributes", () => {
		const svg = 'http://www.w3.org/2000/svg';
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeSvgMetadata: true, removeSvgEditorData: true };
		const processor = new SourceProcessor();
		const body = fixture("xml", "source-processor-svg-minification-should-preserve-dtd-content-models-and-declared-2");
		for (const name of ["source-processor-svg-minification-should-preserve-dtd-content-models-and-declared-3", "source-processor-svg-minification-should-preserve-dtd-content-models-and-declared-4", "source-processor-svg-minification-should-preserve-dtd-content-models-and-declared-5"]) {
			expect(processor.process(fixture("xml", name), options).code).toBe(fixture("xml", name));
		}
		const dtd = '<!DOCTYPE svg [<!ATTLIST g e:label CDATA #FIXED "kept">]>';
		const declared = `<svg xmlns="${svg}" xmlns:e="http://www.inkscape.org/namespaces/inkscape"><g e:label="kept" e:unused="drop"/></svg>`;
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-preserve-dtd-content-models-and-declared"), options).code).toBe(dtd + declared.replace(' e:unused="drop"', ''));
		expect(processor.process(body, options).code).toBe(`<svg xmlns="${svg}" xmlns:e="http://www.inkscape.org/namespaces/inkscape"/>`);
	});

	it("should resolve editor namespaces by URI and respect local declarations", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-resolve-editor-namespaces-by-uri-and");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeSvgEditorData: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg" xmlns:e="http://www.inkscape.org/namespaces/inkscape" xmlns:inkscape="urn:data" inkscape:version="keep"><g label="keep"><e:view xmlns:e="urn:data">keep</e:view></g><e:view xmlns:e="urn:data" e:flag="keep"/><metadata>keep</metadata></svg>');
		expect(processor.process(once, options).code).toBe(once);
		expect(processor.process(source, { ...options, removeSvgEditorData: false }).code).toBe(source);
		const unrelated = fixture("xml", "source-processor-svg-minification-should-resolve-editor-namespaces-by-uri-and-2");
		expect(processor.process(unrelated, options).code).toBe(unrelated);
	});

	it("should remove default-namespace editor elements within SVG", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-remove-default-namespace-editor-elements");
		expect(new SourceProcessor().process(source, { xml: true, mode: "minify", removeSvgMetadata: true, removeSvgEditorData: true }).code).toBe('<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:path/></s:svg>');
	});

	it("should resolve editor namespaces supplied by the DTD", () => {
		const dtd = '<!DOCTYPE svg [<!ENTITY editor "http://www.inkscape.org/namespaces/inkscape"><!ATTLIST svg xmlns CDATA "http://www.w3.org/2000/svg" xmlns:e CDATA "&editor;">]>';
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeSvgMetadata: true, removeSvgEditorData: true };
		const processor = new SourceProcessor();
		const once = processor.process(fixture("xml", "source-processor-svg-minification-should-resolve-editor-namespaces-supplied-by-the"), options).code;
		expect(once).toBe(`${dtd}<svg><g/></svg>`);
		expect(processor.process(once, options).code).toBe(once);
	});

	it("should preserve licensing vocabularies when removing editor data", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-licensing-vocabularies-when");
		expect(new SourceProcessor().process(source, { xml: true, mode: "minify", removeSvgEditorData: true }).code).toBe(source);
	});

	it("should preserve comment options and render only surviving SVG styles", () => {
		/** @type {string[]} */
		const rendered = [];
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-comment-options-and-render-only");
		const once = new SourceProcessor().process(source, { xml: true, mode: "minify", removeSvgMetadata: true, transforms: { comments: "all" }, renderEmbeddedSource: (css) => { rendered.push(css); return "g{fill:red}"; } }).code;
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg"><!--keep--><style>g{fill:red}</style></svg>');
		expect(rendered).toEqual(["g { fill: red }"]);
	});

	it("should remove data from deeply nested SVG without recursive traversal", () => {
		const depth = 6000;
		const prefix = '<svg xmlns="http://www.w3.org/2000/svg">';
		const source = fixture("xml", "source-processor-svg-minification-should-remove-data-from-deeply-nested-svg");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeSvgMetadata: true, removeSvgEditorData: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe(`${prefix}${"<g>".repeat(depth - 1)}<g/>${"</g>".repeat(depth - 1)}</svg>`);
		expect(processor.process(once, options).code).toBe(once);
	});

	it("should preserve the verbatim fallback for XML markup entities", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-preserve-the-verbatim-fallback-for-xml");
		expect(new SourceProcessor().process(source, { xml: true, mode: "minify", collapseWhitespace: true, removeSvgMetadata: true, removeSvgEditorData: true, removeEmptyAttributes: true, removeUnusedSvgNamespaces: true }).code).toBe(source);
	});

	it("should rank only surviving attributes when removing SVG data", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-rank-only-surviving-attributes-when");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), sortAttributes: true, removeSvgMetadata: true, removeSvgEditorData: true };
		const processor = new SourceProcessor();
		const once = processor.process(source, options).code;
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg" xmlns:e="http://ns.adobe.com/AdobeIllustrator/10.0/"><g z="1" a="1"/><g z="2"/></svg>');
		expect(processor.process(once, options).code).toBe(once);
	});

	it("should keep joined XML character data well formed after removal", () => {
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeSvgMetadata: true };
		const processor = new SourceProcessor();
		expect(processor.process(fixture("xml", "source-processor-svg-minification-should-keep-joined-xml-character-data-well"), options).code).toBe('<svg xmlns="http://www.w3.org/2000/svg">]]&gt;</svg>');
		// Each side of a removed separator: text, references, `]]`, `>` and CDATA.
		for (const name of ["source-processor-svg-minification-should-keep-joined-xml-character-data-well-2", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-3", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-4", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-5", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-6", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-7", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-8", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-9", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-10", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-11", "source-processor-svg-minification-should-keep-joined-xml-character-data-well", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-12", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-13", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-14", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-15", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-16", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-17", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-18", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-19", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-20", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-21", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-22", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-23", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-24", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-25", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-26", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-27", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-28", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-29", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-30", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-31", "source-processor-svg-minification-should-keep-joined-xml-character-data-well-32"]) {
			const once = processor.process(fixture("xml", name), options).code;
			expect(processor.process(once, options).code).toBe(once);
		}
	});

	it("should shorten SVG numbers inside HTML only under the switch for their kind", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-shorten-svg-numbers-inside-html-only");
		expect(new SourceProcessor().process(source, { mode: "minify", shortenSvgNumbers: true }).code).toBe('<svg><path d="M0.50 0" stroke-width=2 /><path d="M0.50 0" stroke-width=2 /></svg>');
		expect(new SourceProcessor().process(source, { mode: "minify", shortenSvgPathData: true }).code).toBe('<svg><path d="M.5 0" stroke-width=2.0 /><path d="M.5 0" stroke-width=2.0 /></svg>');
		// What neither grammar reads stays as written, referenced or not.
		const unread = fixture("xml", "source-processor-svg-minification-should-shorten-svg-numbers-inside-html-only-2");
		expect(new SourceProcessor().process(unread, { mode: "minify", shortenSvgNumbers: true, shortenSvgPathData: true }).code).toBe('<svg><path d="M0 0 X" stroke-width=x /><path d="M0 0 X" stroke-width=x. /></svg>');
	});

	it("should render only an SVG stylesheet typed as CSS when unused namespaces go", () => {
		const source = fixture("xml", "source-processor-svg-minification-should-render-only-an-svg-stylesheet-typed-as");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), removeUnusedSvgNamespaces: true, renderEmbeddedSource: builtinEmbeddedRenderer() };
		expect(new SourceProcessor().process(source, options).code).toBe(`<svg xmlns="${svg}" xmlns:p="urn:p"><text>a</text><style type="text/less">a{}</style><style type=" TEXT/CSS ">a{fill:red}</style><style type=""/><p:style>c{}</p:style><style id="s">d{fill:red}</style></svg>`);
		// Text outside the root is not well-formed and not printed.
		expect(new SourceProcessor().process(fixture("xml", "source-processor-svg-minification-should-render-only-an-svg-stylesheet-typed-as-2"), options).code).toBe(`<svg xmlns="${svg}"/>`);
	});

	it("should shorten path data alike whether an animation tag the input cut short is read or not", () => {
		// The `<animate>` tag is never finished, so it animates nothing, and the
		// path's data shortens on the first pass as on the second.
		const source = fixture("xml", "source-processor-svg-minification-should-shorten-path-data-alike-whether-an");
		const options = { xml: true, mode: /** @type {const} */ ("minify"), shortenSvgPathData: true };
		const once = new SourceProcessor().process(source, options).code;
		expect(once).toBe(`<svg xmlns="${svg}"><path id="a" d="M10 20V30"/></svg>`);
		expect(new SourceProcessor().process(once, options).code).toBe(once);
	});

	it.each([
		"removeSvgMetadata",
		"removeSvgEditorData",
		"removeUnusedSvgNamespaces",
		"removeEmptyAttributes",
		"removeEmptyElements",
		"collapseWhitespace",
		"shortenSvgNumbers",
		"shortenSvgColors",
		"shortenSvgPathData",
		"sortSvgSymbols",
		"convertSvgShapes",
		"cleanupSvgStructure",
		"mergeSvgPaths",
		"reuseSvgPaths",
		"sortSvgDefinitions"
	])("should print each SVG fixture under %s alone as it prints again", (name) => {
		// Each switch also runs without the ones a build turns on beside it.
		for (const fixtureName of [
			"svg-minification-definitions",
			"svg-minification-edges",
			"svg-minification-geometry",
			"svg-minification-groups"
		]) {
			const source = fixture("xml", fixtureName);
			const options = { xml: true, mode: /** @type {const} */ ("minify"), sortAttributes: true, [name]: true };
			const once = new SourceProcessor().process(source, options).code;
			expect(new SourceProcessor().process(once, options).code).toBe(once);
		}
	});

	it.each([
		["shortenSvgNumbers", "source-processor-svg-minification-should-decline-what-shorten-svg-numbers-cannot"],
		["shortenSvgPathData", "source-processor-svg-minification-should-decline-what-shorten-svg-path-data-cannot"],
		["cleanupSvgStructure", "source-processor-svg-minification-should-decline-what-cleanup-svg-structure-cannot"],
		["reuseSvgPaths", "source-processor-svg-minification-should-decline-what-reuse-svg-paths-cannot-rewrite"],
		["mergeSvgPaths", "source-processor-svg-minification-should-decline-what-merge-svg-paths-cannot-rewrite"],
		["removeEmptyElements cleanupSvgStructure", "source-processor-svg-minification-should-decline-what-remove-empty-elements"],
		["sortSvgDefinitions cleanupSvgStructure", "source-processor-svg-minification-should-decline-what-sort-svg-definitions"],
		["convertSvgShapes", "source-processor-svg-minification-should-decline-what-convert-svg-shapes-cannot"],
		["shortenSvgNumbers", "source-processor-svg-minification-should-decline-what-shorten-svg-numbers-cannot-2"],
		["shortenSvgPathData", "source-processor-svg-minification-should-decline-what-shorten-svg-path-data-cannot-2"],
		["cleanupSvgStructure", "source-processor-svg-minification-should-decline-what-cleanup-svg-structure-cannot-2"],
		["reuseSvgPaths", "source-processor-svg-minification-should-decline-what-reuse-svg-paths-cannot-rewrite-2"],
		["shortenSvgPathData", "source-processor-svg-minification-should-decline-what-shorten-svg-path-data-cannot-3"],
		["cleanupSvgStructure", "source-processor-svg-minification-should-decline-what-cleanup-svg-structure-cannot-3"],
		["cleanupSvgStructure shortenSvgNumbers", "source-processor-svg-minification-should-decline-what-cleanup-svg-structure"],
		["mergeSvgPaths", "source-processor-svg-minification-should-decline-what-merge-svg-paths-cannot-rewrite-2"],
		["removeEmptyElements cleanupSvgStructure", "source-processor-svg-minification-should-decline-what-remove-empty-elements-2"],
		["convertSvgShapes", "source-processor-svg-minification-should-decline-what-convert-svg-shapes-cannot-2"],
		["shortenSvgNumbers", "source-processor-svg-minification-should-decline-what-shorten-svg-numbers-cannot-3"]
	])("should decline what %s cannot rewrite exactly and print the rest as it prints again", (/** @type {string} */ name, /** @type {string} */ fixtureName) => {
		const source = fixture("xml", fixtureName);
		const options = {
			xml: true,
			mode: /** @type {const} */ ("minify"),
			...Object.fromEntries(name.split(" ").map((switchName) => [switchName, true]))
		};
		const once = new SourceProcessor().process(source, options).code;
		expect(new SourceProcessor().process(once, options).code).toBe(once);
	});
});

describe("xmlMinify — SVG switches", () => {
	const { htmlMinify } = webpack.html;

	it("should forward resource-wrapper cleanup through SVG data URLs", async () => {
		const { code } = await webpack.html.htmlMinify({ 'a.html': fixture("html", "xml-minify-svg-switches-should-forward-resource-wrapper-cleanup-through-svg-data") }, undefined, { svg: { cleanupStructure: true } });
		expect(decodeURIComponent(code)).not.toContain('<defs>');
		expect(decodeURIComponent(code)).toMatch(/href=["']#s["']/);
	});

	it("should combine structural cleanup with equal-radius ellipse conversion", async () => {
		const source = fixture("xml", "xml-minify-svg-switches-should-combine-structural-cleanup-with-equal-radius");
		const options = { cleanupStructure: true, convertShapes: true, sortDefinitions: true, reusePaths: true, mergePaths: true };
		const { code } = await xmlMinify({ 'structure.svg': source }, undefined, options);
		expect(code).toBe('<svg xmlns="http://www.w3.org/2000/svg"><circle id="shape" r="10"/><circle r="5"/></svg>');
		expect((await xmlMinify({ 'structure.svg': code }, undefined, options)).code).toBe(code);
	});

	it("should forward sorting and path reuse to SVG data URLs", async () => {
		const { code } = await webpack.html.htmlMinify({ 'a.html': fixture("html", "xml-minify-svg-switches-should-forward-sorting-and-path-reuse-to-svg-data-urls") }, undefined, { svg: { cleanupStructure: true, reusePaths: true, sortDefinitions: true, mergePaths: true } });
		expect(decodeURIComponent(code)).toContain("use href='#p'");
		expect(code).not.toContain('<g>');
	});

	it("should preserve the CSS color transform option in SVG presentation attributes", async () => {
		const source = fixture("xml", "xml-minify-svg-switches-should-preserve-the-css-color-transform-option-in-svg");
		expect((await xmlMinify({ 'image.svg': source }, undefined, { shortenColors: true, css: { shortenColors: false } })).code).toBe(source);
	});

	it("should remove metadata and editor data independently", async () => {
		const source = fixture("xml", "xml-minify-svg-switches-should-remove-metadata-and-editor-data-independently");
		for (const removeMetadata of [false, true]) {
			for (const removeEditorData of [false, true]) {
				const { code } = await xmlMinify({ "image.svg": source }, undefined, { removeMetadata, removeEditorData });
				expect(code).toBe(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:e="http://www.inkscape.org/namespaces/inkscape"${removeEditorData ? "" : ' e:version="1"'}>${removeMetadata ? "" : "<metadata>editor</metadata>"}${removeEditorData ? "" : "<e:view/>"}<path/></svg>`);
			}
		}
	});

	it("should forward independent namespace and empty-attribute options", async () => {
		const source = fixture("xml", "xml-minify-svg-switches-should-forward-independent-namespace-and-empty-attribute");
		for (const removeUnusedNamespaces of [false, true]) {
			for (const removeEmptyAttributes of [false, true]) {
				const { code } = await xmlMinify({ "image.svg": source }, undefined, { removeUnusedNamespaces, removeEmptyAttributes });
				expect(code).toBe(`<svg xmlns="http://www.w3.org/2000/svg"${removeUnusedNamespaces ? "" : ' xmlns:unused="urn:unused"'}><g${removeEmptyAttributes ? "" : ' class="" id="" style=""'}/></svg>`);
				expect((await xmlMinify({ "image.svg": code }, undefined, { removeUnusedNamespaces, removeEmptyAttributes })).code).toBe(code);
			}
		}
	});
});
