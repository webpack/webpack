"use strict";

const Dependency = require("../lib/Dependency");
const CssIcssExportDependency = require("../lib/dependencies/CssIcssExportDependency");

const { EXPORT_MODE, EXPORT_TYPE } = CssIcssExportDependency;

const makeModule = (convention = "as-is", localIdentName = "[local]") => ({
	generator: { options: { exportsConvention: convention, localIdentName } }
});

const makeModuleGraph = (
	/** @type {unknown} */ module,
	/** @type {unknown} */ exportsInfo = undefined
) =>
	/** @type {import("../lib/ModuleGraph")} */ (
		/** @type {unknown} */ ({
			getParentModule: () => module,
			getExportsInfo: () => exportsInfo
		})
	);

const entry = (
	/** @type {Partial<import("../lib/dependencies/CssIcssExportDependency").CssExportEntry>} */ over
) => ({
	name: "a",
	value: "a",
	range: undefined,
	interpolate: false,
	exportMode: EXPORT_MODE.REPLACE,
	exportType: EXPORT_TYPE.NORMAL,
	locStartLine: 0,
	locStartColumn: 0,
	locEndLine: 0,
	locEndColumn: 0,
	...over
});

describe("CssIcssExportDependency", () => {
	it("exposes its type", () => {
		expect(new CssIcssExportDependency([]).type).toBe("css :export");
	});

	describe("getExports", () => {
		it("lists exported names, skipping none/self-reference entries", () => {
			const dep = new CssIcssExportDependency([
				entry({ name: "keep" }),
				entry({ name: "none", exportMode: EXPORT_MODE.NONE }),
				entry({ name: "self", exportMode: EXPORT_MODE.SELF_REFERENCE })
			]);
			expect(dep.getExports(makeModuleGraph(makeModule()))).toEqual({
				exports: [{ name: "keep", canMangle: true }],
				dependencies: undefined
			});
		});

		it("returns undefined when nothing is exported", () => {
			const dep = new CssIcssExportDependency([
				entry({ exportMode: EXPORT_MODE.NONE })
			]);
			expect(dep.getExports(makeModuleGraph(makeModule()))).toBeUndefined();
		});
	});

	describe("getReferencedExports", () => {
		it("references only composed names when every entry self-references", () => {
			const dep = new CssIcssExportDependency([
				entry({
					value: "foo",
					exportMode: EXPORT_MODE.SELF_REFERENCE,
					exportType: EXPORT_TYPE.COMPOSES
				})
			]);
			expect(
				dep.getReferencedExports(makeModuleGraph(makeModule()), undefined)
			).toEqual([{ name: ["foo"], canMangle: true }]);
		});

		it("references the whole exports object when a normal entry is present", () => {
			const dep = new CssIcssExportDependency([
				entry({}),
				entry({
					value: "foo",
					exportMode: EXPORT_MODE.SELF_REFERENCE,
					exportType: EXPORT_TYPE.COMPOSES
				})
			]);
			expect(
				dep.getReferencedExports(makeModuleGraph(makeModule()), undefined)
			).toBe(Dependency.EXPORTS_OBJECT_REFERENCED);
		});

		it("references the whole exports object when there are no entries", () => {
			expect(
				new CssIcssExportDependency([]).getReferencedExports(
					makeModuleGraph(makeModule()),
					undefined
				)
			).toBe(Dependency.EXPORTS_OBJECT_REFERENCED);
		});
	});

	describe("getWarnings", () => {
		it("warns about a missing self-referenced name", () => {
			const dep = new CssIcssExportDependency([
				entry({
					value: "missing",
					exportMode: EXPORT_MODE.SELF_REFERENCE,
					exportType: EXPORT_TYPE.COMPOSES,
					locStartLine: 1,
					locStartColumn: 0,
					locEndLine: 1,
					locEndColumn: 7
				})
			]);
			const warnings =
				/** @type {NonNullable<ReturnType<typeof dep.getWarnings>>} */ (
					dep.getWarnings(
						makeModuleGraph(makeModule(), { isExportProvided: () => false })
					)
				);
			expect(warnings).toHaveLength(1);
			expect(warnings[0].message).toContain(
				'Self-referencing name "missing" not found'
			);
		});

		it("returns null when the self-referenced name is provided", () => {
			const dep = new CssIcssExportDependency([
				entry({
					value: "present",
					exportMode: EXPORT_MODE.SELF_REFERENCE,
					exportType: EXPORT_TYPE.COMPOSES
				})
			]);
			expect(
				dep.getWarnings(
					makeModuleGraph(makeModule(), { isExportProvided: () => true })
				)
			).toBeNull();
		});

		it("returns null when there are no self-reference entries", () => {
			const dep = new CssIcssExportDependency([entry({})]);
			expect(dep.getWarnings(makeModuleGraph(makeModule()))).toBeNull();
		});
	});

	it("memoizes its hash contribution", () => {
		const dep = new CssIcssExportDependency([entry({ range: [0, 1] })]);
		/** @type {string[]} */
		const updates = [];
		const context =
			/** @type {import("../lib/Dependency").UpdateHashContext} */ ({
				chunkGraph: { moduleGraph: makeModuleGraph(makeModule()) }
			});
		dep.updateHash(
			/** @type {import("../lib/util/Hash")} */ (
				/** @type {unknown} */ ({
					update: (/** @type {string} */ s) => updates.push(s)
				})
			),
			context
		);
		dep.updateHash(
			/** @type {import("../lib/util/Hash")} */ (
				/** @type {unknown} */ ({
					update: (/** @type {string} */ s) => updates.push(s)
				})
			),
			context
		);
		expect(updates).toHaveLength(2);
		expect(updates[0]).toContain("exportsConvention");
		expect(updates[1]).toBe(updates[0]);
	});

	it("round-trips through serialization", () => {
		const dep = new CssIcssExportDependency([
			entry({
				name: "a",
				value: "a",
				range: [0, 5],
				interpolate: true,
				exportMode: EXPORT_MODE.ONCE,
				exportType: EXPORT_TYPE.CUSTOM_VARIABLE,
				locStartLine: 1,
				locStartColumn: 2,
				locEndLine: 1,
				locEndColumn: 5
			}),
			entry({
				name: "b",
				value: ["loc", "imp", "./req"],
				exportMode: EXPORT_MODE.APPEND,
				exportType: EXPORT_TYPE.COMPOSES
			})
		]);
		/** @type {unknown[]} */
		const buffer = [];
		dep.serialize(
			/** @type {import("../lib/serialization/ObjectMiddleware").ObjectSerializerContext} */ (
				/** @type {unknown} */ ({
					write: (/** @type {unknown} */ v) => buffer.push(v)
				})
			)
		);
		let i = 0;
		const restored = new CssIcssExportDependency([]);
		restored.deserialize(
			/** @type {import("../lib/serialization/ObjectMiddleware").ObjectDeserializerContext} */ (
				/** @type {unknown} */ ({ read: () => buffer[i++] })
			)
		);
		expect(restored.entries).toHaveLength(2);
		expect(restored.entries[0].name).toBe("a");
		expect(restored.entries[0].range).toEqual([0, 5]);
		expect(restored.entries[0].interpolate).toBe(true);
		expect(restored.entries[0].exportMode).toBe(EXPORT_MODE.ONCE);
		expect(restored.entries[1].value).toEqual(["loc", "imp", "./req"]);
		expect(restored.entries[1].exportType).toBe(EXPORT_TYPE.COMPOSES);
	});
});
