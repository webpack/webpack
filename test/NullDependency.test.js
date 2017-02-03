var should = require("should");
var sinon = require("sinon");
var NullDependency = require("../lib/dependencies/NullDependency");

describe("NullDependency", function() {
	var env;

	beforeEach(function() {
		env = {};
	});

	it("is a function", function() {
		NullDependency.should.be.a.Function();
	});

	describe("when created", function() {
		beforeEach(function() {
			env.nullDependency = new NullDependency();
		});

		it("has a null type", function() {
			env.nullDependency.type.should.be.exactly("null");
		});

		it("is not an equal resource", function() {
			env.nullDependency.isEqualResource().should.be.False();
		});

		it("has update hash function", function() {
			env.nullDependency.updateHash.should.be.Function();
		});

		it("does not update hash", function() {
			const hash = {
				update: sinon.stub()
			};
			env.nullDependency.updateHash(hash);
			hash.update.called.should.be.false();
		});
	});

	describe("Template", function() {
		it("is a function", function() {
			NullDependency.Template.should.be.a.Function();
		});

		describe("when created", function() {
			beforeEach(function() {
				env.nullDependencyTemplate = new NullDependency.Template();
			});

			it("has apply function", function() {
				env.nullDependencyTemplate.apply.should.be.Function();
			});
		});
	});
});
