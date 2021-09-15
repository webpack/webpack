"use strict";

const path = require("path");
const ModuleDependencyError = require("../lib/ModuleDependencyError");

describe("ModuleDependencyError", () => {
	let env;

	beforeEach(() => {
		env = {};
	});

	describe("when new error created", () => {
		beforeEach(() => {
			env.error = new Error("Error Message");
			env.moduleDependencyError = new ModuleDependencyError(
				"myModule",
				env.error,
				"Location"
			);
		});

		it("is an error", () => {
			expect(env.moduleDependencyError).toBeInstanceOf(Error);
		});

		it("has a name property", () => {
			expect(env.moduleDependencyError.name).toBe("ModuleDependencyError");
		});

		it("has a message property", () => {
			expect(env.moduleDependencyError.message).toBe("Error Message");
		});

		it("has a loc property", () => {
			expect(env.moduleDependencyError.loc).toBe("Location");
		});

		it("has a details property", () => {
			expect(env.moduleDependencyError.details).toMatch(
				path.join("test", "ModuleDependencyError.unittest.js:")
			);
		});

		it("has an module property", () => {
			expect(env.moduleDependencyError.module).toBe("myModule");
		});

		it("has an error property", () => {
			expect(env.moduleDependencyError.error).toBe(env.error);
		});
	});
});
