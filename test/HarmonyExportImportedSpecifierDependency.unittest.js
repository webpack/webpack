/* globals describe it */
"use strict";

const HarmonyExportImportedSpecifierDependency = require("../lib/dependencies/HarmonyExportImportedSpecifierDependency");

describe("HarmonyExportImportedSpecifierDependency", () => {
	describe("getHashValue", () => {
		it("should return empty string on missing module", () => {
			// see e.g. PR #4368
			var instance = new HarmonyExportImportedSpecifierDependency();
			expect(instance.getHashValue(undefined)).toBe("");
			expect(instance.getHashValue(null)).toBe("");
		});
	});
});
