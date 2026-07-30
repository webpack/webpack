"use strict";

const path = require("path");
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

		it("allows overwriting the derived details", () => {
			const error =
				/** @type {NonNullable<typeof env.moduleDependencyError>} */ (
					env.moduleDependencyError
				);
			error.details = "custom";
			expect(error.details).toBe("custom");
		});
	});

	describe("when the nested error hides its stack", () => {
		/**
		 * @returns {InstanceType<typeof ModuleDependencyError>} error
		 */
		function create() {
			const nested = /** @type {Error & { hideStack?: boolean }} */ (
				new Error("Nested Message")
			);
			nested.hideStack = true;
			return new ModuleDependencyError(
				/** @type {import("../lib/Module")} */ (
					/** @type {unknown} */ ("myModule")
				),
				nested,
				/** @type {import("../lib/Dependency").DependencyLocation} */ (
					/** @type {unknown} */ ("Location")
				)
			);
		}

		it("has no details", () => {
			expect(create().details).toBeUndefined();
		});

		it("prepends the frames of the nested error to its own stack", () => {
			const error = create();
			const stack = /** @type {string} */ (error.stack);
			expect(stack).toMatch(
				path.join("test", "ModuleDependencyError.unittest.js:")
			);
			expect(stack).toContain("\n\nModuleDependencyError: Nested Message");
			// the derived stack is stable across reads
			expect(error.stack).toBe(stack);
		});

		it("allows overwriting the derived stack", () => {
			const error = create();
			error.stack = "custom";
			expect(error.stack).toBe("custom");
		});
	});

	describe("when the nested error has no stack", () => {
		it("keeps details and stack usable", () => {
			const nested = /** @type {Error & { hideStack?: boolean }} */ (
				/** @type {unknown} */ ({ message: "No Stack", hideStack: true })
			);
			const error = new ModuleDependencyError(
				/** @type {import("../lib/Module")} */ (
					/** @type {unknown} */ ("myModule")
				),
				nested,
				/** @type {import("../lib/Dependency").DependencyLocation} */ (
					/** @type {unknown} */ ("Location")
				)
			);
			expect(error.details).toBeUndefined();
			expect(error.stack).toMatch(/^ModuleDependencyError: No Stack/);
		});
	});
});
