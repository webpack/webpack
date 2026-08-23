"use strict";

// The reader that `ConfigTestCases` holds every build's generated code with.
// Its version ladder is derived from `lib/config/target.js`, so what is checked
// here is that the derivation answers the way the presets say it should, and
// that each shape of violation is reported once, by name.

const { getTargetProperties } = require("../lib/config/target");
const {
	ES_VERSIONS,
	checkEcmaConformance,
	ecmaVersionOf,
	reportEcmaConformance
} = require("./helpers/ecmaConformance");

/**
 * @param {string} target a webpack target
 * @returns {EXPECTED_ANY} the environment that target implies
 */
const environmentOf = (target) => getTargetProperties(target, __dirname);

/**
 * @param {string} code generated JavaScript
 * @param {string} target the target it was generated for
 * @param {"script" | "module"=} sourceType how the target loads it
 * @returns {string[]} violations
 */
const check = (code, target, sourceType) =>
	checkEcmaConformance({
		code,
		environment: environmentOf(target),
		sourceType
	});

describe("ecmaVersionOf", () => {
	it("should walk the ladder webpack's own esX preset defines", () => {
		expect(ES_VERSIONS).toEqual([2022, 2021, 2020, 2018, 2017, 2015, 5]);
	});

	for (const [target, version] of [
		["es5", 5],
		["es2015", 2015],
		["es2017", 2017],
		["es2018", 2018],
		["es2020", 2020],
		["es2022", 2022]
	]) {
		it(`should read ${target} back as ES${version}`, () => {
			expect(ecmaVersionOf(environmentOf(/** @type {string} */ (target)))).toBe(
				version
			);
		});
	}

	it("should ignore library capabilities", () => {
		// `globalThis` is a binding, not a grammar tier — losing it must not make
		// optional chaining unreadable.
		expect(
			ecmaVersionOf({ ...environmentOf("es2022"), globalThis: false })
		).toBe(2022);
	});

	it("should ignore what a target can lack at any version", () => {
		// electron 10 parses class fields and still cannot load an ES module.
		expect(ecmaVersionOf(environmentOf("electron10-main"))).toBe(2022);
	});

	it("should answer nothing for an environment that is no version", () => {
		// One flag off is one feature missing, not a target that also lost arrow
		// functions.
		expect(
			ecmaVersionOf({ ...environmentOf("es2022"), templateLiteral: false })
		).toBeUndefined();
	});
});

describe("checkEcmaConformance", () => {
	it("should pass code within its environment", () => {
		expect(check("var a = 1;", "es5")).toEqual([]);
		expect(check("const a = () => 1;", "es2015")).toEqual([]);
		expect(check("a ||= b;", "es2022")).toEqual([]);
	});

	for (const [flag, code] of [
		["arrowFunction", "var f = function () { return function () {}; };"],
		["const", "const a = 1;"],
		["let", "let a = 1;"],
		["templateLiteral", "var a = `x`;"],
		["forOf", "for (var x of y) {}"],
		["generator", "function* g() { yield 1; }"],
		["destructuring", "var { a } = b;"],
		["spread", "f(...a);"],
		["methodShorthand", "var o = { m() {} };"],
		["asyncFunction", "async function f() { await x; }"],
		["optionalChaining", "a?.b;"],
		["logicalAssignment", "a ||= b;"],
		["bigIntLiteral", "var a = 1n;"],
		["dynamicImport", "import('./x');"]
	]) {
		it(`should name output.environment.${flag}`, () => {
			// The arrow entry above is deliberately arrow-free; every other one is
			// the construct itself.
			const source =
				flag === "arrowFunction"
					? "var f = () => 1;"
					: /** @type {string} */ (code);
			expect(check(source, "es5").join("\n")).toContain(
				`needs output.environment.${flag}`
			);
		});
	}

	it("should name output.environment.module for ESM syntax", () => {
		expect(check("export var a = 1;", "es5", "module").join("\n")).toContain(
			"needs output.environment.module"
		);
		expect(
			check("var u = import.meta.url;", "es5", "module").join("\n")
		).toContain("needs output.environment.module");
	});

	it("should not read new.target as ESM syntax", () => {
		// The other meta property: es2015 grammar, nothing to do with modules.
		expect(check("function f() { return new.target; }", "es2015")).toEqual([]);
	});

	it("should catch syntax carrying no flag of its own", () => {
		expect(check("class A {}", "es5")).toEqual([
			expect.stringContaining("not ES5")
		]);
		expect(check("var a = b ?? c;", "es2018")).toEqual([
			expect.stringContaining("not ES2018")
		]);
	});

	it("should hold unflagged syntax to nothing when the environment is no version", () => {
		// Nothing to hold it to: the only contract left is the flags themselves.
		const environment = { ...environmentOf("es2022"), templateLiteral: false };
		expect(checkEcmaConformance({ code: "class A {}", environment })).toEqual(
			[]
		);
		expect(
			checkEcmaConformance({ code: "var a = `x`;", environment }).join("\n")
		).toContain("needs output.environment.templateLiteral");
	});

	it("should report a flag rather than the version it also outran", () => {
		// One line, one finding: the flag names the cause, so the version parse
		// must not repeat it.
		expect(check("var f = () => 1;", "es5")).toHaveLength(1);
	});

	it("should report code no parser accepts", () => {
		expect(check("var =;", "es2022")).toEqual([
			expect.stringContaining("does not parse at all")
		]);
	});

	it("should read an export of a name declared elsewhere in the bundle", () => {
		// A runtime module is a fragment, so `__webpack_require__` is declared in
		// another one.
		expect(
			check("export { __webpack_require__ };", "es2022", "module")
		).toEqual([]);
	});
});

describe("reportEcmaConformance", () => {
	const arrowInEs5 = {
		code: "var f = () => 1;",
		environment: environmentOf("es5"),
		name: "SomeRuntimeModule"
	};

	it("should say nothing when everything conforms", () => {
		expect(
			reportEcmaConformance([
				{ code: "var a = 1;", environment: environmentOf("es5"), name: "ok" }
			])
		).toBeUndefined();
	});

	it("should name the subject and the violation", () => {
		const report = /** @type {string} */ (reportEcmaConformance([arrowInEs5]));
		expect(report).toContain("SomeRuntimeModule");
		expect(report).toContain("output.environment.arrowFunction");
	});

	it("should stay quiet about async the build already warned on", () => {
		const asyncInEs5 = {
			code: "var f = async function () {};",
			environment: environmentOf("es5"),
			name: "AsyncWrapper"
		};
		expect(reportEcmaConformance([asyncInEs5])).toContain(
			"output.environment.asyncFunction"
		);
		expect(
			reportEcmaConformance([{ ...asyncInEs5, asyncWarned: true }])
		).toBeUndefined();
		// The exemption is that one warning's, not a pass for the rest.
		expect(
			reportEcmaConformance([{ ...arrowInEs5, asyncWarned: true }])
		).toContain("output.environment.arrowFunction");
	});

	it("should accept a finding the case declares deliberate", () => {
		expect(
			reportEcmaConformance([arrowInEs5], [/needs output\.environment\.arrow/])
		).toBeUndefined();
	});

	it("should reject a declaration that no longer matches anything", () => {
		const report = /** @type {string} */ (
			reportEcmaConformance([], [/needs output\.environment\.arrow/])
		);
		expect(report).toContain("matches nothing any more");
	});
});
