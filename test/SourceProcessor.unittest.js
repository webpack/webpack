"use strict";

const { SourceProcessor: CssSourceProcessor } = require("../lib/css/syntax");
const { SourceProcessor: HtmlSourceProcessor } = require("../lib/html/syntax");

// `mode` names the output a caller wants and `minimize: true` is shorthand for
// the `"minify"` one of them, so the two must resolve the same way in every
// language the processor is bound to — the resolution lives in the shared
// `SourceProcessor`, and only a language reading `minimize` itself could part
// them.
describe("SourceProcessor mode / minimize", () => {
	/** @typedef {{ mode?: "minify" | "beautify", minimize?: boolean }} PrintAsk */
	/** @type {[string, PrintAsk, "printed" | "none"][]} */
	const CASES = [
		["neither asks for printing", {}, "none"],
		["minimize: true prints", { minimize: true }, "printed"],
		["minimize: false does not", { minimize: false }, "none"],
		["mode: minify prints", { mode: "minify" }, "printed"],
		["mode: beautify prints", { mode: "beautify" }, "printed"],
		[
			"mode wins over a minimize that disagrees",
			{ mode: "beautify", minimize: true },
			"printed"
		],
		[
			"mode wins over a minimize that would switch printing off",
			{ mode: "minify", minimize: false },
			"printed"
		]
	];

	/** @type {[string, EXPECTED_ANY, string][]} */
	const LANGUAGES = [
		["css", CssSourceProcessor, "a {\n\tcolor : #ff0000 ;\n}\n"],
		["html", HtmlSourceProcessor, "<div   class='a'  >\n  <p>x</p>\n</div>\n"]
	];

	for (const [language, Processor, source] of LANGUAGES) {
		describe(language, () => {
			for (const [name, options, expected] of CASES) {
				it(name, () => {
					const result = new Processor().process(source, options);
					if (expected === "none") {
						expect(result).toBeUndefined();
						return;
					}
					expect(typeof result.code).toBe("string");
				});
			}

			it('reads `minimize: true` as exactly `mode: "minify"`', () => {
				expect(new Processor().process(source, { minimize: true }).code).toBe(
					new Processor().process(source, { mode: "minify" }).code
				);
			});

			it("lets `mode` decide when `minimize` disagrees", () => {
				const beautified = new Processor().process(source, {
					mode: "beautify"
				}).code;
				expect(
					new Processor().process(source, {
						mode: "beautify",
						minimize: true
					}).code
				).toBe(beautified);
				const minified = new Processor().process(source, {
					mode: "minify"
				}).code;
				expect(
					new Processor().process(source, {
						mode: "minify",
						minimize: false
					}).code
				).toBe(minified);
				expect(minified).not.toBe(beautified);
			});
		});
	}

	it("resolves the two options alike in css and html", () => {
		for (const [, options] of CASES) {
			const results = LANGUAGES.map(([, Processor, source]) => {
				const result = new Processor().process(source, options);
				return result === undefined ? "none" : "printed";
			});
			expect(results[0]).toBe(results[1]);
		}
	});
});
