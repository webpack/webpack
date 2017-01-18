"use strict";

const should = require("should");
const sinon = require("sinon");
const DependenciesBlockconstiable = require("../lib/DependenciesBlockvariable");

describe("DependenciesBlockconstiable", () => {
	let DependenciesBlockconstiableInstance,
		dependencyMock,
		sandbox;

	before(() => {
		sandbox = sinon.sandbox.create();
		dependencyMock = {
			constructor: {
				name: "DependencyMock"
			},
			disconnect: sandbox.spy(),
			updateHash: sandbox.spy()
		};
		DependenciesBlockconstiableInstance = new DependenciesBlockconstiable(
			"dependencies-name",
			"expression", [dependencyMock]);
	});

	afterEach(() => sandbox.restore());

	describe("hasDependencies", () =>
		it("returns `true` if has dependencies", () =>
			should(DependenciesBlockconstiableInstance.hasDependencies()).be.true()));

	describe("disconnect", () =>
		it("trigger dependencies disconnection", () => {
			DependenciesBlockconstiableInstance.disconnect();
			should(dependencyMock.disconnect.calledOnce).be.true();
		}));

	describe("updateHash", () => {
		let hash;
		before(() => {
			hash = {
				update: sandbox.spy()
			};
			DependenciesBlockconstiableInstance.updateHash(hash);
		});

		it("should update hash dependencies with name", () =>
			should(hash.update.calledWith("dependencies-name")).be.true());

		it("should update hash dependencies with expression", () =>
			should(hash.update.calledWith("expression")).be.true());

		it("should update hash inside dependencies", () =>
			should(dependencyMock.updateHash.calledOnce).be.true());
	});

	describe("expressionSource", () => {
		let dependencyTemplates,
			applyMock;

		before(() => applyMock = sandbox.spy());

		it("aplies information inside dependency templates", () => {
			dependencyTemplates = {
				get: function() {
					return {
						apply: applyMock
					};
				}
			};
			DependenciesBlockconstiableInstance.expressionSource(
				dependencyTemplates, {}, {}
			);
			should(applyMock.calledOnce).be.true();
		});

		it("aplies information inside dependency templates", () => {
			dependencyTemplates = {
				get: function() {
					return false;
				}
			};
			should(() => {
				DependenciesBlockconstiableInstance.expressionSource(
					dependencyTemplates, {}, {}
				);
			}).throw("No template for dependency: DependencyMock");
		});
	});
});
