"use strict";

const ESMExportImportedSpecifierDependency = require("../../lib/dependencies/esm/ESMExportImportedSpecifierDependency");
const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");
const webpack = require("../../");

const ESM_REQUEST =
	"webpack/lib/dependencies/esm/ESMExportImportedSpecifierDependency";
const RELEASED_REQUEST =
	"webpack/lib/dependencies/HarmonyExportImportedSpecifierDependency";

describe("DeprecatedAliases", () => {
	it("should export the ESM import dependency under both spellings", () => {
		const ESMImportDependency = webpack.dependencies.ESMImportDependency;
		expect(typeof ESMImportDependency).toBe("function");
		expect(ESMImportDependency.name).toBe("ESMImportDependency");
		// TODO in the next major release: drop the deprecated half
		expect(webpack.dependencies.HarmonyImportDependency).toBe(
			ESMImportDependency
		);
	});

	describe("the star exports list serializer", () => {
		const current = () =>
			ObjectMiddleware.getDeserializerFor(ESM_REQUEST, "ESMStarExportsList");

		it("should write under its current request and name", () => {
			const { ESMStarExportsList } = ESMExportImportedSpecifierDependency;
			const { request, name } = ObjectMiddleware.getSerializerFor(
				new ESMStarExportsList()
			);
			expect(request).toBe(ESM_REQUEST);
			expect(name).toBe("ESMStarExportsList");
		});

		it("should still read what the last release wrote", () => {
			// TODO in the next major release: remove with the legacy key itself
			expect(
				ObjectMiddleware.getDeserializerFor(
					RELEASED_REQUEST,
					"HarmonyStarExportsList"
				)
			).toBe(current());
		});

		// The ESM rename and the move into `esm/` are both unreleased, so no
		// published webpack wrote a pack under either intermediate key.
		for (const [request, name] of [
			[ESM_REQUEST, "HarmonyStarExportsList"],
			[
				"webpack/lib/dependencies/ESMExportImportedSpecifierDependency",
				"HarmonyStarExportsList"
			],
			[ESM_REQUEST, "NotAName"]
		]) {
			it(`should not read ${request} / ${name}`, () => {
				expect(() =>
					ObjectMiddleware.getDeserializerFor(request, name)
				).toThrow();
			});
		}
	});
});
