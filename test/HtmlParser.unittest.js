"use strict";

const path = require("node:path");

// `HtmlParser` builds the AST inside `SourceProcessor.process`, so nothing is
// mocked: each case parses real HTML and asserts the extracted dependencies.
const HtmlInlineScriptDependency = require("../lib/dependencies/HtmlInlineScriptDependency");
const HtmlInlineStyleDependency = require("../lib/dependencies/HtmlInlineStyleDependency");
const HtmlSourceDependency = require("../lib/dependencies/HtmlSourceDependency");
const CommentCompilationWarning = require("../lib/errors/CommentCompilationWarning");
const UnsupportedFeatureWarning = require("../lib/errors/UnsupportedFeatureWarning");
const HtmlParser = require("../lib/html/HtmlParser");

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
		expect(module.buildInfo.htmlEntries).toEqual({
			script: [
				{
					request: dependency.request,
					entryName: dependency.entryName,
					type: "script"
				}
			],
			"script-module": [],
			modulepreload: [],
			stylesheet: [],
			html: [],
			preload: [],
			prefetch: []
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

		new HtmlParser({}).parse(source, makeState(module));

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toBeInstanceOf(CommentCompilationWarning);
	});

	it("warns when webpackIgnore is not a boolean", () => {
		const source = "<!-- webpackIgnore: 5 -->";
		const { module, warnings } = makeModule();

		new HtmlParser({}).parse(source, makeState(module));

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toBeInstanceOf(UnsupportedFeatureWarning);
	});

	it("does not emit a dependency for a whitespace-only inline <style>", () => {
		const source = "<style>   </style>";
		const { module, dependencies } = makeModule();

		new HtmlParser({}).parse(source, makeState(module, { css: true }));

		expect(
			dependencies.filter((d) => d instanceof HtmlInlineStyleDependency)
		).toHaveLength(0);
	});

	it("accepts a Buffer source and strips a leading BOM", () => {
		const range = (/** @type {string | Buffer} */ src) => {
			const { module, dependencies } = makeModule();
			new HtmlParser({}).parse(src, makeState(module));
			const dep = dependencies.find((d) => d instanceof HtmlSourceDependency);
			return /** @type {EXPECTED_ANY} */ (dep).range;
		};

		// A Buffer source parses like the equivalent string.
		expect(range(Buffer.from("<img src=a.png>"))).toEqual(
			range("<img src=a.png>")
		);
		// A leading BOM is stripped, so offsets align with the un-prefixed source.
		expect(range("﻿<img src=a.png>")).toEqual(range("<img src=a.png>"));
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

		new HtmlParser({}).parse(source, makeState(module));
		expect(warnings).toHaveLength(0);
	});

	it("does not emit a dependency for an empty inline <style>", () => {
		const source = "<style></style>";
		const { module, dependencies } = makeModule();

		new HtmlParser({}).parse(source, makeState(module, { css: true }));

		expect(
			dependencies.filter((d) => d instanceof HtmlInlineStyleDependency)
		).toHaveLength(0);
	});

	it.each([
		["<script type='module' src='a.js'></script>"],
		["<script type=module src=b.js></script>"]
	])(
		"drops a single-quoted/unquoted type=module for classic output (%s)",
		(source) => {
			const { module, presentationalDependencies } = makeModule();

			new HtmlParser({}).parse(source, makeState(module));

			// A presentational ConstDependency is added to remove `type="module"`.
			expect(presentationalDependencies.length).toBeGreaterThan(0);
		}
	);

	describe("source extraction", () => {
		/**
		 * @param {string} source html
		 * @returns {string[]} the requests of the emitted HtmlSourceDependency-s
		 */
		const sourceRequests = (source) => {
			const { module, dependencies } = makeModule();
			new HtmlParser({}).parse(source, makeState(module));
			return dependencies
				.filter((d) => d instanceof HtmlSourceDependency)
				.map((d) => /** @type {EXPECTED_ANY} */ (d).request);
		};

		it("extracts external url() in SVG presentation attributes, skipping local/empty", () => {
			expect(
				sourceRequests(
					'<svg><rect fill="url(./g.svg#x)" clip-path="url(#local)" stroke="url(\'./g.svg#y\')" mask="url()"/></svg>'
				)
			).toEqual(["./g.svg#x", "./g.svg#y"]);
		});

		it("ignores SVG presentation attributes that are valueless or carry no url()", () => {
			// `fill="red"` has no url(); `stroke` is valueless — both are skipped.
			expect(sourceRequests('<svg><rect fill="red" stroke/></svg>')).toEqual(
				[]
			);
		});

		it("maps offsets through entities in an SVG presentation url()", () => {
			expect(
				sourceRequests('<svg><rect fill="url(./a&amp;b.svg#z)"/></svg>')
			).toEqual(["./a&b.svg#z"]);
		});

		it("extracts SVG paint-server / reference element href values", () => {
			expect(
				sourceRequests(
					'<svg><linearGradient href="./d.svg#g"/><filter xlink:href="./d.svg#f"/></svg>'
				)
			).toEqual(["./d.svg#g", "./d.svg#f"]);
		});

		it("extracts legacy and obsolete source attributes, skipping a non-ref <param>", () => {
			const requests = sourceRequests(
				'<link rel="image_src" href="./i.png"><meta name="thumbnail" content="./t.png">' +
					'<object classid="./c.bin"><param valuetype="ref" value="./p.bin"><param value="./skip"></object>' +
					'<applet code="./a.class" object="./o.ser"></applet><math><mglyph src="./m.png"/></math>'
			);
			expect(requests).toEqual(
				expect.arrayContaining([
					"./i.png",
					"./t.png",
					"./c.bin",
					"./p.bin",
					"./a.class",
					"./o.ser",
					"./m.png"
				])
			);
			expect(requests).toHaveLength(7);
			expect(requests).not.toContain("./skip");
		});
	});
});
