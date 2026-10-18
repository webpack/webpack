"use strict";

const mockOptimize = jest.fn((/** @type {string} */ xml) => ({ data: xml }));
const mockLoad = jest.fn(() => ({ optimize: mockOptimize }));

const installed = jest.fn(() => Promise.resolve("xml-tool-comparison"));

// A real install would `npm ci` the corpus into a contributor's cache, and
// nothing here reads it: the built fixtures are the ones under test.
jest.mock("../../tooling/compare-tools-harness", () => ({
	...jest.requireActual("../../tooling/compare-tools-harness"),
	installPackages: installed,
	loaderFor: () => mockLoad
}));

const {
	ATOM_FEED,
	EDITOR_SVG,
	MAVEN_POM,
	XLIFF,
	canonical,
	toolsFor
} = require("../../tooling/compare-xml-tools");
const { SourceProcessor } = require("../../lib/html/syntax");

describe("the XML tool comparison", () => {
	it.each(['colors', 'paths', 'containers'])("should compare cumulative SVG %s cleanup through the shared XML printer", async (step) => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg"><style>path { stroke: #ffffff }</style><g/><g id="keep"/><path fill="#ff0000" d="M000.00,000.00L001.00,002.00"/></svg>';
		const tool = toolsFor('minify', source).find((tool) => tool.name === `webpack (SVG ${step} cleanup)`);
		expect(tool).toBeDefined();
		const minify = await /** @type {NonNullable<typeof tool>} */ (tool).create();
		const once = await minify(source);
		expect(once).toContain('fill="red"');
		expect(once).toContain(`d="${step === 'colors' ? 'M000.00,000.00L001.00,002.00' : 'M0 0 1 2'}"`);
		expect(once.includes('<g/>')).toBe(step !== 'containers');
		expect(once).toContain('id="keep"');
		expect(once).toContain('<style>path{stroke:#fff}</style>');
		expect(await minify(once)).toBe(once);
	});
	it.each(["symbols", "shapes"])("should compare SVG %s through the XML printer", async (step) => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="z"><line x1="10" y1="20" x2="10" y2="30"/></symbol><symbol id="a"/></svg>';
		const tool = toolsFor("minify", source).find((tool) => tool.name === `webpack (SVG ${step} cleanup)`);
		expect(tool).toBeDefined();
		const minify = await /** @type {NonNullable<typeof tool>} */ (tool).create();
		const once = await minify(source);
		expect(once.indexOf('id="a"')).toBeLessThan(once.indexOf('id="z"'));
		expect(once).toContain(step === "shapes" ? '<path d="M10 20V30"/>' : '<line x1="10" x2="10" y1="20" y2="30"/>');
		expect(await minify(once)).toBe(once);
	});

	it("should start nothing when the script is required rather than run", () => {
		expect(installed).toHaveBeenCalledTimes(0);
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

	it("should compare opt-in SVG data removal without removing accessible text", async () => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg"><title>Keep</title><metadata>Optional</metadata><style>path { fill: #ff0000 }</style></svg>';
		const [tool] = toolsFor("minify", source).filter((tool) => tool.name === "webpack (SVG data removal)");
		const minify = await tool.create();
		const once = await minify(source);
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg"><title>Keep</title><style>path{fill:red}</style></svg>');
		expect(await minify(once)).toBe(once);
	});

	it("should compare namespace and empty-attribute cleanup with CSS rendering", async () => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:e="http://www.inkscape.org/namespaces/inkscape" e:label="editor"><metadata>Optional</metadata><g class="" style="/* empty */"/></svg>';
		const [tool] = toolsFor("minify", source).filter((tool) => tool.name === "webpack (SVG attribute cleanup)");
		const minify = await tool.create();
		const once = await minify(source);
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>');
		expect(await minify(once)).toBe(once);
	});

	it("should compare whitespace cleanup without changing SVG text spacing", async () => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg">\n <g> </g><text> A  <tspan> B </tspan> C </text>\n</svg>';
		const [tool] = toolsFor("minify", source).filter((tool) => tool.name === "webpack (SVG whitespace cleanup)");
		const minify = await tool.create();
		const once = await minify(source);
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg"><g/><text> A  <tspan> B </tspan> C </text></svg>');
		expect(await minify(once)).toBe(once);
	});

	it("should compare lossless geometry cleanup with embedded CSS rendering", async () => {
		const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0010.000 0020.000">\n<style>polygon { fill: #ff0000 }</style><polygon points="+001.00, 0002.000 003.000, 004.000"/>\n</svg>';
		const [tool] = toolsFor("minify", source).filter((tool) => tool.name === "webpack (SVG numeric cleanup)");
		const minify = await tool.create();
		const once = await minify(source);
		expect(once).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20"><style>polygon{fill:red}</style><polygon points="1 2 3 4"/></svg>');
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
		const tools = toolsFor("minify", "<svg/>").filter((tool) => tool.name === "svgo" || tool.name === "svgo (multipass)");
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

	 it("should preserve externally referenced sprite IDs in the separate comparison row", async () => {
		mockOptimize.mockClear();
		const tool = toolsFor("minify", "<svg/>").find((tool) => tool.name === "svgo (preserve IDs)");
		const minify = await /** @type {NonNullable<typeof tool>} */ (tool).create();
		expect(await minify("<svg/>")).toBe("<svg/>");
		expect(mockOptimize).toHaveBeenCalledWith("<svg/>", { multipass: true, plugins: [{ name: "preset-default", params: { overrides: { cleanupIds: false, removeHiddenElems: false } } }] });
		expect(toolsFor("minify", "<root/>").some((tool) => tool.name === "svgo (preserve IDs)")).toBe(false);
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
		expect(read).toContain(".st0{&amp;st0;}");
	});
});
