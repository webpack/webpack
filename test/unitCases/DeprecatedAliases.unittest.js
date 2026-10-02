"use strict";

const ESMExportImportedSpecifierDependency = require("../../lib/dependencies/esm/ESMExportImportedSpecifierDependency");
const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");
const webpack = require("../../");

const ESM_REQUEST =
	"webpack/lib/dependencies/esm/ESMExportImportedSpecifierDependency";

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
		it("should write under its current request and name", () => {
			const { ESMStarExportsList } = ESMExportImportedSpecifierDependency;
			const { request, name } = ObjectMiddleware.getSerializerFor(
				new ESMStarExportsList()
			);
			expect(request).toBe(ESM_REQUEST);
			expect(name).toBe("ESMStarExportsList");
		});

		// TODO in the next major release: remove, these keys read cache packs
		// written before the move and before the rename
		const legacy = [
			[ESM_REQUEST, "HarmonyStarExportsList"],
			[
				"webpack/lib/dependencies/ESMExportImportedSpecifierDependency",
				"HarmonyStarExportsList"
			],
			[
				"webpack/lib/dependencies/HarmonyExportImportedSpecifierDependency",
				"HarmonyStarExportsList"
			]
		];

		for (const [request, name] of legacy) {
			it(`should still read ${request} / ${name}`, () => {
				expect(ObjectMiddleware.getDeserializerFor(request, name)).toBe(
					ObjectMiddleware.getDeserializerFor(ESM_REQUEST, "ESMStarExportsList")
				);
			});
		}

		it("should not read a request and name it was never written under", () => {
			expect(() =>
				ObjectMiddleware.getDeserializerFor(ESM_REQUEST, "NotAName")
			).toThrow();
		});
	});
});
