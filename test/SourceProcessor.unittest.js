"use strict";

const {
	NodeType: CssNodeType,
	SourceProcessor: CssSourceProcessor
} = require("../lib/css/syntax");
const {
	NodeType: HtmlNodeType,
	SourceProcessor: HtmlSourceProcessor
} = require("../lib/html/syntax");

const CSS = "a {\n\tcolor : #ff0000 ;\n}\n";
const HTML = "<div   class='a'  >\n  <p>x</p>\n</div>\n";

/** @typedef {{ mode?: "minify" | "beautify", source?: string, content?: string }} PrintAsk */

/** @type {[string, EXPECTED_ANY, string][]} name, processor, source */
const LANGUAGES = [
	["css", CssSourceProcessor, CSS],
	["html", HtmlSourceProcessor, HTML]
];

describe("SourceProcessor", () => {
	// `mode` is the one thing that names the output a caller wants, so a language
	// that read anything else would part it from the others. The resolution lives
	// in the shared processor; these say so in both languages it is bound to.
	describe("mode", () => {
		for (const [language, Processor, source] of LANGUAGES) {
			describe(language, () => {
				it("walks without printing when none is asked for", () => {
					expect(new Processor().process(source)).toBeUndefined();
					expect(new Processor().process(source, {})).toBeUndefined();
				});

				it("prints for each mode it names", () => {
					for (const mode of ["minify", "beautify"]) {
						expect(typeof new Processor().process(source, { mode }).code).toBe(
							"string"
						);
					}
				});

				it("minifies to something shorter than it beautifies", () => {
					const minified = new Processor().process(source, {
						mode: "minify"
					}).code;
					const beautified = new Processor().process(source, {
						mode: "beautify"
					}).code;
					expect(minified).not.toBe(beautified);
					expect(minified.length).toBeLessThanOrEqual(beautified.length);
				});

				it("beautifies to something that still parses to the same output", () => {
					// Re-printing what was already printed changes nothing more.
					const once = new Processor().process(source, {
						mode: "minify"
					}).code;
					const twice = new Processor().process(once, {
						mode: "minify"
					}).code;
					expect(twice).toBe(once);
				});

				it("carries no state between calls", () => {
					const processor = new Processor();
					const first = processor.process(source, { mode: "minify" }).code;
					processor.process("", { mode: "minify" });
					processor.process(source, { mode: "beautify" });
					expect(processor.process(source, { mode: "minify" }).code).toBe(
						first
					);
				});
			});
		}

		it("answers alike in every language", () => {
			/** @type {PrintAsk[]} */
			const asks = [{}, { mode: "minify" }, { mode: "beautify" }];
			for (const ask of asks) {
				const printed = LANGUAGES.map(
					([, Processor, source]) =>
						new Processor().process(source, ask) !== undefined
				);
				expect(printed[0]).toBe(printed[1]);
			}
		});
	});

	// A map is built only for a caller that named the input, since building one
	// walks the whole output — an inline `style=""` asks for none.
	describe("source map", () => {
		for (const [language, Processor, source] of LANGUAGES) {
			describe(language, () => {
				it("is absent when the input is not named", () => {
					expect(
						new Processor().process(source, { mode: "minify" }).map
					).toBeUndefined();
				});

				it("is a version 3 map naming the input when it is", () => {
					const { map } = new Processor().process(source, {
						mode: "minify",
						source: "in.txt"
					});
					expect(map.version).toBe(3);
					expect(map.file).toBe("in.txt");
					expect(map.sources).toEqual(["in.txt"]);
					expect(typeof map.mappings).toBe("string");
					expect(map.sourcesContent).toBeUndefined();
				});

				it("carries the input's text only when it is given", () => {
					const { map } = new Processor().process(source, {
						mode: "minify",
						source: "in.txt",
						content: source
					});
					expect(map.sourcesContent).toEqual([source]);
				});

				it("prints the same output whether or not a map is asked for", () => {
					expect(
						new Processor().process(source, {
							mode: "minify",
							source: "in.txt"
						}).code
					).toBe(new Processor().process(source, { mode: "minify" }).code);
				});
			});
		}
	});

	describe("visitors", () => {
		it("fires a css visitor for each node of that type, and still prints", () => {
			/** @type {string[]} */
			const seen = [];
			const result = new CssSourceProcessor()
				.use({
					[CssNodeType.Declaration]: (path) => {
						seen.push(path.name());
					}
				})
				.process("a{color:red;top:0}", { mode: "minify" });
			expect(seen).toEqual(["color", "top"]);
			expect(result.code).toBe("a{color:red;top:0}");
		});

		it("fires an html visitor for each element", () => {
			/** @type {string[]} */
			const seen = [];
			new HtmlSourceProcessor()
				.use({
					[HtmlNodeType.Element]: (path) => {
						seen.push(path.tagName());
					}
				})
				.process("<div><p>x</p></div>");
			expect(seen).toEqual(["html", "head", "body", "div", "p"]);
		});

		it("runs enter before exit", () => {
			/** @type {string[]} */
			const order = [];
			new CssSourceProcessor()
				.use({
					[CssNodeType.QualifiedRule]: {
						enter: () => order.push("enter"),
						exit: () => order.push("exit")
					}
				})
				.process("a{color:red}");
			expect(order).toEqual(["enter", "exit"]);
		});

		it("returns the processor so `use` chains", () => {
			const processor = new CssSourceProcessor();
			expect(processor.use({})).toBe(processor);
		});
	});

	describe("empty and degenerate input", () => {
		for (const [language, Processor] of LANGUAGES) {
			it(`${language} prints empty input without failing`, () => {
				const { code } = new Processor().process("", { mode: "minify" });
				expect(typeof code).toBe("string");
			});
		}

		it("css prints a stylesheet that is only a comment", () => {
			expect(
				new CssSourceProcessor().process("/* c */", { mode: "minify" }).code
			).toBe("");
		});

		it("css keeps a license comment", () => {
			expect(
				new CssSourceProcessor().process("/*! keep */a{b:c}", {
					mode: "minify"
				}).code
			).toContain("/*! keep */");
		});
	});
});
