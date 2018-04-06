/* globals describe, it, beforeEach */
"use strict";

const should = require("should");
const HarmonyExportImportedSpecifierDependency = require("../lib/dependencies/HarmonyExportImportedSpecifierDependency");

describe("HarmonyExportImportedSpecifierDependency", () => {
	describe("getHashValue", () => {
		it("should return empty string on missing module", () => {
			// see e.g. PR #4368
			var instance = new HarmonyExportImportedSpecifierDependency();
			should(instance.getHashValue(undefined)).be.eql("");
			should(instance.getHashValue(null)).be.eql("");
		});
	});
	describe("getContent", () => {
		describe("dynamic-reexport mode", () => {
			it("should generate proper content", () => {
				const instance = new HarmonyExportImportedSpecifierDependency();
				const dep = {
					activeExports: ["module.exports = 1 //?"],
					originModule: {
						exportsArgument: "ClassName"
					},
					_discoverActiveExportsFromOtherStartExports() {
						return [];
					},
					getMode() {
						return "dynamic-reexport";
					}
				};
				should(instance.getContent(dep)).to.eql("???");
			});
		});
	});
});
