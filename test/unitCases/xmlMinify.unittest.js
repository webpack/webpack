"use strict";

const webpack = require("../../");

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
	it.each([false, true])("should forward numeric cleanup with enabled=%s and embedded CSS", async (shortenNumbers) => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0010.00 0010.00"><style>rect { fill: #ff0000 }</style><rect x="+001.00" style="stroke: #00ff00"/></svg>';
		const options = { shortenNumbers };
		const { code } = await xmlMinify({ "image.svg": source }, undefined, options);
		expect(code).toBe(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shortenNumbers ? '0 0 10 10' : '0 0 0010.00 0010.00'}"><style>rect{fill:red}</style><rect x="${shortenNumbers ? '1' : '+001.00'}" style="stroke:#0f0"/></svg>`);
		expect((await xmlMinify({ "image.svg": code }, undefined, options)).code).toBe(code);
	});
	it.each([false, true])("should forward SVG whitespace cleanup with enabled=%s", async (collapseWhitespace) => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg">\n <g class="" id="" style=""> </g>\n <text> A  <tspan> B </tspan> C </text>\n</svg>';
		const options = { collapseWhitespace };
		const { code } = await xmlMinify({ "image.svg": Buffer.from(source) }, undefined, options);
		expect(code).toBe(collapseWhitespace ? '<svg xmlns="http://www.w3.org/2000/svg"><g class="" id="" style=""/><text> A  <tspan> B </tspan> C </text></svg>' : source);
		expect((await xmlMinify({ "image.svg": code }, undefined, options)).code).toBe(code);
	});
	it("should remove metadata and editor data independently", async () => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:e="http://www.inkscape.org/namespaces/inkscape" e:version="1"><metadata>editor</metadata><e:view/><path/></svg>';
		for (const removeMetadata of [false, true]) {
			for (const removeEditorData of [false, true]) {
				const { code } = await xmlMinify({ "image.svg": source }, undefined, { removeMetadata, removeEditorData });
				expect(code).toBe(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:e="http://www.inkscape.org/namespaces/inkscape"${removeEditorData ? "" : ' e:version="1"'}>${removeMetadata ? "" : "<metadata>editor</metadata>"}${removeEditorData ? "" : "<e:view/>"}<path/></svg>`);
			}
		}
	});

	it("should forward independent namespace and empty-attribute options", async () => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:unused="urn:unused"><g class="" id="" style="/* empty */"/></svg>';
		for (const removeUnusedNamespaces of [false, true]) {
			for (const removeEmptyAttributes of [false, true]) {
				const { code } = await xmlMinify({ "image.svg": source }, undefined, { removeUnusedNamespaces, removeEmptyAttributes });
				expect(code).toBe(`<svg xmlns="http://www.w3.org/2000/svg"${removeUnusedNamespaces ? "" : ' xmlns:unused="urn:unused"'}><g${removeEmptyAttributes ? "" : ' class="" id="" style=""'}/></svg>`);
				expect((await xmlMinify({ "image.svg": code }, undefined, { removeUnusedNamespaces, removeEmptyAttributes })).code).toBe(code);
			}
		}
	});

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
