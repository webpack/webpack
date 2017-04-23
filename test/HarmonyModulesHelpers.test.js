/* globals describe, it, beforeEach */
"use strict";

const HarmonyModulesHelpers = require("../lib/dependencies/HarmonyModulesHelpers");

describe("HarmonyModulesHelpers", () => {

	describe("getModuleVar", () => {
		it("returns a module var without special characters", () => {
			expect(HarmonyModulesHelpers.getModuleVar({}, 'w*thspeci@lcharact#rs')).toEqual("__WEBPACK_IMPORTED_MODULE_0_w_thspeci_lcharact_rs__");
		});

		it("returns a module var without double underscore", () => {
			expect(HarmonyModulesHelpers.getModuleVar({}, 'without__double__underscore')).toEqual("__WEBPACK_IMPORTED_MODULE_0_without_double_underscore__");
		});

		it("returns a module var without spaces", () => {
			expect(HarmonyModulesHelpers.getModuleVar({}, '    without spaces')).toEqual("__WEBPACK_IMPORTED_MODULE_0__without_spaces__");
		});

		describe("when has harmonyModules information", () => {
			let request, state, harmonyModuleVarInformation;
			beforeEach(() => {
				request = 'requested module';
				state = {
					harmonyModules: ['sample test', request]
				};
				harmonyModuleVarInformation = HarmonyModulesHelpers.getModuleVar(state, request);
			});

			it("returns a module based on request position in state harmonyModules array", () => {
				expect(harmonyModuleVarInformation).toContain(1);
			});

			it("returns a module based on harmonyModules information", () => {
				expect(harmonyModuleVarInformation).toEqual("__WEBPACK_IMPORTED_MODULE_1_requested_module__");
			});
		});
	});

	describe("getNewModuleVar", () => {
		it("returns module var based on `getModuleVar` method", () => {
			const request = 'sample test';
			const state = {
				harmonyModules: []
			};
			expect(HarmonyModulesHelpers.getNewModuleVar(state, request)).toEqual('__WEBPACK_IMPORTED_MODULE_0_sample_test__');
		});

		it("returns null if has request information inside state harmonyModules", () => {
			const request = 'sample test';
			const state = {
				harmonyModules: [request]
			};
			expect(HarmonyModulesHelpers.getNewModuleVar(state, request)).toEqual(null);
		});
	});

	describe("checkModuleVar", () => {
		it("returns null if has current dependency and module dependency are different", () => {
			expect(HarmonyModulesHelpers.checkModuleVar({
				harmonyModules: ['sample test']
			}, 'other sample test')).toEqual(null);
		});

		it("returns null if has NOT request information inside state harmonyModules", () => {
			expect(HarmonyModulesHelpers.checkModuleVar({
				harmonyModules: []
			}, 'sample test')).toEqual(null);
		});

		it("returns module var based on `getModuleVar` method", () => {
			const request = 'sample test';
			const state = {
				harmonyModules: []
			};
			expect(HarmonyModulesHelpers.getNewModuleVar(state, request)).toEqual('__WEBPACK_IMPORTED_MODULE_0_sample_test__');
		});
	});

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
			expect(HarmonyModulesHelpers.isActive(module, currentDependency)).toEqual(true);
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
			expect(HarmonyModulesHelpers.isActive(module, currentDependency)).toEqual(false);
		});

		describe("getActiveExports", () => {
			it("returns an empty array with modules has no dependency", () => {
				const currentDependency = {
					describeHarmonyExport: () => {}
				};
				const module = {
					dependencies: []
				};
				expect(HarmonyModulesHelpers.getActiveExports(module, currentDependency)).toEqual([]);
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
				expect(HarmonyModulesHelpers.getActiveExports(module, currentDependency)).toEqual([]);
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
				expect(HarmonyModulesHelpers.getActiveExports(module, currentDependency)).toEqual(['first dependency']);
			});
		});

	});

});
