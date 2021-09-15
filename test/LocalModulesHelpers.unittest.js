"use strict";

const {
	addLocalModule,
	getLocalModule
} = require("../lib/dependencies/LocalModulesHelpers");

describe("LocalModulesHelpers", () => {
	describe("addLocalModule", () => {
		it("returns a module var without special characters", () => {
			const state = {
				localModules: ["first", "second"]
			};
			const localModule = addLocalModule(state, "local_module_sample");
			expect(localModule).toBeInstanceOf(Object);
			expect(localModule).toMatchObject({
				name: "local_module_sample",
				idx: 2,
				used: false
			});
			expect(state.localModules.length).toBe(3);
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
			expect(getLocalModule(state, "local_module_sample")).toBe(null);
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
			expect(getLocalModule(state, "first")).toEqual({
				name: "first"
			});
		});
	});
});
