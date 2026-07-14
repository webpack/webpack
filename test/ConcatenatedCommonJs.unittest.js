"use strict";

const { RawSource, ReplaceSource } = require("webpack-sources");
const ConcatenationScope = require("../lib/ConcatenationScope");
const RuntimeGlobals = require("../lib/RuntimeGlobals");
const {
	getConcatenatedExportAccess
} = require("../lib/dependencies/CommonJsDependencyHelpers");
const CommonJsExportsDependency = require("../lib/dependencies/CommonJsExportsDependency");
const CommonJsRequireDependency = require("../lib/dependencies/CommonJsRequireDependency");
const CommonJsSelfReferenceDependency = require("../lib/dependencies/CommonJsSelfReferenceDependency");
const JavascriptGenerator = require("../lib/javascript/JavascriptGenerator");

/**
 * @returns {import("../lib/ConcatenationScope")} a concatenation scope over a single module info
 */
const createScope = () => {
	const info = {
		module: {},
		index: 0,
		exportMap: undefined,
		rawExportMap: undefined
	};
	return new ConcatenationScope(
		/** @type {EXPECTED_ANY} */ (new Map([[info.module, info]])),
		/** @type {EXPECTED_ANY} */ (info),
		new Set()
	);
};

describe("getConcatenatedExportAccess", () => {
	it("should use the export name directly for identifier names", () => {
		const scope = createScope();
		/** @type {import("../lib/InitFragment")<EXPECTED_ANY>[]} */
		const initFragments = [];
		const access = getConcatenatedExportAccess(scope, initFragments, ["foo"]);
		expect(access).toBe("__WEBPACK_CJS_EXPORT_foo__");
		expect(initFragments).toHaveLength(1);
		expect(initFragments[0].content).toBe("var __WEBPACK_CJS_EXPORT_foo__;\n");
	});

	it("should append the remaining member chain", () => {
		const scope = createScope();
		const access = getConcatenatedExportAccess(scope, [], ["foo", "bar"]);
		expect(access).toBe("__WEBPACK_CJS_EXPORT_foo__.bar");
	});

	it("should disambiguate non-identifier export names with a hex suffix", () => {
		const scope = createScope();
		const dashed = getConcatenatedExportAccess(scope, [], ["a-b"]);
		const underscored = getConcatenatedExportAccess(scope, [], ["a_b"]);
		expect(dashed).toMatch(/^__WEBPACK_CJS_EXPORT_a_b_[\da-f]+__$/);
		expect(underscored).toBe("__WEBPACK_CJS_EXPORT_a_b__");
		expect(dashed).not.toBe(underscored);
	});

	it("should register the export symbol in the concatenation scope", () => {
		const scope = createScope();
		getConcatenatedExportAccess(scope, [], ["foo"]);
		expect(
			/** @type {Map<string, string>} */ (scope._currentModule.exportMap).get(
				"foo"
			)
		).toBe("__WEBPACK_CJS_EXPORT_foo__");
	});
});

describe("concatenated CommonJS dependency templates", () => {
	/**
	 * @param {object} options options
	 * @param {string | string[] | false} options.used used name (as getUsedName would return)
	 * @param {string=} options.source source text the range covers
	 * @returns {EXPECTED_ANY} a template context over a fresh concatenation scope
	 */
	const templateContext = ({ used, source = "exports.foo" }) => ({
		source: new ReplaceSource(new RawSource(source)),
		context: {
			module: /** @type {EXPECTED_ANY} */ ({}),
			moduleGraph: /** @type {EXPECTED_ANY} */ ({
				getExportsInfo: () => ({ getUsedName: () => used })
			}),
			initFragments: [],
			runtimeRequirements: new Set(),
			runtime: undefined,
			concatenationScope: createScope()
		}
	});

	it("should rewrite a used export to a hoisted symbol", () => {
		const dep = new CommonJsExportsDependency([0, 11], null, "exports", [
			"foo"
		]);
		const { source, context } = templateContext({ used: ["foo"] });
		new CommonJsExportsDependency.Template().apply(dep, source, context);
		expect(source.source()).toBe("__WEBPACK_CJS_EXPORT_foo__");
		expect(context.initFragments).toHaveLength(1);
	});

	it("should rewrite an unused concatenated export to a throwaway var", () => {
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

	it("should reject unexpected bases in CommonJsExportsDependency", () => {
		const dep = new CommonJsExportsDependency(
			[0, 11],
			null,
			"Object.defineProperty(exports)",
			["foo"]
		);
		const { source, context } = templateContext({ used: ["foo"] });
		expect(() =>
			new CommonJsExportsDependency.Template().apply(dep, source, context)
		).toThrow(/Unsupported base/);
	});

	it("should rewrite a self-reference to a hoisted symbol", () => {
		const dep = new CommonJsSelfReferenceDependency(
			[0, 11],
			"exports",
			["foo"],
			false
		);
		const { source, context } = templateContext({ used: ["foo"] });
		new CommonJsSelfReferenceDependency.Template().apply(dep, source, context);
		expect(source.source()).toBe("__WEBPACK_CJS_EXPORT_foo__");
	});

	it("should reject unexpected bases in CommonJsSelfReferenceDependency", () => {
		const dep = new CommonJsSelfReferenceDependency(
			[0, 11],
			"this",
			["foo"],
			false
		);
		const { source, context } = templateContext({ used: ["foo"] });
		expect(() =>
			new CommonJsSelfReferenceDependency.Template().apply(dep, source, context)
		).toThrow(/Unsupported self-reference/);
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

	it("should reject a non-ESM exports type", () => {
		expect(bailoutFor({ buildMeta: { exportsType: "dynamic" } })).toBe(
			"Module is not an ECMAScript module"
		);
	});

	it("should reject a sloppy-mode module", () => {
		expect(bailoutFor({ buildInfo: { strict: false } })).toBe(
			"Module is not in strict mode"
		);
	});

	it("should reject exports assigned via an unsupported base", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsExportsDependency([0, 1], null, "this", ["foo"])
				]
			})
		).toBe("Module uses this to define exports");
	});

	it("should reject exports dependencies without names", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsExportsDependency([0, 1], null, "exports", [])
				]
			})
		).toBe("Module exports are used in an unsupported way");
	});

	it("should reject self-references via an unsupported base", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsSelfReferenceDependency([0, 1], "this", ["foo"], false)
				]
			})
		).toBe("Module references its exports via this");
	});

	it("should reject self-references without names", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsSelfReferenceDependency([0, 1], "exports", [], false)
				]
			})
		).toBe("Module uses exports as a value");
	});

	it("should reject a self-reference used as call context", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsSelfReferenceDependency([0, 1], "exports", ["f"], true)
				]
			})
		).toBe("Module calls exports.f with its exports as call context");
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

	it("should reject an unsupported dependency type", () => {
		expect(
			bailoutFor({
				dependencies: [/** @type {EXPECTED_ANY} */ ({ type: "weird dep" })]
			})
		).toBe("Module uses an unsupported dependency (weird dep)");
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
