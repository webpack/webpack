"use strict";

const NullDependency = require("../lib/dependencies/NullDependency");

describe("NullDependency", () => {
	let env;

	beforeEach(() => (env = {}));

	it("is a function", () => {
		expect(NullDependency).toBeTypeOf("function");
	});

	describe("when created", () => {
		beforeEach(() => (env.nullDependency = new NullDependency()));

		it("has a null type", () => {
			expect(env.nullDependency.type).toBe("null");
		});

		it("has update hash function", () => {
			expect(env.nullDependency.updateHash).toBeTypeOf("function");
		});

		it("does not update hash", () => {
			const hash = {
				update: jest.fn()
			};
			env.nullDependency.updateHash(hash);
			expect(hash.update).not.toHaveBeenCalled();
		});
	});

	describe("Template", () => {
		it("is a function", () => {
			expect(NullDependency.Template).toBeTypeOf("function");
		});

		describe("when created", () => {
			beforeEach(() => {
				env.nullDependencyTemplate = new NullDependency.Template();
			});

			it("has apply function", () => {
				expect(env.nullDependencyTemplate.apply).toBeTypeOf("function");
			});
		});
	});
});
