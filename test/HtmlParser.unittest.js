"use strict";

jest.mock("../lib/html/buildHtmlAst", () => {
	const actual = jest.requireActual("../lib/html/buildHtmlAst");
	const mockBuildHtmlAst = jest.fn((source) => {
		if (source === "<script>foobar</script>") {
			return {
				type: "document",
				children: [
					{
						type: "element",
						tagName: "script",
						namespace: 0,
						attributes: [],
						children: [
							{ type: "text", data: "foo", start: 8, end: 11 },
							{ type: "text", data: "bar", start: 11, end: 14 }
						],
						selfClosing: false,
						start: 0,
						end: 23,
						tagEnd: 8,
						nameEnd: 7
					}
				]
			};
		}
		return actual(source);
	});
	Object.assign(mockBuildHtmlAst, actual);
	return mockBuildHtmlAst;
});

const HtmlInlineScriptDependency = require("../lib/dependencies/HtmlInlineScriptDependency");
const HtmlParser = require("../lib/html/HtmlParser");

describe("HtmlParser", () => {
	it("should use the full span of all inline script text children", () => {
		const parser = new HtmlParser({});
		const presentationalDependencies = [];
		const dependencies = [];
		const module = {
			resource: "/tmp/workspace/webpack/webpack/test.html",
			buildInfo: {},
			buildMeta: {},
			addPresentationalDependency: (dependency) => {
				presentationalDependencies.push(dependency);
			},
			addDependency: (dependency) => {
				dependencies.push(dependency);
			},
			addWarning: jest.fn(),
			addError: jest.fn()
		};
		const state = {
			module,
			compilation: {
				outputOptions: {
					hashFunction: "xxhash64",
					module: false
				},
				compiler: {
					context: "/tmp/workspace/webpack/webpack"
				},
				options: {
					experiments: {
						css: false
					}
				}
			}
		};

		parser.parse("<script>foobar</script>", state);

		const inlineDependency = presentationalDependencies.find(
			(dependency) => dependency instanceof HtmlInlineScriptDependency
		);
		expect(inlineDependency).toBeDefined();
		expect(inlineDependency.request).toBe(
			"data:text/javascript;base64,Zm9vYmFy"
		);
		expect(inlineDependency.contentRange).toEqual([8, 14]);
		expect(module.buildInfo.htmlEntryScripts).toEqual({
			script: [
				{
					request: "data:text/javascript;base64,Zm9vYmFy",
					entryName: expect.any(String),
					type: "script"
				}
			],
			"script-module": [],
			modulepreload: [],
			stylesheet: []
		});
		expect(dependencies).toHaveLength(1);
	});
});
