"use strict";

const { RawSource, ReplaceSource } = require("webpack-sources");
const RuntimeGlobals = require("../lib/RuntimeGlobals");
const CommonJsExportsDependency = require("../lib/dependencies/CommonJsExportsDependency");
const CommonJsRequireDependency = require("../lib/dependencies/CommonJsRequireDependency");
const CommonJsSelfReferenceDependency = require("../lib/dependencies/CommonJsSelfReferenceDependency");
const JavascriptGenerator = require("../lib/javascript/JavascriptGenerator");

describe("CommonJS dependency templates in a concatenation", () => {
	/**
	 * A concatenated CommonJS module renders inside the lazy wrapper, so these
	 * templates emit the same code they emit for a standalone module.
	 * @param {object} options options
	 * @param {string | string[] | false} options.used used name (as getUsedName would return)
	 * @param {string=} options.source source text the range covers
	 * @returns {EXPECTED_ANY} a template context over a mocked module
	 */
	const templateContext = ({ used, source = "exports.foo" }) => ({
		source: new ReplaceSource(new RawSource(source)),
		context: {
			module: /** @type {EXPECTED_ANY} */ ({
				exportsArgument: "__webpack_exports__",
				moduleArgument: "module"
			}),
			moduleGraph: /** @type {EXPECTED_ANY} */ ({
				getExportsInfo: () => ({ getUsedName: () => used })
			}),
			initFragments: [],
			runtimeRequirements: new Set(),
			runtime: undefined
		}
	});

	it("should rewrite a used export onto the exports object", () => {
		const dep = new CommonJsExportsDependency([0, 11], null, "exports", [
			"foo"
		]);
		const { source, context } = templateContext({ used: ["foo"] });
		new CommonJsExportsDependency.Template().apply(dep, source, context);
		expect(source.source()).toBe("__webpack_exports__.foo");
		expect(context.runtimeRequirements).toContain(RuntimeGlobals.exports);
	});

	it("should rewrite an unused export to a throwaway var", () => {
		const dep = new CommonJsExportsDependency([0, 11], null, "exports", [
			"foo"
		]);
		const { source, context } = templateContext({ used: false });
		new CommonJsExportsDependency.Template().apply(dep, source, context);
		expect(source.source()).toBe("__webpack_unused_export__");
		expect(context.initFragments[0].content).toBe(
			"var __webpack_unused_export__;\n"
		);
	});

	it("should rewrite a self-reference onto the exports object", () => {
		const dep = new CommonJsSelfReferenceDependency(
			[0, 11],
			"exports",
			["foo"],
			false
		);
		const { source, context } = templateContext({ used: ["foo"] });
		new CommonJsSelfReferenceDependency.Template().apply(dep, source, context);
		expect(source.source()).toBe("__webpack_exports__.foo");
	});

	it("should leave a `this` self-reference untouched", () => {
		const dep = new CommonJsSelfReferenceDependency(
			[0, 8],
			"this",
			["foo"],
			false
		);
		const { source, context } = templateContext({
			used: ["foo"],
			source: "this.foo"
		});
		new CommonJsSelfReferenceDependency.Template().apply(dep, source, context);
		expect(source.source()).toBe("this.foo");
		expect(context.runtimeRequirements).toContain(RuntimeGlobals.thisAsExports);
	});
});

describe("JavascriptGenerator CommonJS concatenation eligibility", () => {
	const generator = new JavascriptGenerator();

	/**
	 * @param {Partial<import("../lib/NormalModule")>} overrides module shape
	 * @returns {string | undefined} bailout reason
	 */
	const bailoutFor = (overrides) =>
		generator.getConcatenationBailoutReason(
			/** @type {EXPECTED_ANY} */ ({
				buildMeta: { exportsType: "default" },
				buildInfo: { strict: true },
				dependencies: [],
				presentationalDependencies: [],
				...overrides
			}),
			/** @type {EXPECTED_ANY} */ ({ concatenateCommonJsModules: true })
		);

	it("should accept a module with static exports and no dependencies", () => {
		expect(bailoutFor({})).toBeUndefined();
	});

	it("should accept every CommonJS exports type", () => {
		/** @type {(import("../types").BuildMeta)["exportsType"][]} */
		const exportsTypes = ["flagged", "default", "dynamic", undefined];
		for (const exportsType of exportsTypes) {
			expect(bailoutFor({ buildMeta: { exportsType } })).toBeUndefined();
		}
	});

	it("should accept an ECMAScript module", () => {
		expect(
			bailoutFor({ buildMeta: { exportsType: "namespace" } })
		).toBeUndefined();
	});

	it("should reject a sloppy-mode module", () => {
		expect(bailoutFor({ buildInfo: { strict: false } })).toBe(
			"Module is not in strict mode"
		);
	});

	// export shapes that cannot be scope-hoisted now render inside the lazy wrapper
	it("should accept exports assigned via any base", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsExportsDependency([0, 1], null, "this", ["foo"])
				]
			})
		).toBeUndefined();
	});

	it("should accept exports dependencies without names", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsExportsDependency([0, 1], null, "exports", [])
				]
			})
		).toBeUndefined();
	});

	it("should accept self-references of any shape", () => {
		for (const dep of [
			new CommonJsSelfReferenceDependency([0, 1], "this", ["foo"], false),
			new CommonJsSelfReferenceDependency([0, 1], "exports", [], false),
			new CommonJsSelfReferenceDependency([0, 1], "exports", ["f"], true)
		]) {
			expect(bailoutFor({ dependencies: [dep] })).toBeUndefined();
		}
	});

	it("should accept a module that both re-exports weirdly and requires", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsSelfReferenceDependency([0, 1], "exports", [], false),
					new CommonJsRequireDependency("./dep", [2, 3], undefined)
				]
			})
		).toBeUndefined();
	});

	it("should accept supported require dependencies", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsRequireDependency("./dep", [0, 1], undefined)
				]
			})
		).toBeUndefined();
	});

	it("should reject a presentational dependency that needs the module object", () => {
		expect(
			bailoutFor({
				presentationalDependencies: [
					/** @type {EXPECTED_ANY} */ ({
						runtimeRequirements: new Set([RuntimeGlobals.moduleId])
					})
				]
			})
		).toBe(`Module uses ${RuntimeGlobals.moduleId}`);
	});

	it("should ignore presentational dependencies without runtime requirements", () => {
		expect(
			bailoutFor({
				presentationalDependencies: [
					/** @type {EXPECTED_ANY} */ ({ runtimeRequirements: null })
				]
			})
		).toBeUndefined();
	});
});
