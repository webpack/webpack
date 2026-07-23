"use strict";

const ModuleGraph = require("../lib/ModuleGraph");
const CommonJsExportsParserPlugin = require("../lib/dependencies/CommonJsExportsParserPlugin");
const JavascriptParser = require("../lib/javascript/JavascriptParser");

describe("CommonJsExportsParserPlugin", () => {
	/**
	 * Parses CommonJS source with the plugin applied on the given backend.
	 * @param {string} code source
	 * @param {boolean} soaAst backend
	 * @returns {{ deps: string[], bailout: string[] }} observed effects
	 */
	const parse = (code, soaAst) => {
		const parser = new JavascriptParser("script", { soaAst });
		const moduleGraph = new ModuleGraph();
		new CommonJsExportsParserPlugin(moduleGraph).apply(parser);
		/** @type {string[]} */
		const deps = [];
		const module_ = /** @type {EXPECTED_ANY} */ ({
			buildMeta: {},
			buildInfo: {},
			addDependency: (/** @type {EXPECTED_ANY} */ d) =>
				deps.push(d.constructor.name),
			addPresentationalDependency: (/** @type {EXPECTED_ANY} */ d) =>
				deps.push(d.constructor.name)
		});
		parser.parse(
			code,
			/** @type {import("../lib/Parser").ParserState} */ (
				/** @type {unknown} */ ({ module: module_, source: code, options: {} })
			)
		);
		return {
			deps,
			bailout: /** @type {string[]} */ (
				moduleGraph.getOptimizationBailout(module_).map(String)
			)
		};
	};

	// the exported-function `this` scan descends through facade children
	// (prototype accessors) exactly like plain object nodes (#21178)
	it("should keep all exports on this access on both AST backends", () => {
		const code =
			"exports.a = function () { return this.b(); };\n" +
			"exports.unused = function () {};";
		const object = parse(code, false);
		const soa = parse(code, true);
		expect(soa.deps).toEqual(object.deps);
		expect(soa.deps).toContain("CommonJsSelfReferenceDependency");
		expect(soa.bailout).toEqual(object.bailout);
		expect(soa.bailout[0]).toMatch(/this in exported function/);
	});

	it("should not bail out without this access on both AST backends", () => {
		const code =
			"exports.a = function (arr) { return arr.map((x) => [x, { x }]); };";
		const object = parse(code, false);
		const soa = parse(code, true);
		expect(soa.deps).toEqual(object.deps);
		expect(soa.bailout).toEqual(object.bailout);
		expect(soa.bailout).toHaveLength(0);
	});

	// the `for` body ref lives in the aux column (the only 4-fixed-children
	// type), so the column scan must read it explicitly
	it("should find this inside a for body on both AST backends", () => {
		const code =
			"exports.a = function () { for (let i = 0; i < 2; i++) { this.b(); } };";
		const object = parse(code, false);
		const soa = parse(code, true);
		expect(soa.deps).toEqual(object.deps);
		expect(soa.bailout).toEqual(object.bailout);
		expect(soa.bailout[0]).toMatch(/this in exported function/);
	});

	// nested functions, class field values and static blocks bind their own
	// `this`; computed keys and heritage evaluate in the scanned scope
	it("should honor this-scope boundaries on both AST backends", () => {
		const shielded =
			"exports.a = function () { function inner() { this.b(); } " +
			"return class { m() { this.c(); } x = this.d; static { this.e(); } }; };";
		const object = parse(shielded, false);
		const soa = parse(shielded, true);
		expect(soa.bailout).toEqual(object.bailout);
		expect(soa.bailout).toHaveLength(0);
		const searched =
			"exports.a = function () { const k = 'p'; " +
			"return class X { [k + this.b] = 1; }; };";
		const object2 = parse(searched, false);
		const soa2 = parse(searched, true);
		expect(soa2.bailout).toEqual(object2.bailout);
		expect(soa2.bailout[0]).toMatch(/this in exported function/);
	});
});
