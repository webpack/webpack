/* globals describe, it, beforeEach */
"use strict";

const should = require("should");
const HarmonyModulesHelpers = require("../lib/dependencies/HarmonyModulesHelpers");

describe("HarmonyModulesHelpers", () => {

	describe("isActive", () => {
		it("returns `true` if module has NOT dependencies", () => {
			const currentDependency = {
				describeHarmonyExport: () => {
					return {
						exportedName: '',
						precedence: 1
					};
				}
			};
			const module = {
				dependencies: []
			};
			should(HarmonyModulesHelpers.isActive(module, currentDependency)).be.eql(true);
		});

		it("returns `false` if module currentDependency has precedence greater than module dependency", () => {
			const currentDependency = {
				describeHarmonyExport: () => {
					return {
						exportedName: 'first dependency',
						precedence: 2
					};
				}
			};
			const module = {
				dependencies: [{
					describeHarmonyExport: () => {
						return {
							exportedName: 'first dependency',
							precedence: 1
						};
					}
				}]
			};
			should(HarmonyModulesHelpers.isActive(module, currentDependency)).be.eql(false);
		});

		describe("getActiveExports", () => {
			it("returns an empty array with modules has no dependency", () => {
				const currentDependency = {
					describeHarmonyExport: () => {}
				};
				const module = {
					dependencies: []
				};
				should(HarmonyModulesHelpers.getActiveExports(module, currentDependency)).be.eql([]);
			});

			it("returns an empty array if the precedence of current dependency is less than module dependency", () => {
				const currentDependency = {
					describeHarmonyExport: () => {
						return {
							exportedName: 'first dependency',
							precedence: 1
						};
					}
				};
				const module = {
					dependencies: [{
						describeHarmonyExport: () => {
							return {
								exportedName: 'first dependency',
								precedence: 2
							};
						}
					}]
				};
				should(HarmonyModulesHelpers.getActiveExports(module, currentDependency)).be.eql([]);
			});

			it("returns an array with modules if currentDependency has precedence greater than module dependency", () => {
				const currentDependency = {
					describeHarmonyExport: () => {
						return {
							exportedName: 'first dependency',
							precedence: 2
						};
					}
				};
				const module = {
					dependencies: [{
						describeHarmonyExport: () => {
							return {
								exportedName: 'first dependency',
								precedence: 1
							};
						}
					}]
				};
				should(HarmonyModulesHelpers.getActiveExports(module, currentDependency)).be.eql(['first dependency']);
			});
		});

	});

});
