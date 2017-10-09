/* globals describe, it, beforeEach */
"use strict";

const should = require("should");
const HarmonyModulesHelpers = require("../lib/dependencies/HarmonyModulesHelpers");

describe("HarmonyModulesHelpers", () => {

	describe("getModuleVar", () => {
		it("returns a module var without special characters", () => {
			should(HarmonyModulesHelpers.getModuleVar({}, 'w*thspeci@lcharact#rs')).be.eql("__WEBPACK_IMPORTED_MODULE_0_w_thspeci_lcharact_rs__");
		});

		it("returns a module var without double underscore", () => {
			should(HarmonyModulesHelpers.getModuleVar({}, 'without__double__underscore')).be.eql("__WEBPACK_IMPORTED_MODULE_0_without_double_underscore__");
		});

		it("returns a module var without spaces", () => {
			should(HarmonyModulesHelpers.getModuleVar({}, '    without spaces')).be.eql("__WEBPACK_IMPORTED_MODULE_0__without_spaces__");
		});

		describe("when has harmonyModules information", () => {
			let request, state, harmonyModuleVarInformation;
			before(() => {
				request = 'requested module';
				state = {
					harmonyModules: ['sample test', request]
				};
				harmonyModuleVarInformation = HarmonyModulesHelpers.getModuleVar(state, request);
			});

			it("returns a module based on request position in state harmonyModules array", () => {
				should(harmonyModuleVarInformation).be.containEql(1);
			});

			it("returns a module based on harmonyModules information", () => {
				should(harmonyModuleVarInformation).be.eql("__WEBPACK_IMPORTED_MODULE_1_requested_module__");
			});
		});
	});

	describe("getNewModuleVar", () => {
		it("returns module var based on `getModuleVar` method", () => {
			const request = 'sample test';
			const state = {
				harmonyModules: []
			};
			should(HarmonyModulesHelpers.getNewModuleVar(state, request)).be.eql('__WEBPACK_IMPORTED_MODULE_0_sample_test__');
		});

		it("returns null if has request information inside state harmonyModules", () => {
			const request = 'sample test';
			const state = {
				harmonyModules: [request]
			};
			should(HarmonyModulesHelpers.getNewModuleVar(state, request)).be.eql(null);
		});
	});

	describe("checkModuleVar", () => {
		it("returns null if has current dependency and module dependency are different", () => {
			should(HarmonyModulesHelpers.checkModuleVar({
				harmonyModules: ['sample test']
			}, 'other sample test')).be.eql(null);
		});

		it("returns null if has NOT request information inside state harmonyModules", () => {
			should(HarmonyModulesHelpers.checkModuleVar({
				harmonyModules: []
			}, 'sample test')).be.eql(null);
		});

		it("returns module var based on `getModuleVar` method", () => {
			const request = 'sample test';
			const state = {
				harmonyModules: []
			};
			should(HarmonyModulesHelpers.getNewModuleVar(state, request)).be.eql('__WEBPACK_IMPORTED_MODULE_0_sample_test__');
		});
	});
});
