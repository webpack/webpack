"use strict";

const sinon = require("sinon");
const NullDependency = require("../lib/dependencies/NullDependency");

describe("NullDependency", () => {
	let env;

	beforeEach(() => env = {});

	it("is a function", () => expect(NullDependency).toBeInstanceOf(Function));

	describe("when created", () => {
		beforeEach(() => env.nullDependency = new NullDependency());

		it("has a null type", () => expect(env.nullDependency.type).toBe("null"));

		it("is not an equal resource", () => expect(env.nullDependency.isEqualResource()).toBeFalsy());

		it("has update hash function", () => expect(env.nullDependency.updateHash).toBeInstanceOf(Function));

		it("does not update hash", () => {
			const hash = {
				update: sinon.stub()
			};
			env.nullDependency.updateHash(hash);
			expect(hash.update.called).toBeFalsy();
		});
	});

	describe("Template", () => {
		it("is a function", () => expect(NullDependency.Template).toBeInstanceOf(Function));

		describe("when created", () => {
			beforeEach(() => env.nullDependencyTemplate = new NullDependency.Template());

			it("has apply function", () => expect(env.nullDependencyTemplate.apply).toBeInstanceOf(Function));
		});
	});
});
