"use strict";

const path = require("path");

jest.mock("../lib/html/buildHtmlAst", () => jest.fn());

const HtmlInlineScriptDependency = require("../lib/dependencies/HtmlInlineScriptDependency");
const HtmlParser = require("../lib/html/HtmlParser");
const buildHtmlAst = require("../lib/html/buildHtmlAst");

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

		buildHtmlAst.mockReturnValue({
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

		expect(buildHtmlAst).toHaveBeenCalledWith(source);
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
});
