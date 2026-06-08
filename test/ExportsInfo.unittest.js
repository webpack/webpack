"use strict";

const ExportsInfo = require("../lib/ExportsInfo");
const {
	InlinedUsedName,
	InlinedValue
} = require("../lib/optimize/InlineExports");

const { UsageState } = ExportsInfo;

/**
 * Adds an export to an exports info and configures its state.
 * @param {ExportsInfo} exportsInfo parent exports info
 * @param {string} name export name
 * @param {object} options options
 * @param {boolean | null=} options.provided provided flag
 * @param {number=} options.used usage state (global)
 * @param {string | InlinedUsedName=} options.usedName mangled/inlined used name
 * @returns {import("../lib/ExportsInfo").ExportInfo} the created export info
 */
const addExport = (exportsInfo, name, { provided, used, usedName } = {}) => {
	const info = exportsInfo.getExportInfo(name);
	if (provided !== undefined) info.provided = provided;
	if (used !== undefined) info.setUsed(used, undefined);
	if (usedName !== undefined) info.setUsedName(usedName);
	return info;
};

/**
 * Builds a nested exports info tree exercising mangled names, passthrough,
 * unused/not-provided exports, fully-used objects, OnlyPropertiesUsed descent
 * (obj.b, obj.deep.c) and an inlined constant (obj.deep.lit = 42).
 * @returns {ExportsInfo} the configured root exports info
 */
const buildTree = () => {
	const root = new ExportsInfo();
	root.setHasProvideInfo();

	addExport(root, "a", {
		provided: true,
		used: UsageState.Used,
		usedName: "A"
	});
	addExport(root, "p", { provided: true, used: UsageState.Used });
	addExport(root, "unused", { provided: true, used: UsageState.Unused });
	addExport(root, "notProvided", { provided: false, used: UsageState.Used });

	const whole = addExport(root, "whole", {
		provided: true,
		used: UsageState.Used
	});
	const wholeNested = whole.createNestedExportsInfo();
	addExport(wholeNested, "w", { provided: true, used: UsageState.Used });

	const obj = addExport(root, "obj", {
		provided: true,
		used: UsageState.OnlyPropertiesUsed
	});
	const objNested = obj.createNestedExportsInfo();
	addExport(objNested, "b", {
		provided: true,
		used: UsageState.Used,
		usedName: "B"
	});
	const deep = addExport(objNested, "deep", {
		provided: true,
		used: UsageState.OnlyPropertiesUsed
	});
	const deepNested = deep.createNestedExportsInfo();
	addExport(deepNested, "c", {
		provided: true,
		used: UsageState.Used,
		usedName: "C"
	});
	addExport(deepNested, "lit", {
		provided: true,
		used: UsageState.Used,
		usedName: new InlinedUsedName(new InlinedValue("number", 42))
	});

	root.setHasUseInfo();
	return root;
};

describe("ExportsInfo", () => {
	/** @type {ExportsInfo} */
	let root;

	beforeEach(() => {
		root = buildTree();
	});

	describe("getUsedName", () => {
		it("resolves the mangled name for a string key", () => {
			expect(root.getUsedName("a", undefined)).toBe("A");
		});

		it("resolves a single-element path", () => {
			expect(root.getUsedName(["a"], undefined)).toEqual(["A"]);
		});

		it("returns the input array unchanged when the name passes through", () => {
			const name = ["p"];
			// passthrough export keeps its original name → input array is reused
			expect(root.getUsedName(name, undefined)).toBe(name);
		});

		it("returns the otherExports usage for the empty path when used", () => {
			const name = [];
			expect(root.getUsedName(name, undefined)).toBe(name);
		});

		it("returns false for the empty path when nothing is used", () => {
			const empty = new ExportsInfo();
			empty.setHasUseInfo();
			expect(empty.getUsedName([], undefined)).toBe(false);
		});

		it("descends through OnlyPropertiesUsed exports", () => {
			expect(root.getUsedName(["obj", "b"], undefined)).toEqual(["obj", "B"]);
		});

		it("descends through multiple nested levels", () => {
			expect(root.getUsedName(["obj", "deep", "c"], undefined)).toEqual([
				"obj",
				"deep",
				"C"
			]);
		});

		it("returns false when any segment is unused", () => {
			expect(root.getUsedName(["unused"], undefined)).toBe(false);
		});

		it("keeps trailing ids unchanged when the parent is fully used", () => {
			expect(root.getUsedName(["whole", "w"], undefined)).toEqual([
				"whole",
				"w"
			]);
		});

		it("keeps trailing ids unchanged on a leaf without nested info", () => {
			expect(root.getUsedName(["a", "sub"], undefined)).toEqual(["A", "sub"]);
		});

		it("returns the inlined value when the final segment is inlined", () => {
			const result = root.getUsedName(["obj", "deep", "lit"], undefined);
			expect(result).toBeInstanceOf(InlinedUsedName);
			expect(/** @type {InlinedUsedName} */ (result).value.value).toBe(42);
			expect(/** @type {InlinedUsedName} */ (result).suffix).toEqual([]);
		});

		it("appends trailing ids to the inlined suffix", () => {
			const result = root.getUsedName(
				["obj", "deep", "lit", "x", "y"],
				undefined
			);
			expect(result).toBeInstanceOf(InlinedUsedName);
			expect(/** @type {InlinedUsedName} */ (result).value.value).toBe(42);
			expect(/** @type {InlinedUsedName} */ (result).suffix).toEqual([
				"x",
				"y"
			]);
		});
	});

	describe("getUsed", () => {
		it("returns the state for a string key", () => {
			expect(root.getUsed("a", undefined)).toBe(UsageState.Used);
		});

		it("returns the otherExports state for the empty path", () => {
			expect(root.getUsed([], undefined)).toBe(UsageState.Unused);
		});

		it("walks a nested path", () => {
			expect(root.getUsed(["obj", "b"], undefined)).toBe(UsageState.Used);
		});

		it("walks a deeply nested path", () => {
			expect(root.getUsed(["obj", "deep", "c"], undefined)).toBe(
				UsageState.Used
			);
		});

		it("returns Unused for an unknown nested export", () => {
			expect(root.getUsed(["obj", "missing"], undefined)).toBe(
				UsageState.Unused
			);
		});
	});

	describe("isExportProvided", () => {
		it("reports a provided string key", () => {
			expect(root.isExportProvided("a")).toBe(true);
		});

		it("reports a not-provided string key", () => {
			expect(root.isExportProvided("notProvided")).toBe(false);
		});

		it("reports an unknown string key as not provided", () => {
			expect(root.isExportProvided("missing")).toBe(false);
		});

		it("reports a provided nested key", () => {
			expect(root.isExportProvided(["obj", "b"])).toBe(true);
		});

		it("reports a provided deeply nested key", () => {
			expect(root.isExportProvided(["obj", "deep", "c"])).toBe(true);
		});

		it("returns undefined when descending past a provided leaf", () => {
			// `a` is provided but has no nested info, so deeper provision is unknown
			expect(root.isExportProvided(["a", "x"])).toBeUndefined();
		});
	});

	describe("getNestedExportsInfo", () => {
		it("returns itself for an undefined name", () => {
			expect(root.getNestedExportsInfo()).toBe(root);
		});

		it("returns the nested exports info for a single key", () => {
			const nested = root.getNestedExportsInfo(["obj"]);
			expect(nested).toBeInstanceOf(ExportsInfo);
			expect(nested.getUsed(["b"], undefined)).toBe(UsageState.Used);
		});

		it("returns the nested exports info for a deep key", () => {
			const nested = root.getNestedExportsInfo(["obj", "deep"]);
			expect(nested).toBeInstanceOf(ExportsInfo);
			expect(nested.getUsed(["c"], undefined)).toBe(UsageState.Used);
		});

		it("returns undefined for a leaf without nested info", () => {
			expect(root.getNestedExportsInfo(["a"])).toBeUndefined();
		});

		it("returns undefined for an unknown nested key", () => {
			expect(root.getNestedExportsInfo(["obj", "missing"])).toBeUndefined();
		});
	});

	describe("getReadOnlyExportInfoRecursive", () => {
		it("returns the export info for a single key", () => {
			const info = root.getReadOnlyExportInfoRecursive(["a"]);
			expect(info.name).toBe("a");
		});

		it("returns the export info for a deep key", () => {
			const info = root.getReadOnlyExportInfoRecursive(["obj", "deep", "c"]);
			expect(info.name).toBe("c");
		});

		it("returns undefined when descending past a leaf", () => {
			expect(root.getReadOnlyExportInfoRecursive(["a", "x"])).toBeUndefined();
		});

		it("returns undefined for an unknown nested key", () => {
			expect(
				root.getReadOnlyExportInfoRecursive(["obj", "missing", "x"])
			).toBeUndefined();
		});
	});

	describe("runtime-specific usage", () => {
		/** @type {ExportsInfo} */
		let ei;

		beforeEach(() => {
			ei = new ExportsInfo();
			ei.setHasProvideInfo();
			const x = addExport(ei, "x", { provided: true });
			const xNested = x.createNestedExportsInfo();
			addExport(xNested, "y", { provided: true });
			ei.setHasUseInfo();
			x.setUsedName("X");
			x.setUsed(UsageState.OnlyPropertiesUsed, "r1");
			/** @type {import("../lib/ExportsInfo").ExportInfo} */
			(xNested.getExportInfo("y")).setUsedName("Y");
			/** @type {import("../lib/ExportsInfo").ExportInfo} */
			(xNested.getExportInfo("y")).setUsed(UsageState.Used, "r1");
		});

		it("resolves used names for the active runtime", () => {
			expect(ei.getUsedName(["x", "y"], "r1")).toEqual(["X", "Y"]);
		});

		it("returns false for an inactive runtime", () => {
			expect(ei.getUsedName(["x", "y"], "r2")).toBe(false);
		});

		it("reports usage state per runtime", () => {
			expect(ei.getUsed(["x", "y"], "r1")).toBe(UsageState.Used);
			expect(ei.getUsed(["x", "y"], "r2")).toBe(UsageState.Unused);
		});
	});
});
