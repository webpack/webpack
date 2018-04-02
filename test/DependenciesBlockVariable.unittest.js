"use strict";

const should = require("should");
const sinon = require("sinon");
const DependenciesBlockVariable = require("../lib/DependenciesBlockVariable");

describe("DependenciesBlockVariable", () => {
	let DependenciesBlockVariableInstance, dependencyMock, sandbox;

	before(() => {
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
			"expression",
			[dependencyMock]
		);
	});

	afterEach(() => sandbox.restore());

	describe("hasDependencies", () => {
		it("returns `true` if has dependencies", () =>
			should(DependenciesBlockVariableInstance.hasDependencies()).be.true());

		it("returns `true` if has dependencies and passed filter", () =>
			should(
				DependenciesBlockVariableInstance.hasDependencies(() => true)
			).be.true());

		it("returns `false` if has dependencies, but not passed filter", () =>
			should(
				DependenciesBlockVariableInstance.hasDependencies(() => false)
			).be.false());

		it("returns `false` if has 0 dependencies", () =>
			should(
				new DependenciesBlockVariable(
					"dependencies-name",
					"expression",
					[]
				).hasDependencies()
			).be.false());

		it("returns `false` if has 0 dependencies and truthy filter", () =>
			should(
				new DependenciesBlockVariable(
					"dependencies-name",
					"expression",
					[]
				).hasDependencies(() => true)
			).be.false());

		it("returns `true` if has several dependencies and only 1 filter passed", () =>
			should(
				new DependenciesBlockVariable("dependencies-name", "expression", [
					dependencyMock,
					Object.assign({}, dependencyMock),
					Object.assign({}, dependencyMock)
				]).hasDependencies((item, i) => i === 2)
			).be.true());
	});

	describe("disconnect", () =>
		it("trigger dependencies disconnection", () => {
			DependenciesBlockVariableInstance.disconnect();
			should(dependencyMock.disconnect.calledOnce).be.true();
		}));

	describe("updateHash", () => {
		let hash;
		before(() => {
			hash = {
				update: sandbox.spy()
			};
			DependenciesBlockVariableInstance.updateHash(hash);
		});

		it("should update hash dependencies with name", () =>
			should(hash.update.calledWith("dependencies-name")).be.true());

		it("should update hash dependencies with expression", () =>
			should(hash.update.calledWith("expression")).be.true());

		it("should update hash inside dependencies", () =>
			should(dependencyMock.updateHash.calledOnce).be.true());
	});

	describe("expressionSource", () => {
		let dependencyTemplates, applyMock;

		before(() => (applyMock = sandbox.spy()));

		it("applies information inside dependency templates", () => {
			dependencyTemplates = {
				get: function() {
					return {
						apply: applyMock
					};
				}
			};
			DependenciesBlockVariableInstance.expressionSource(
				dependencyTemplates,
				{},
				{}
			);
			should(applyMock.calledOnce).be.true();
		});

		it("applies information inside dependency templates", () => {
			dependencyTemplates = {
				get: function() {
					return false;
				}
			};
			should(() => {
				DependenciesBlockVariableInstance.expressionSource(
					dependencyTemplates,
					{},
					{}
				);
			}).throw("No template for dependency: DependencyMock");
		});
	});
});
