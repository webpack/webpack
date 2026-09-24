"use strict";

const installed = jest.fn(() => Promise.resolve("xml-tool-comparison"));

// A real install would `npm ci` the corpus into a contributor's cache, and
// nothing here reads it: the built fixtures are the ones under test.
jest.mock("../../tooling/compare-tools-harness", () => ({
	...jest.requireActual("../../tooling/compare-tools-harness"),
	installPackages: installed
}));

const {
	ATOM_FEED,
	EDITOR_SVG,
	MAVEN_POM,
	XLIFF,
	canonical
} = require("../../tooling/compare-xml-tools");
const { SourceProcessor } = require("../../lib/html/syntax");

describe("the XML tool comparison", () => {
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

	it("should expand what the DTD declares, but not inside a CDATA section", () => {
		const read = canonical(EDITOR_SVG);
		expect(read).toContain('xmlns="http://www.w3.org/2000/svg"');
		expect(read).toContain(".st0{&amp;st0;}");
	});
});
