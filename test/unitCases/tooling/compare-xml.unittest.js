"use strict";

const mockOptimize = jest.fn((/** @type {string} */ xml) => ({ data: xml }));
const mockLoad = jest.fn(() => ({ optimize: mockOptimize }));

const installed = jest.fn(() => Promise.resolve("xml-tool-comparison"));

// A real install would `npm ci` the corpus into a contributor's cache, and
// nothing here reads it: the built fixtures are the ones under test.
jest.mock("../../../tooling/compare-tools-harness", () => ({
	...jest.requireActual("../../../tooling/compare-tools-harness"),
	installPackages: installed,
	loaderFor: () => mockLoad
}));

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
	ATOM_FEED,
	CACHE,
	EDITOR_SVG,
	MAVEN_POM,
	PRESETS,
	TREE_READERS,
	XLIFF,
	XML_CUTS,
	canonical,
	printerFor,
	runMode,
	toolsFor
} = require("../../../tooling/compare-xml-tools");
const {
	agreement,
	cutsAt
} = require("../../../tooling/compare-tools-harness");
const { SourceProcessor } = require("../../../lib/html/syntax");

describe("the XML tool comparison", () => {
	it("should start nothing when the script is required rather than run", () => {
		expect(installed).toHaveBeenCalledTimes(0);
	});

	it("should install the corpus and stop on `--setup`", async () => {
		installed.mockClear();

		await expect(runMode("--setup")).resolves.toBe("xml-tool-comparison");

		expect(installed).toHaveBeenCalledTimes(1);
		expect(installed).toHaveBeenCalledWith("xml-tool-comparison");
	});

	it.each([
		["editor-exported SVG", EDITOR_SVG],
		["Atom feed", ATOM_FEED],
		["Maven POM", MAVEN_POM],
		["XLIFF", XLIFF]
	])("should minify the %s to a document saying the same", (_name, xml) => {
		const minified = /** @type {{ code: string }} */ (
			new SourceProcessor().process(xml, { xml: true, mode: "minify" })
		).code;
		expect(minified.length).toBeLessThan(xml.length);
		expect(canonical(minified)).toBe(canonical(xml));
	});

	it("should compare sorted attributes with embedded stylesheet minification", async () => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg" z="1" a="2"><style>path { fill: #ff0000 }</style></svg>';
		const [tool] = toolsFor("minify", source).filter((tool) => tool.name === "webpack (sorted attributes)");
		const minify = await tool.create();
		const once = await minify(source);
		expect(once).toBe('<svg a="2" xmlns="http://www.w3.org/2000/svg" z="1"><style>path{fill:red}</style></svg>');
		expect(await minify(once)).toBe(once);
	});

	it.each(["<svg/>", '<svg xmlns="http://www.w3.org/2000/svg"><path/></svg>', EDITOR_SVG])("should compare both SVGO passes for an SVG root", (xml) => {
		expect(toolsFor("minify", xml).map((tool) => tool.name)).toEqual(expect.arrayContaining(["svgo", "svgo (multipass)"]));
	});

	it.each(["<root><svg/></root>", "<!--<svg >--><root/>", '<root><![CDATA[<svg >]]></root>', MAVEN_POM])("should omit SVGO for a non-SVG root", (xml) => {
		expect(toolsFor("minify", xml).map((tool) => tool.name)).not.toEqual(expect.arrayContaining(["svgo"]));
	});

	it("should invoke SVGO with the row's pass count and return its data", async () => {
		mockOptimize.mockClear();
		mockLoad.mockClear();
		const tools = toolsFor("minify", "<svg/>").filter((tool) => tool.name.startsWith("svgo"));
		for (const tool of tools) {
			const minify = await tool.create();
			expect(await minify("<svg/>")).toBe("<svg/>");
		}
		expect(mockOptimize.mock.calls).toEqual([
			["<svg/>", { multipass: false }],
			["<svg/>", { multipass: true }]
		]);
		expect(mockLoad.mock.calls).toEqual([["svgo"], ["svgo"]]);
	});

	it("should reuse parsed entity-backed attribute values in its canonical form", () => {
		const value = "x".repeat(400000);
		const source = `<!DOCTYPE root [<!ENTITY value "${value}">]><root left="&value;" right="&value;"/>`;
		const read = canonical(source);
		expect(read.includes(`left="${value}"`)).toBe(true);
		expect(read.includes(`right="${value}"`)).toBe(true);
	});

	it("should expand what the DTD declares, but not inside a CDATA section", () => {
		const read = canonical(EDITOR_SVG);
		expect(read).toContain('xmlns="http://www.w3.org/2000/svg"');
		expect(read).toContain(".st0{&amp;st0}");
	});

	it("should read a stylesheet and a style attribute the same however the CSS minifier wrote them", () => {
		const source =
			'<svg><style>\n\t.dot {\n\t\tfill: #ff0000;\n\t}\n</style><g style="display: none;"/></svg>';
		const minified =
			'<svg><style>.dot{fill:red}</style><g style="display:none"/></svg>';
		expect(canonical(minified)).toBe(canonical(source));
		expect(canonical('<svg><g style="display:block"/></svg>')).not.toBe(
			canonical('<svg><g style="display:none"/></svg>')
		);
	});

	it("should read CSS under the target it was lowered for", () => {
		const options = { environment: { browsers: ["safari 15.4"] } };
		const source = "<svg><style>.a{user-select:none}</style></svg>";
		const lowered =
			"<svg><style>.a{-webkit-user-select:none;user-select:none}</style></svg>";
		expect(canonical(lowered, options)).toBe(canonical(source, options));
		expect(canonical(lowered)).not.toBe(canonical(source));
	});

	it("should cut the editor-exported SVG inside every construct it carries", () => {
		const where = cutsAt(EDITOR_SVG, XML_CUTS).map(([name]) => name);
		expect(where).toEqual(
			expect.arrayContaining([
				"in a processing instruction",
				"in a comment",
				"in an internal subset",
				"in a reference",
				"in a CDATA section",
				"in a <style> body",
				"in a style attribute"
			])
		);
	});

	it("should print every cut of the built fixtures as its own output under every preset", () => {
		for (const xml of [EDITOR_SVG, ATOM_FEED, MAVEN_POM, XLIFF]) {
			for (const [, source] of cutsAt(xml, XML_CUTS)) {
				for (const [preset, options] of PRESETS) {
					const minify = printerFor(options);
					const once = minify(source);
					expect({ preset, source, again: minify(once) }).toEqual({
						preset,
						source,
						again: once
					});
				}
			}
		}
	});
});

describe("the XML tool comparison — agreeing with @rgrove/parse-xml", () => {
	const xml =
		'<?xml version="1.0"?>\n<?style href="a"?>\n<r a="1" b="&amp;">t<![CDATA[c]]><!--m--><e/></r>\n';

	// What `@rgrove/parse-xml` builds for it, the declaration left out.
	const parsed = {
		children: [
			{ type: "pi", name: "style", content: 'href="a"' },
			{ type: "text", text: "\n" },
			{
				type: "element",
				name: "r",
				attributes: { a: "1", b: "&" },
				children: [
					{ type: "text", text: "t" },
					{ type: "cdata", text: "c" },
					{ type: "comment", content: "m" },
					{ type: "element", name: "e", attributes: {}, children: [] }
				]
			}
		]
	};

	/**
	 * @param {EXPECTED_ANY[]} children DOM nodes
	 * @returns {EXPECTED_ANY} a node holding them as siblings
	 */
	const dom = (children) => {
		children.forEach((child, i) => {
			child.nextSibling = children[i + 1] || null;
		});
		return { firstChild: children[0] || null };
	};

	// What `@xmldom/xmldom` builds for it, the declaration as an instruction.
	const document = dom([
		{ nodeType: 7, target: "xml", data: 'version="1.0"' },
		{ nodeType: 7, target: "style", data: 'href="a"' },
		{
			nodeType: 1,
			nodeName: "r",
			attributes: [
				{ name: "a", value: "1" },
				{ name: "b", value: "&" }
			],
			...dom([
				{ nodeType: 3, data: "t" },
				{ nodeType: 4, data: "c" },
				{ nodeType: 8, data: "m" },
				{ nodeType: 1, nodeName: "e", attributes: [], firstChild: null }
			])
		}
	]);

	// What htmlparser2 builds for it in `xmlMode`, a doctype kept as a directive.
	const handled = {
		children: [
			{ type: "directive", name: "?xml", data: '?xml version="1.0"?' },
			{ type: "directive", name: "!doctype", data: "!DOCTYPE r" },
			{ type: "directive", name: "?style", data: '?style href="a"?' },
			{
				type: "tag",
				name: "r",
				attribs: { a: "1", b: "&" },
				children: [
					{ type: "text", data: "t" },
					{ type: "cdata", children: [{ type: "text", data: "c" }] },
					{ type: "comment", data: "m" },
					{ type: "tag", name: "e", attribs: {}, children: [] }
				]
			}
		]
	};

	/** @type {string} */
	let directory;

	beforeAll(() => {
		// `@rgrove/parse-xml` is an ES module read through its manifest's entry,
		// so the stand-in is a file that entry points at.
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "compare-xml-"));
		const entry = path.join(directory, "parse-xml.js");
		fs.writeFileSync(
			path.join(directory, "parsed.json"),
			JSON.stringify(parsed)
		);
		fs.writeFileSync(
			entry,
			'exports.parseXml = () => require("./parsed.json");\n'
		);
		const main = path.relative(
			path.join(CACHE, "node_modules", "@rgrove/parse-xml"),
			entry
		);
		mockLoad.mockImplementation(
			/** @type {EXPECTED_ANY} */ (
				(/** @type {string} */ name) =>
					({
						"@rgrove/parse-xml/package.json": { main },
						"@xmldom/xmldom": {
							DOMParser: class {
								parseFromString() {
									return document;
								}
							}
						},
						htmlparser2: { parseDocument: () => handled }
					})[name]
			)
		);
	});

	afterAll(() => {
		mockLoad.mockReset();
		fs.rmSync(directory, { recursive: true, force: true });
	});

	it("should hold every tree-building parser to its tree", async () => {
		const cell = agreement("@rgrove/parse-xml", TREE_READERS, xml);
		expect(await cell("@rgrove/parse-xml")).toBe("reference");
		expect(await cell("saxes")).toBe("own dialect");
		expect(await cell("webpack")).toBe("yes");
		expect(await cell("@xmldom/xmldom")).toBe("yes");
		expect(await cell("htmlparser2 (xmlMode)")).toBe("yes");
	});

	it("should name the first node a parser reads apart", async () => {
		expect(
			await agreement(
				"@rgrove/parse-xml",
				TREE_READERS,
				xml.replace("<e/>", "<f/>")
			)("webpack")
		).toBe("no — /r[1]/e[1]: @rgrove/parse-xml <e>, tool <f>");
	});
});

describe("the XML tool comparison — the entities a DTD declares", () => {
	// A stand-in for `@rgrove/parse-xml`, which reads no DTD: it rejects every
	// entity unless resolved, and the internal subset is what `[…]` holds.
	const standIn = `exports.parseXml = (xml, options) => {
	if (xml === "broken") throw new Error(options.preserveDocumentType ? "second" : "first");
	if (options.preserveDocumentType) {
		const start = xml.indexOf("[");
		return { children: start === -1 ? [] : [{ type: "doctype", internalSubset: xml.slice(start + 1, xml.lastIndexOf("]")) }] };
	}
	if (options.resolveUndefinedEntity === undefined) throw new Error("Named entity isn't defined");
	const attributes = {};
	for (const name of ["first", "quoted", "decoded", "nested", "parameter", "commented", "tab"]) {
		attributes[name] = String(options.resolveUndefinedEntity("&" + name + ";"));
	}
	return { children: [{ type: "element", name: "r", attributes, children: [] }] };
};
`;

	/** @type {string} */
	let directory;

	beforeAll(() => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "compare-xml-dtd-"));
		const entry = path.join(directory, "parse-xml.js");
		fs.writeFileSync(entry, standIn);
		const main = path.relative(
			path.join(CACHE, "node_modules", "@rgrove/parse-xml"),
			entry
		);
		mockLoad.mockImplementation(
			/** @type {EXPECTED_ANY} */ (
				(/** @type {string} */ name) =>
					name === "@rgrove/parse-xml/package.json" ? { main } : undefined
			)
		);
	});

	afterAll(() => {
		mockLoad.mockReset();
		fs.rmSync(directory, { recursive: true, force: true });
	});

	it("should read what the internal subset declares as plain text, and nothing else", async () => {
		const reference = /** @type {import("../../../tooling/compare-tools-harness").TreeReader} */ (
			TREE_READERS.get("@rgrove/parse-xml")
		);
		const tree = await reference(`<!DOCTYPE r [
	<!ENTITY first "one"><!ENTITY first "two">
	<!ENTITY quoted 'say "hi"'>
	<!ENTITY decoded "&#x41;&#66;&#X43;">
	<!ENTITY nested "&first;">
	<!ENTITY parameter "%p;">
	<!-- <!ENTITY commented "no"> -->
	<!ENTITY tab "a&#9;b">
	<!ENTITY nested "plain"><!ENTITY parameter "plain"><!ENTITY tab "plain">
]><r/>`);
		expect(tree.list[0][2]).toBe(
			'<r first="one" quoted="say \\"hi\\"" decoded="undefined" nested="undefined" parameter="undefined" commented="undefined" tab="undefined">'
		);
		expect(
			(await reference('<!DOCTYPE r [<!ENTITY decoded "&#x41;&#66;">]><r/>'))
				.list[0][2]
		).toContain('decoded="AB"');
	});

	it("should still reject a source whose entities no internal subset declares", async () => {
		for (const [xml, error] of [
			["<r>&a;</r>", "Named entity isn't defined"],
			["<!DOCTYPE r []><r>&a;</r>", "Named entity isn't defined"],
			["broken", "first"]
		]) {
			expect(
				await agreement("@rgrove/parse-xml", TREE_READERS, xml)("webpack")
			).toBe(`could not compare: @rgrove/parse-xml rejects it: ${error}`);
		}
	});
});
