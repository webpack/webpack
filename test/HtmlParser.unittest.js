"use strict";

const path = require("path");

jest.mock("../lib/html/walkHtmlTokens", () => ({ buildAst: jest.fn() }));

const HtmlInlineScriptDependency = require("../lib/dependencies/HtmlInlineScriptDependency");
const HtmlInlineStyleDependency = require("../lib/dependencies/HtmlInlineStyleDependency");
const HtmlParser = require("../lib/html/HtmlParser");
const walkHtmlTokens = require("../lib/html/walkHtmlTokens");

describe("HtmlParser", () => {
	it("should aggregate inline script content across all text children", () => {
		const source = "<script>const first = 1;\nconst second = 2;</script>";
		const firstText = "const first = 1;\n";
		const secondText = "const second = 2;";
		const firstStart = source.indexOf(firstText);
		const secondStart = source.indexOf(
			secondText,
			firstStart + firstText.length
		);
		const presentationalDependencies = [];
		const dependencies = [];
		const module = {
			resource: path.resolve(__dirname, "index.html"),
			buildInfo: {},
			buildMeta: {},
			identifier() {
				return this.resource;
			},
			addPresentationalDependency(dependency) {
				presentationalDependencies.push(dependency);
			},
			addDependency(dependency) {
				dependencies.push(dependency);
			}
		};

		walkHtmlTokens.buildAst.mockReturnValue({
			type: "document",
			children: [
				{
					type: "element",
					tagName: "script",
					namespace: 0,
					attributes: [],
					children: [
						{
							type: "text",
							data: firstText,
							start: firstStart,
							end: firstStart + firstText.length
						},
						{
							type: "text",
							data: secondText,
							start: secondStart,
							end: secondStart + secondText.length
						}
					],
					selfClosing: false,
					start: 0,
					end: source.length,
					tagEnd: source.indexOf(">") + 1,
					nameEnd: "<script".length
				}
			]
		});

		const parser = new HtmlParser({});
		parser.parse(source, {
			module,
			compilation: {
				outputOptions: {
					hashFunction: "md4",
					module: false
				},
				compiler: {
					context: path.resolve(__dirname, "..")
				},
				options: {
					experiments: {
						css: false
					}
				}
			}
		});

		expect(walkHtmlTokens.buildAst).toHaveBeenCalledWith(source);
		expect(dependencies).toHaveLength(1);
		expect(presentationalDependencies).toHaveLength(1);

		const dependency = presentationalDependencies[0];
		expect(dependency).toBeInstanceOf(HtmlInlineScriptDependency);
		expect(dependency.contentRange).toEqual([
			firstStart,
			secondStart + secondText.length
		]);
		expect(dependency.request).toBe(
			`data:text/javascript;base64,${Buffer.from(
				`${firstText}${secondText}`,
				"utf8"
			).toString("base64")}`
		);
		expect(module.buildInfo.htmlEntryScripts).toEqual({
			script: [
				{
					request: dependency.request,
					entryName: dependency.entryName,
					type: "script"
				}
			],
			"script-module": [],
			modulepreload: [],
			stylesheet: []
		});
	});

	it("should span from the first text child to the last when a <style> has multiple text children", () => {
		// Source layout: <style>(7)abc(10)<!-- X -->(20)def(23)</style>(31)
		const source = "<style>abc<!-- X -->def</style>";
		const firstText = "abc";
		const secondText = "def";
		const firstStart = source.indexOf(firstText); // 7
		const secondStart = source.indexOf(
			secondText,
			firstStart + firstText.length
		); // 20
		const dependencies = [];
		const module = {
			resource: path.resolve(__dirname, "index.html"),
			buildInfo: {},
			buildMeta: {},
			identifier() {
				return this.resource;
			},
			addPresentationalDependency() {},
			addDependency(dependency) {
				dependencies.push(dependency);
			},
			addCodeGenerationDependency() {}
		};

		walkHtmlTokens.buildAst.mockReturnValue({
			type: "document",
			children: [
				{
					type: "element",
					tagName: "style",
					namespace: 0,
					attributes: [],
					children: [
						{
							type: "text",
							data: firstText,
							start: firstStart,
							end: firstStart + firstText.length
						},
						{
							type: "comment",
							data: " X ",
							start: firstStart + firstText.length,
							end: secondStart
						},
						{
							type: "text",
							data: secondText,
							start: secondStart,
							end: secondStart + secondText.length
						}
					],
					selfClosing: false,
					start: 0,
					end: source.length,
					tagEnd: source.indexOf(">") + 1,
					nameEnd: "<style".length
				}
			]
		});

		const parser = new HtmlParser({});
		parser.parse(source, {
			module,
			compilation: {
				outputOptions: {
					hashFunction: "md4",
					module: false
				},
				compiler: {
					context: path.resolve(__dirname, "..")
				},
				options: {
					experiments: {
						css: true
					}
				}
			}
		});

		const styleDeps = dependencies.filter(
			(d) => d instanceof HtmlInlineStyleDependency
		);
		expect(styleDeps).toHaveLength(1);

		const dep = styleDeps[0];
		// range[0] must be the start of the FIRST text child (7), not
		// the start of the second (20) — the regression the fix targets.
		expect(dep.range[0]).toBe(firstStart);
		// range[1] must reach the end of the LAST text child.
		expect(dep.range[1]).toBe(secondStart + secondText.length);
	});
});
