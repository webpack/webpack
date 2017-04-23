"use strict";

const path = require("path");
const sinon = require("sinon");
const ModuleDependencyError = require("../lib/ModuleDependencyError");

describe("ModuleDependencyError", () => {
	let env;

	beforeEach(() => env = {});

	it("is a function", () => expect(ModuleDependencyError).toBeInstanceOf(Function));

	describe("when new error created", () => {
		beforeEach(() => {
			env.error = new Error("Error Message");
			env.moduleDependencyError = new ModuleDependencyError("myModule", env.error, "Location");
		});

		it("is an error", () => expect(env.moduleDependencyError).toBeInstanceOf(Error));

		it("has a name property", () => expect(env.moduleDependencyError.name).toBe("ModuleDependencyError"));

		it("has a message property", () => expect(env.moduleDependencyError.message).toBe("Location Error Message"));

		it("has a details property", () => expect(env.moduleDependencyError.details).toContain(path.join("test", "ModuleDependencyError.test.js:")));

		it("has an origin property", () => expect(env.moduleDependencyError.origin).toBe("myModule"));

		it("has an error property", () => expect(env.moduleDependencyError.error).toBe(env.error));

	});
});
