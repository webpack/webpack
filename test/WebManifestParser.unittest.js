"use strict";

// `WebManifestParser` reuses acorn, so nothing is mocked beyond the module/state
// doubles: each case parses a real manifest and asserts the extracted URLs.
const WebManifestParser = require("../lib/asset/WebManifestParser");

/** @typedef {import("../lib/dependencies/HtmlSourceDependency")} HtmlSourceDependency */

/**
 * @returns {{ module: EXPECTED_ANY, dependencies: EXPECTED_OBJECT[] }} test doubles
 */
const makeModule = () => {
	/** @type {EXPECTED_OBJECT[]} */
	const dependencies = [];
	const module = {
		buildInfo: /** @type {Record<string, EXPECTED_ANY>} */ ({}),
		addDependency(/** @type {EXPECTED_OBJECT} */ dependency) {
			dependencies.push(dependency);
		},
		addCodeGenerationDependency() {}
	};
	return { module, dependencies };
};

/**
 * @param {EXPECTED_ANY} module module double
 * @param {boolean=} buildHttp whether experiments.buildHttp is enabled
 * @returns {import("../lib/Parser").ParserState} parser state
 */
const makeState = (module, buildHttp = false) =>
	/** @type {import("../lib/Parser").ParserState} */ (
		/** @type {unknown} */ ({
			module,
			options: { experiments: { buildHttp } }
		})
	);

/**
 * @param {string | Buffer} source manifest source
 * @param {boolean=} buildHttp whether experiments.buildHttp is enabled
 * @returns {{ urls: string[], module: EXPECTED_ANY }} extracted urls + module double
 */
const parse = (source, buildHttp = false) => {
	const { module, dependencies } = makeModule();
	new WebManifestParser().parse(source, makeState(module, buildHttp));
	return {
		urls: dependencies.map(
			(dep) => /** @type {HtmlSourceDependency} */ (dep).request
		),
		module
	};
};

describe("WebManifestParser", () => {
	it("extracts icon, screenshot and shortcut-icon URLs", () => {
		const { urls, module } = parse(
			JSON.stringify({
				name: "App",
				icons: [{ src: "./a.png" }, { src: "./b.png" }],
				screenshots: [{ src: "./s.png" }],
				shortcuts: [{ name: "Home", icons: [{ src: "./c.png" }] }]
			})
		);
		expect(urls).toEqual(["./a.png", "./b.png", "./s.png", "./c.png"]);
		expect(module.buildInfo.strict).toBe(true);
	});

	it("records the exact source range of each URL", () => {
		const source = '{"icons":[{"src":"./a.png"}]}';
		const { module, dependencies } = makeModule();
		new WebManifestParser().parse(source, makeState(module));
		const [start, end] = /** @type {HtmlSourceDependency} */ (dependencies[0])
			.range;
		expect(source.slice(start, end)).toBe("./a.png");
	});

	it("accepts a Buffer and strips a leading BOM", () => {
		const source = Buffer.from('\uFEFF{"icons":[{"src":"./a.png"}]}', "utf8");
		expect(parse(source).urls).toEqual(["./a.png"]);
	});

	it("accepts unquoted (identifier) keys", () => {
		expect(parse('{icons:[{src:"./a.png"}]}').urls).toEqual(["./a.png"]);
	});

	it("skips empty and fragment-only URLs", () => {
		expect(
			parse('{"icons":[{"src":""},{"src":"#a"},{"src":"./a.png"}]}').urls
		).toEqual(["./a.png"]);
	});

	it("ignores `src` outside an icon container", () => {
		expect(parse('{"src":"./nope.png","name":"App"}').urls).toEqual([]);
	});

	it("leaves absolute URLs external without buildHttp", () => {
		expect(parse('{"icons":[{"src":"https://cdn/x.png"}]}').urls).toEqual([]);
	});

	it("bundles absolute URLs when buildHttp is enabled", () => {
		expect(parse('{"icons":[{"src":"https://cdn/x.png"}]}', true).urls).toEqual(
			["https://cdn/x.png"]
		);
	});

	it("leaves invalid JSON untouched", () => {
		const { urls, module } = parse('{"icons": [not json}');
		expect(urls).toEqual([]);
		expect(module.buildInfo.strict).toBe(true);
	});

	it("throws on a preparsed AST", () => {
		const { module } = makeModule();
		expect(() =>
			new WebManifestParser().parse(
				/** @type {EXPECTED_ANY} */ ({}),
				makeState(module)
			)
		).toThrow("webpackAst is unexpected");
	});
});
