"use strict";

const path = require("path");

jest.mock("../lib/html/syntax", () => ({
	...jest.requireActual("../lib/html/syntax"),
	buildHtmlAst: jest.fn()
}));

/** @typedef {import("../lib/html/syntax")["buildHtmlAst"] & { mockReturnValue: (val: EXPECTED_ANY) => void }} MockedBuildHtmlAst */

const HtmlInlineScriptDependency = require("../lib/dependencies/HtmlInlineScriptDependency");
const HtmlInlineStyleDependency = require("../lib/dependencies/HtmlInlineStyleDependency");
const CommentCompilationWarning = require("../lib/errors/CommentCompilationWarning");
const UnsupportedFeatureWarning = require("../lib/errors/UnsupportedFeatureWarning");
const HtmlParser = require("../lib/html/HtmlParser");
const buildHtmlAst = /** @type {MockedBuildHtmlAst} */ (
	require("../lib/html/syntax").buildHtmlAst
);
const { NodeType } = require("../lib/html/syntax");

/**
 * @returns {{ module: EXPECTED_ANY, presentationalDependencies: EXPECTED_OBJECT[], dependencies: EXPECTED_OBJECT[], warnings: EXPECTED_OBJECT[], errors: EXPECTED_OBJECT[] }} test doubles
 */
const makeModule = () => {
	/** @type {EXPECTED_OBJECT[]} */
	const presentationalDependencies = [];
	/** @type {EXPECTED_OBJECT[]} */
	const dependencies = [];
	/** @type {EXPECTED_OBJECT[]} */
	const warnings = [];
	/** @type {EXPECTED_OBJECT[]} */
	const errors = [];
	const module = {
		resource: path.resolve(__dirname, "index.html"),
		buildInfo: /** @type {Record<string, EXPECTED_ANY>} */ ({}),
		buildMeta: {},
		identifier() {
			return this.resource;
		},
		addPresentationalDependency(/** @type {EXPECTED_OBJECT} */ dependency) {
			presentationalDependencies.push(dependency);
		},
		addDependency(/** @type {EXPECTED_OBJECT} */ dependency) {
			dependencies.push(dependency);
		},
		addCodeGenerationDependency() {},
		addWarning(/** @type {EXPECTED_OBJECT} */ warning) {
			warnings.push(warning);
		},
		addError(/** @type {EXPECTED_OBJECT} */ error) {
			errors.push(error);
		}
	};
	return { module, presentationalDependencies, dependencies, warnings, errors };
};

/**
 * @param {EXPECTED_ANY} module module double
 * @param {{ outputModule?: boolean, css?: boolean }=} options options
 * @returns {import("../lib/Parser").ParserState} parser state
 */
const makeState = (module, { outputModule = false, css = false } = {}) =>
	/** @type {import("../lib/Parser").ParserState} */ (
		/** @type {unknown} */ ({
			module,
			compilation: {
				outputOptions: { hashFunction: "md4", module: outputModule },
				compiler: { context: path.resolve(__dirname, "..") },
				options: { experiments: { css } }
			}
		})
	);

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
		/** @type {EXPECTED_OBJECT[]} */
		const presentationalDependencies = [];
		/** @type {EXPECTED_OBJECT[]} */
		const dependencies = [];
		const module = /** @type {EXPECTED_ANY} */ ({
			resource: path.resolve(__dirname, "index.html"),
			buildInfo: /** @type {Record<string, EXPECTED_ANY>} */ ({}),
			buildMeta: {},
			identifier() {
				return this.resource;
			},
			addPresentationalDependency(/** @type {EXPECTED_OBJECT} */ dependency) {
				presentationalDependencies.push(dependency);
			},
			addDependency(/** @type {EXPECTED_OBJECT} */ dependency) {
				dependencies.push(dependency);
			}
		});

		buildHtmlAst.mockReturnValue({
			type: NodeType.Document,
			children: [
				{
					type: NodeType.Element,
					tagName: "script",
					namespace: 0,
					attributes: [],
					children: [
						{
							type: NodeType.Text,
							data: firstText,
							start: firstStart,
							end: firstStart + firstText.length
						},
						{
							type: NodeType.Text,
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
		parser.parse(
			source,
			/** @type {import("../lib/Parser").ParserState} */ (
				/** @type {unknown} */ ({
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
				})
			)
		);

		expect(buildHtmlAst).toHaveBeenCalledWith(source);
		expect(dependencies).toHaveLength(1);
		expect(presentationalDependencies).toHaveLength(1);

		const dependency = /** @type {EXPECTED_ANY} */ (
			presentationalDependencies[0]
		);
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
		/** @type {EXPECTED_OBJECT[]} */
		const dependencies = [];
		const module = /** @type {EXPECTED_ANY} */ ({
			resource: path.resolve(__dirname, "index.html"),
			buildInfo: {},
			buildMeta: {},
			identifier() {
				return this.resource;
			},
			addPresentationalDependency() {},
			addDependency(/** @type {EXPECTED_OBJECT} */ dependency) {
				dependencies.push(dependency);
			},
			addCodeGenerationDependency() {}
		});

		buildHtmlAst.mockReturnValue({
			type: NodeType.Document,
			children: [
				{
					type: NodeType.Element,
					tagName: "style",
					namespace: 0,
					attributes: [],
					children: [
						{
							type: NodeType.Text,
							data: firstText,
							start: firstStart,
							end: firstStart + firstText.length
						},
						{
							type: NodeType.Comment,
							data: " X ",
							start: firstStart + firstText.length,
							end: secondStart
						},
						{
							type: NodeType.Text,
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
		parser.parse(
			source,
			/** @type {import("../lib/Parser").ParserState} */ (
				/** @type {unknown} */ ({
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
				})
			)
		);

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

	describe("applyTemplate", () => {
		/**
		 * @returns {EXPECTED_ANY} module double with dependency sets + diagnostics
		 */
		const templateModule = () => {
			/** @type {EXPECTED_OBJECT[]} */
			const warnings = [];
			/** @type {EXPECTED_OBJECT[]} */
			const errors = [];
			return {
				resource: path.resolve(__dirname, "index.html"),
				buildInfo: /** @type {Record<string, EXPECTED_ANY>} */ ({
					fileDependencies: new Set(),
					contextDependencies: new Set(),
					missingDependencies: new Set()
				}),
				addWarning(/** @type {EXPECTED_OBJECT} */ warning) {
					warnings.push(warning);
				},
				addError(/** @type {EXPECTED_OBJECT} */ error) {
					errors.push(error);
				},
				warnings,
				errors
			};
		};

		it("is a no-op without a template option", () => {
			const parser = new HtmlParser({});
			expect(parser.applyTemplate("<p>x</p>", templateModule())).toBe(
				"<p>x</p>"
			);
		});

		it("exposes working dependency and diagnostic callbacks", () => {
			const module = templateModule();
			const parser = new HtmlParser({
				template: (source, ctx) => {
					ctx.addDependency("/dep");
					ctx.addContextDependency("/ctx");
					ctx.addMissingDependency("/missing");
					ctx.addBuildDependency("/build");
					ctx.emitWarning("warn-string");
					ctx.emitWarning(new Error("warn-error"));
					ctx.emitError("error-string");
					ctx.emitError(new Error("error-error"));
					return `${source}!`;
				}
			});

			const out = parser.applyTemplate("<p>", module);

			expect(out).toBe("<p>!");
			expect([...module.buildInfo.fileDependencies]).toContain("/dep");
			expect([...module.buildInfo.contextDependencies]).toContain("/ctx");
			expect([...module.buildInfo.missingDependencies]).toContain("/missing");
			// addBuildDependency lazily creates the LazySet.
			expect(module.buildInfo.buildDependencies).toBeDefined();
			expect([...module.buildInfo.buildDependencies]).toContain("/build");
			// Both string and Error arguments are wrapped/passed through.
			expect(module.warnings).toHaveLength(2);
			expect(module.errors).toHaveLength(2);
		});

		it("throws when the template does not return a string", () => {
			const parser = new HtmlParser({
				template: () => /** @type {EXPECTED_ANY} */ (42)
			});
			expect(() => parser.applyTemplate("<p>", templateModule())).toThrow(
				"must return a string"
			);
		});
	});

	it("warns on a malformed webpackIgnore magic comment", () => {
		const source = "<!-- webpackIgnore: ) -->";
		const { module, warnings } = makeModule();
		buildHtmlAst.mockReturnValue({
			type: NodeType.Document,
			children: [
				{
					type: NodeType.Comment,
					data: " webpackIgnore: ) ",
					start: 0,
					end: source.length
				}
			]
		});

		new HtmlParser({}).parse(source, makeState(module));

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toBeInstanceOf(CommentCompilationWarning);
	});

	it("warns when webpackIgnore is not a boolean", () => {
		const source = "<!-- webpackIgnore: 5 -->";
		const { module, warnings } = makeModule();
		buildHtmlAst.mockReturnValue({
			type: NodeType.Document,
			children: [
				{
					type: NodeType.Comment,
					data: " webpackIgnore: 5 ",
					start: 0,
					end: source.length
				}
			]
		});

		new HtmlParser({}).parse(source, makeState(module));

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toBeInstanceOf(UnsupportedFeatureWarning);
	});

	it("does not emit a dependency for a whitespace-only inline <style>", () => {
		const source = "<style>   </style>";
		const { module, dependencies } = makeModule();
		buildHtmlAst.mockReturnValue({
			type: NodeType.Document,
			children: [
				{
					type: NodeType.Element,
					tagName: "style",
					namespace: 0,
					attributes: [],
					children: [{ type: NodeType.Text, data: "   ", start: 7, end: 10 }],
					selfClosing: false,
					start: 0,
					end: source.length,
					tagEnd: 7,
					nameEnd: "<style".length
				}
			]
		});

		new HtmlParser({}).parse(source, makeState(module, { css: true }));

		expect(
			dependencies.filter((d) => d instanceof HtmlInlineStyleDependency)
		).toHaveLength(0);
	});

	it("accepts a Buffer source and strips a leading BOM", () => {
		const { module } = makeModule();
		buildHtmlAst.mockReturnValue({
			type: NodeType.Document,
			children: []
		});

		new HtmlParser({}).parse(Buffer.from("<div></div>"), makeState(module));
		expect(buildHtmlAst).toHaveBeenCalledWith("<div></div>");

		new HtmlParser({}).parse("﻿<div></div>", makeState(module));
		expect(buildHtmlAst).toHaveBeenLastCalledWith("<div></div>");
	});

	it("throws when given a preparsed (object) source", () => {
		const { module } = makeModule();
		expect(() =>
			new HtmlParser({}).parse(
				/** @type {EXPECTED_ANY} */ ({}),
				makeState(module)
			)
		).toThrow("webpackAst is unexpected");
	});

	it("ignores a magic comment that has no webpackIgnore key", () => {
		const source = "<!-- webpackPreload: true -->";
		const { module, warnings } = makeModule();
		buildHtmlAst.mockReturnValue({
			type: NodeType.Document,
			children: [
				{
					type: NodeType.Comment,
					data: " webpackPreload: true ",
					start: 0,
					end: source.length
				}
			]
		});

		new HtmlParser({}).parse(source, makeState(module));
		expect(warnings).toHaveLength(0);
	});

	it("does not emit a dependency for an empty inline <style>", () => {
		const source = "<style></style>";
		const { module, dependencies } = makeModule();
		buildHtmlAst.mockReturnValue({
			type: NodeType.Document,
			children: [
				{
					type: NodeType.Element,
					tagName: "style",
					namespace: 0,
					attributes: [],
					children: [],
					selfClosing: false,
					start: 0,
					end: source.length,
					tagEnd: 7,
					nameEnd: "<style".length
				}
			]
		});

		new HtmlParser({}).parse(source, makeState(module, { css: true }));

		expect(
			dependencies.filter((d) => d instanceof HtmlInlineStyleDependency)
		).toHaveLength(0);
	});

	// Build a `<script type=… src=…>` AST element with offsets derived from the
	// source so reconcileScriptTypeAttr sees the real attribute spans.
	const scriptWithType = (/** @type {string} */ source) => {
		/**
		 * @param {string} name attribute name
		 * @returns {EXPECTED_ANY} attribute
		 */
		const attr = (name) => {
			const nameStart = source.indexOf(`${name}=`);
			const nameEnd = nameStart + name.length;
			const afterEq = nameEnd + 1;
			const quote = source[afterEq] === '"' || source[afterEq] === "'";
			const valueStart = quote ? afterEq + 1 : afterEq;
			const end = source.indexOf(quote ? source[afterEq] : " ", valueStart);
			const valueEnd = end === -1 ? source.indexOf(">") : end;
			return {
				name,
				value: source.slice(valueStart, valueEnd),
				nameStart,
				nameEnd,
				valueStart,
				valueEnd
			};
		};
		return {
			type: NodeType.Document,
			children: [
				{
					type: NodeType.Element,
					tagName: "script",
					namespace: 0,
					attributes: [attr("type"), attr("src")],
					children: [],
					selfClosing: false,
					start: 0,
					end: source.length,
					tagEnd: source.indexOf(">") + 1,
					nameEnd: "<script".length
				}
			]
		};
	};

	it.each([
		["<script type='module' src='a.js'></script>"],
		["<script type=module src=b.js></script>"]
	])(
		"drops a single-quoted/unquoted type=module for classic output (%s)",
		(source) => {
			const { module, presentationalDependencies } = makeModule();
			buildHtmlAst.mockReturnValue(scriptWithType(source));

			new HtmlParser({}).parse(source, makeState(module));

			// A presentational ConstDependency is added to remove `type="module"`.
			expect(presentationalDependencies.length).toBeGreaterThan(0);
		}
	);
});
