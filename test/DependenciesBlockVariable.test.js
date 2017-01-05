var should = require("should");
var sinon = require("sinon");
var DependenciesBlockVariable = require("../lib/DependenciesBlockVariable");

describe("DependenciesBlockVariable", function() {
	var DependenciesBlockVariableInstance,
		dependencyMock,
		sandbox;

	before(function() {
		sandbox = sinon.sandbox.create();
		dependencyMock = {
			constructor: {
				name: "DependencyMock"
			},
			disconnect: sandbox.spy(),
			updateHash: sandbox.spy()
		};
		DependenciesBlockVariableInstance = new DependenciesBlockVariable(
			"dependencies-name",
			"expression", [dependencyMock]);
	});

	afterEach(function() {
		sandbox.restore();
	});

	describe("hasDependencies", function() {
		it("returns `true` if has dependencies", function() {
			should(DependenciesBlockVariableInstance.hasDependencies()).be.true();
		});
	});

	describe("disconnect", function() {
		it("trigger dependencies disconnection", function() {
			DependenciesBlockVariableInstance.disconnect();
			should(dependencyMock.disconnect.calledOnce).be.true();
		});
	});

	describe("updateHash", function() {
		var hash;
		before(function() {
			hash = {
				update: sandbox.spy()
			};
			DependenciesBlockVariableInstance.updateHash(hash);
		});

		it("should update hash dependencies with name", function() {
			should(hash.update.calledWith("dependencies-name")).be.true();
		});

		it("should update hash dependencies with expression", function() {
			should(hash.update.calledWith("expression")).be.true();
		});

		it("should update hash inside dependencies", function() {
			should(dependencyMock.updateHash.calledOnce).be.true();
		});
	});

	describe("expressionSource", function() {
		var dependencyTemplates,
			applyMock;

		before(function() {
			applyMock = sandbox.spy();
		});

		it("aplies information inside dependency templates", function() {
			dependencyTemplates = {
				get: function() {
					return {
						apply: applyMock
					};
				}
			};
			DependenciesBlockVariableInstance.expressionSource(
				dependencyTemplates, {}, {}
			);
			should(applyMock.calledOnce).be.true();
		});

		it("aplies information inside dependency templates", function() {
			dependencyTemplates = {
				get: function() {
					return false;
				}
			};
			should(function() {
				DependenciesBlockVariableInstance.expressionSource(
					dependencyTemplates, {}, {}
				)
			}).throw("No template for dependency: DependencyMock");
		})
	});
});
