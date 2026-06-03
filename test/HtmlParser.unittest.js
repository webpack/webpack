"use strict";

// Inject a fake buildHtmlAst that, for the special sentinel source
// "MOCK_MULTI_TEXT_STYLE", returns an AST with two text children
// separated by a comment node inside a <style> element.  This
// exercises the span-selection fix that keeps contentStart fixed at
// the first text child and extends contentEnd to the last text child.
jest.mock("../lib/html/buildHtmlAst", () => {
	const actual = jest.requireActual("../lib/html/buildHtmlAst");
	const NS_HTML = actual.NS_HTML;

	// Source layout for "MOCK_MULTI_TEXT_STYLE":
	//   0-6   : <style>   (tagEnd = 7)
	//   7-9   : abc       (text child 1: start=7, end=10)
	//  10-19  : <!-- X --> (comment child: start=10, end=20)
	//  20-22  : def       (text child 2: start=20, end=23)
	//  23-30  : </style>
	const mockFn = jest.fn((source) => {
		if (source === "MOCK_MULTI_TEXT_STYLE") {
			return {
				type: "document",
				children: [
					{
						type: "element",
						tagName: "style",
						namespace: NS_HTML,
						attributes: [],
						children: [
							{ type: "text", data: "abc", start: 7, end: 10 },
							{ type: "comment", data: " X ", start: 10, end: 20 },
							{ type: "text", data: "def", start: 20, end: 23 }
						],
						selfClosing: false,
						start: 0,
						end: 7,
						tagEnd: 7,
						nameEnd: 6
					}
				]
			};
		}
		return actual(source);
	});
	Object.assign(mockFn, actual);
	return mockFn;
});

const HtmlInlineStyleDependency = require("../lib/dependencies/HtmlInlineStyleDependency");
const HtmlParser = require("../lib/html/HtmlParser");

describe("HtmlParser – inline <style> multi-text-node span", () => {
	// The source string whose character positions match the mock AST.
	// Positions: 0-6 = <style>, 7-9 = "abc", 10-19 = "<!-- X -->",
	//            20-22 = "def", 23-30 = </style>
	const SOURCE = "<style>abc<!-- X -->def</style>";

	let parser;
	let deps;
	let mockState;

	beforeEach(() => {
		parser = new HtmlParser({ experiments: { css: true } });

		deps = [];

		const mockModule = {
			resource: "/mock/page.html",
			addDependency: (dep) => {
				deps.push(dep);
			},
			addCodeGenerationDependency: () => {},
			addPresentationalDependency: () => {},
			buildInfo: {},
			buildMeta: {}
		};

		mockState = {
			module: mockModule,
			compilation: {
				outputOptions: { hashFunction: "md4", module: false },
				options: { experiments: { css: true } },
				compiler: { context: undefined }
			}
		};
	});

	it("should span from the first text child to the last when a <style> has multiple text children", () => {
		parser.parse(SOURCE, mockState);

		// There must be exactly one HtmlInlineStyleDependency (plus one
		// StaticExportsDependency added at the end of parse()).
		const styleDeps = deps.filter(
			(d) => d instanceof HtmlInlineStyleDependency
		);
		expect(styleDeps).toHaveLength(1);

		const dep = styleDeps[0];
		// range[0] must be the start of the FIRST text child (7), not
		// the start of the second (20) — the regression that the fix
		// targets.
		expect(dep.range[0]).toBe(7);
		// range[1] must reach the end of the LAST text child (23).
		expect(dep.range[1]).toBe(23);
	});
});
