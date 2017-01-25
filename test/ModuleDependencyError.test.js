var path = require("path");
var should = require("should");
var sinon = require("sinon");
var ModuleDependencyError = require("../lib/ModuleDependencyError");

describe("ModuleDependencyError", function() {
	var env;

	beforeEach(function() {
		env = {};
	});

	it("is a function", function() {
		ModuleDependencyError.should.be.a.Function();
	});

	describe("when new error created", function() {
		beforeEach(function() {
			env.error = new Error("Error Message");
			env.moduleDependencyError = new ModuleDependencyError("myModule", env.error, "Location");
		});

		it("is an error", function() {
			env.moduleDependencyError.should.be.an.Error();
		});

		it("has a name property", function() {
			env.moduleDependencyError.name.should.be.exactly("ModuleDependencyError");
		});

		it("has a message property", function() {
			env.moduleDependencyError.message.should.be.exactly("Location Error Message");
		});

		it("has a details property", function() {
			env.moduleDependencyError.details.should.containEql(path.join("test", "ModuleDependencyError.test.js:"));
		});

		it("has an origin property", function() {
			env.moduleDependencyError.origin.should.be.exactly("myModule");
		});

		it("has an error property", function() {
			env.moduleDependencyError.error.should.be.exactly(env.error);
		});

	});
});
