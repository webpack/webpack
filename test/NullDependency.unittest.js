"use strict";

require("should");
const sinon = require("sinon");
const NullDependency = require("../lib/dependencies/NullDependency");

describe("NullDependency", () => {
	let env;

	beforeEach(() => (env = {}));

	it("is a function", () => NullDependency.should.be.a.Function());

	describe("when created", () => {
		beforeEach(() => (env.nullDependency = new NullDependency()));

		it("has a null type", () =>
			env.nullDependency.type.should.be.exactly("null"));

		it("has update hash function", () =>
			env.nullDependency.updateHash.should.be.Function());

		it("does not update hash", () => {
			const hash = {
				update: sinon.stub()
			};
			env.nullDependency.updateHash(hash);
			hash.update.called.should.be.false();
		});
	});

	describe("Template", () => {
		it("is a function", () => NullDependency.Template.should.be.a.Function());

		describe("when created", () => {
			beforeEach(
				() => (env.nullDependencyTemplate = new NullDependency.Template())
			);

			it("has apply function", () =>
				env.nullDependencyTemplate.apply.should.be.Function());
		});
	});
});
