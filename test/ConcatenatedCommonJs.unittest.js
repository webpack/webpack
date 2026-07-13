"use strict";

const ConcatenationScope = require("../lib/ConcatenationScope");
const {
	getConcatenatedExportAccess
} = require("../lib/dependencies/CommonJsDependencyHelpers");
const CommonJsExportsDependency = require("../lib/dependencies/CommonJsExportsDependency");
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
		new Map([[info.module, info]]),
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
		expect(scope._currentModule.exportMap.get("foo")).toBe(
			"__WEBPACK_CJS_EXPORT_foo__"
		);
	});
});

describe("concatenated CommonJS dependency templates", () => {
	const templateContext = (extra) => ({
		module: /** @type {EXPECTED_ANY} */ ({}),
		moduleGraph: /** @type {EXPECTED_ANY} */ ({
			getExportsInfo: () => ({ getUsedName: (names) => names })
		}),
		initFragments: [],
		runtimeRequirements: new Set(),
		runtime: undefined,
		concatenationScope: createScope(),
		...extra
	});

	it("should reject unexpected bases in CommonJsExportsDependency", () => {
		const dep = new CommonJsExportsDependency(
			[0, 1],
			null,
			"Object.defineProperty(exports)",
			["foo"]
		);
		const template = new CommonJsExportsDependency.Template();
		expect(() =>
			template.apply(dep, /** @type {EXPECTED_ANY} */ ({}), templateContext())
		).toThrow(/Unsupported base/);
	});

	it("should reject unexpected bases in CommonJsSelfReferenceDependency", () => {
		const dep = new CommonJsSelfReferenceDependency(
			[0, 1],
			"this",
			["foo"],
			false
		);
		const template = new CommonJsSelfReferenceDependency.Template();
		expect(() =>
			template.apply(dep, /** @type {EXPECTED_ANY} */ ({}), templateContext())
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
				buildInfo: {},
				dependencies: [],
				presentationalDependencies: [],
				...overrides
			}),
			/** @type {EXPECTED_ANY} */ ({})
		);

	it("should accept a module with static exports and no dependencies", () => {
		expect(bailoutFor({})).toBeUndefined();
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

	it("should reject self-references without names", () => {
		expect(
			bailoutFor({
				dependencies: [
					new CommonJsSelfReferenceDependency([0, 1], "exports", [], false)
				]
			})
		).toBe("Module uses exports as a value");
	});
});
