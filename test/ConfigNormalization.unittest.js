"use strict";

require("./helpers/warmup-webpack");

const { getNormalizedWebpackOptions } = require("../lib/config/normalization");

/**
 * @param {EXPECTED_ANY} performance the performance config to normalize
 * @returns {EXPECTED_ANY} the normalized performance options
 */
const normalize = (performance) =>
	getNormalizedWebpackOptions({ performance }).performance;

describe("ConfigNormalization", () => {
	describe("renamed performance checks", () => {
		const renamed = [
			["embeddedSourceMaps", "sourceMaps"],
			["entrypointOverlap", "duplicateModules"],
			["unusedAliases", "unusedConfig"],
			["unusedDefines", "unusedConfig"],
			["unusedExternals", "unusedConfig"],
			["unusedReexports", "unusedModules"],
			["unusedRules", "unusedConfig"]
		];

		it.each(renamed)("maps %s onto %s", (from, to) => {
			expect(normalize({ [from]: true })[to]).toBe(true);
			expect(normalize({ [from]: false })[to]).toBe(false);
		});

		it.each(renamed)("stops carrying %s itself", (from) => {
			expect(normalize({ [from]: true })[from]).toBeUndefined();
		});

		it("lets the name this config writes win", () => {
			expect(
				normalize({ unusedRules: true, unusedConfig: false }).unusedConfig
			).toBe(false);
			expect(
				normalize({ unusedRules: false, unusedConfig: true }).unusedConfig
			).toBe(true);
		});

		it("takes a true from any deprecated name of one group", () => {
			expect(
				normalize({ unusedAliases: false, unusedRules: true }).unusedConfig
			).toBe(true);
			expect(
				normalize({ unusedRules: true, unusedAliases: false }).unusedConfig
			).toBe(true);
		});

		it("leaves a config naming none of them alone", () => {
			expect(normalize({ unusedConfig: true }).unusedConfig).toBe(true);
			expect(normalize({}).unusedConfig).toBeUndefined();
		});

		it("keeps performance false", () => {
			expect(normalize(false)).toBe(false);
		});
	});
});
