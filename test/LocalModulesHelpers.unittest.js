/* globals describe, it */
"use strict";

const should = require("should");
const LocalModulesHelpers = require("../lib/dependencies/LocalModulesHelpers");

describe("LocalModulesHelpers", () => {
	describe("addLocalModule", () => {
		it("returns a module var without special characters", () => {
			const state = {
				module: "module_sample",
				localModules: ["first", "second"]
			};
			should(LocalModulesHelpers.addLocalModule(state, "local_module_sample"))
				.be.an.instanceOf(Object)
				.and.have.properties({
					module: "module_sample",
					name: "local_module_sample",
					idx: 2,
					used: false
				});
			should(state.localModules.length).be.eql(3);
		});
	});

	describe("getLocalModule", () => {
		it("returns `null` if names information doesn't match", () => {
			const state = {
				module: "module_sample",
				localModules: [
					{
						name: "first"
					},
					{
						name: "second"
					}
				]
			};
			should(
				LocalModulesHelpers.getLocalModule(state, "local_module_sample")
			).be.eql(null);
		});

		it("returns local module information", () => {
			const state = {
				module: "module_sample",
				localModules: [
					{
						name: "first"
					},
					{
						name: "second"
					}
				]
			};
			should(LocalModulesHelpers.getLocalModule(state, "first")).be.eql({
				name: "first"
			});
		});
	});
});
