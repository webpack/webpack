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

const {
	ATOM_FEED,
	EDITOR_SVG,
	MAVEN_POM,
	PRESETS,
	XLIFF,
	XML_CUTS,
	canonical,
	printerFor,
	runMode,
	toolsFor
} = require("../../../tooling/compare-xml-tools");
const { cutsAt } = require("../../../tooling/compare-tools-harness");
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
