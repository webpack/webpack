"use strict";

const sinon = require("sinon");
const DependenciesBlockVariable = require("../lib/DependenciesBlockVariable");

describe("DependenciesBlockVariable", () => {
	const sandbox = sinon.sandbox.create();
	const dependencyMock = {
		constructor: {
			name: "DependencyMock"
		},
		disconnect: sandbox.spy(),
		updateHash: sandbox.spy()
	};
	const DependenciesBlockVariableInstance = new DependenciesBlockVariable("dependencies-name", "expression", [dependencyMock]);

	afterEach(() => {
		sandbox.restore();
	});

	describe("hasDependencies", () => {
		it("returns `true` if has dependencies", () => {
			expect(DependenciesBlockVariableInstance.hasDependencies()).toBe(true);
		});
	});

	describe("disconnect", () => {
		it("trigger dependencies disconnection", () => {
			DependenciesBlockVariableInstance.disconnect();
			expect(dependencyMock.disconnect.calledOnce).toBe(true);
		});
	});

	describe("updateHash", () => {
		const hash = {
			update: sandbox.spy()
		};

		DependenciesBlockVariableInstance.updateHash(hash);

		it("should update hash dependencies with name", () => {
			expect(hash.update.calledWith("dependencies-name")).toBe(true);
		});

		it("should update hash dependencies with expression", () => {
			expect(hash.update.calledWith("expression")).toBe(true);
		});

		it("should update hash inside dependencies", () => {
			expect(dependencyMock.updateHash.calledOnce).toBe(true);
		});
	});

	describe("expressionSource", () => {
		const applyMock = sandbox.spy();

		it("aplies information inside dependency templates", () => {
			const dependencyTemplates = {
				get() {
					return {
						apply: applyMock
					};
				}
			};
			DependenciesBlockVariableInstance.expressionSource(
				dependencyTemplates, {}, {}
			);
			expect(applyMock.calledOnce).toBe(true);
		});

		it("aplies information inside dependency templates", () => {
			const dependencyTemplates = {
				get() {
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
