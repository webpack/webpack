"use strict";

const path = require("path");
require("should");
const ModuleDependencyError = require("../lib/ModuleDependencyError");

describe("ModuleDependencyError", () => {
	let env;

	beforeEach(() => (env = {}));

	it("is a function", () => ModuleDependencyError.should.be.a.Function());

	describe("when new error created", () => {
		beforeEach(() => {
			env.error = new Error("Error Message");
			env.moduleDependencyError = new ModuleDependencyError(
				"myModule",
				env.error,
				"Location"
			);
		});

		it("is an error", () => env.moduleDependencyError.should.be.an.Error());

		it("has a name property", () =>
			env.moduleDependencyError.name.should.be.exactly(
				"ModuleDependencyError"
			));

		it("has a message property", () =>
			env.moduleDependencyError.message.should.be.exactly(
				"Location Error Message"
			));

		it("has a details property", () =>
			env.moduleDependencyError.details.should.containEql(
				path.join("test", "ModuleDependencyError.unittest.js:")
			));

		it("has an origin property", () =>
			env.moduleDependencyError.origin.should.be.exactly("myModule"));

		it("has an error property", () =>
			env.moduleDependencyError.error.should.be.exactly(env.error));
	});
});
