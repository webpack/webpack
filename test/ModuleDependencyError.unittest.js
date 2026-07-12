"use strict";

const path = require("node:path");
const ModuleDependencyError = require("../lib/errors/ModuleDependencyError");

describe("ModuleDependencyError", () => {
	/** @type {{ error?: Error, moduleDependencyError?: InstanceType<typeof ModuleDependencyError> }} */
	let env;

	beforeEach(() => {
		env = {};
	});

	describe("when new error created", () => {
		beforeEach(() => {
			env.error = new Error("Error Message");
			env.moduleDependencyError = new ModuleDependencyError(
				/** @type {import("../lib/Module")} */ (
					/** @type {unknown} */ ("myModule")
				),
				env.error,
				/** @type {import("../lib/Dependency").DependencyLocation} */ (
					/** @type {unknown} */ ("Location")
				)
			);
		});

		it("is an error", () => {
			expect(env.moduleDependencyError).toBeInstanceOf(Error);
		});

		it("has a name property", () => {
			expect(env.moduleDependencyError).toBeDefined();
			expect(
				/** @type {NonNullable<typeof env.moduleDependencyError>} */ (
					env.moduleDependencyError
				).name
			).toBe("ModuleDependencyError");
		});

		it("has a message property", () => {
			expect(
				/** @type {NonNullable<typeof env.moduleDependencyError>} */ (
					env.moduleDependencyError
				).message
			).toBe("Error Message");
		});

		it("has a loc property", () => {
			expect(
				/** @type {NonNullable<typeof env.moduleDependencyError>} */ (
					env.moduleDependencyError
				).loc
			).toBe("Location");
		});

		it("has a details property", () => {
			expect(
				/** @type {NonNullable<typeof env.moduleDependencyError>} */ (
					env.moduleDependencyError
				).details
			).toMatch(path.join("test", "ModuleDependencyError.unittest.js:"));
		});

		it("has an module property", () => {
			expect(
				/** @type {NonNullable<typeof env.moduleDependencyError>} */ (
					env.moduleDependencyError
				).module
			).toBe("myModule");
		});

		it("has an error property", () => {
			expect(
				/** @type {NonNullable<typeof env.moduleDependencyError>} */ (
					env.moduleDependencyError
				).error
			).toBe(env.error);
		});
	});
});
