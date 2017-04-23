"use strict";

const sinon = require("sinon");
const DependenciesBlockVariable = require("../lib/DependenciesBlockVariable");

describe("DependenciesBlockVariable", () => {
	let DependenciesBlockVariableInstance,
		dependencyMock,
		sandbox;

	beforeEach(() => {
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

	afterEach(() => sandbox.restore());

	describe("hasDependencies", () =>
		it("returns `true` if has dependencies", () =>
			expect(DependenciesBlockVariableInstance.hasDependencies()).toBeTruthy()));

	describe("disconnect", () =>
		it("trigger dependencies disconnection", () => {
			DependenciesBlockVariableInstance.disconnect();
			expect(dependencyMock.disconnect.calledOnce).toBeTruthy();
		}));

	describe("updateHash", () => {
		let hash;
		beforeEach(() => {
			hash = {
				update: sandbox.spy()
			};
			DependenciesBlockVariableInstance.updateHash(hash);
		});

		it("should update hash dependencies with name", () =>
			expect(hash.update.calledWith("dependencies-name")).toBeTruthy());

		it("should update hash dependencies with expression", () =>
			expect(hash.update.calledWith("expression")).toBeTruthy());

		it("should update hash inside dependencies", () =>
			expect(dependencyMock.updateHash.calledOnce).toBeTruthy());
	});

	describe("expressionSource", () => {
		let dependencyTemplates,
			applyMock;

		beforeEach(() => applyMock = sandbox.spy());

		it("aplies information inside dependency templates", () => {
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
			expect(applyMock.calledOnce).toBeTruthy();
		});

		it("aplies information inside dependency templates", () => {
			dependencyTemplates = {
				get: function() {
					return false;
				}
			};
			expect(() => {
				DependenciesBlockVariableInstance.expressionSource(
					dependencyTemplates, {}, {}
				);
			}).toThrow("No template for dependency: DependencyMock");
		});
	});
});
