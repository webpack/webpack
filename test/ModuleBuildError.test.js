"use strict";

const path = require("path");
const should = require("should");
const sinon = require("sinon");
const ModuleBuildError = require("../lib/ModuleBuildError");

describe("ModuleBuildError", () => {
	let env;

	beforeEach(() => env = {});

	it("is a function", () => ModuleBuildError.should.be.a.Function());

	describe("when new error created", () => {
		beforeEach(() => {
			env.error = new Error("Custom Error Message");
			env.moduleBuildError = new ModuleBuildError("myModule", env.error, "Location");
		});

		it("is an error", () => env.moduleBuildError.should.be.an.Error());

		it("has a name property", () => env.moduleBuildError.name.should.be.exactly("ModuleBuildError"));

		it("has a message property", () => env.moduleBuildError.message.should.startWith("Module build failed: Custom Error Message"));

		it("contains a stack trace", () => env.moduleBuildError.message.should.match(/Context\.beforeEach/));

		it("has an error property", () => env.moduleBuildError.error.should.be.exactly(env.error));

	});

	describe("when the error wants to hide the stack trace", () => {
		beforeEach(() => {
			env.error = new Error("Custom Error Message");
			env.error.hideStack = true;
			env.moduleBuildError = new ModuleBuildError("myModule", env.error, "Location");
		});

		it("is an error", () => env.moduleBuildError.should.be.an.Error());

		it("has a name property", () => env.moduleBuildError.name.should.be.exactly("ModuleBuildError"));

		it("has a message property without a stack trace", () => env.moduleBuildError.message.should.be.exactly("Module build failed: Custom Error Message"));

		it("has a stack trace in details", () => env.moduleBuildError.details.should.be.match(/Context\.beforeEach/));

		it("has an error property", () => env.moduleBuildError.error.should.be.exactly(env.error));

	});
});
