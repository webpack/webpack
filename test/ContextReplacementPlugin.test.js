"use strict";

const sinon = require("sinon");
const ContextReplacementPlugin = require("../lib/ContextReplacementPlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");
const PluginEnvironment = require("./helpers/PluginEnvironment");

describe("ContextReplacementPlugin", () => {
	it("has apply function", () => expect((new ContextReplacementPlugin()).apply).toBeInstanceOf(Function));

	it("should consume resourceRegExp as regular expression", () => {
		let instance = new ContextReplacementPlugin(/selector/, "mock", "mock", "mock");
		expect(instance.resourceRegExp instanceof RegExp).toBe(true);
	});

	it("should consume newContentResource as function", () => {
		let instance = new ContextReplacementPlugin(/selector/, () => {}, "mock", "mock");
		expect(instance.newContentCallback).toBeInstanceOf(Function);
	});

	it("should consume newContentResource as not an string or function", () => {
		let instance = new ContextReplacementPlugin(/selector/, 42, "newContentRecursive", "newContentRegExp");

		expect(instance.resourceRegExp instanceof RegExp).toBe(true);
		expect(instance.newContentResource).toBe(undefined);
		expect(instance.newContentRecursive).toBe(undefined);
		expect(instance.newContentRegExp).toBe(42);
	});

	it("should consume newContentResource as an object", () => {
		let instance = new ContextReplacementPlugin(/selector/, "newResource", {
			test: "obj"
		}, /selector/);

		expect(instance.resourceRegExp instanceof RegExp).toBe(true);
		expect(instance.newContentResource).toBe("newResource");
		expect(instance.newContentRecursive).toBe(undefined);
		expect(instance.newContentRegExp).toBe(undefined);
		expect(instance.newContentCreateContextMap).toBeInstanceOf(Function);

		let x = (nothing, obj) => {
			expect(obj.test).toBe("obj")
		};

		let spy = sinon.spy(x);

		instance.newContentCreateContextMap(undefined, spy);

		expect(spy.called).toBe(true)

	});

	it("should consume newContentResource as an object", () => {
		let instance = new ContextReplacementPlugin(/selector/, "newResource", () => {}, /selector/);

		expect(instance.resourceRegExp instanceof RegExp).toBe(true);
		expect(instance.newContentResource).toBe("newResource");
		expect(instance.newContentRecursive).toBe(undefined);
		expect(instance.newContentRegExp).toBe(undefined);
		expect(instance.newContentCreateContextMap).toBeInstanceOf(Function);
	});

	describe("when applied", () => {

		describe("when before resolve is called", () => {
			it("default call", () => {
				let obj = buildPluginWithParams(/selector/, "./folder", true, /filter/);

				let x = (nothing, result) => {
					expect(result.request).toBe('./folder')
					expect(result.dependencies[0].critical).toBe(false)
					expect(result.recursive).toBe(true)
					expect(result.regExp instanceof RegExp).toBe(true)
				};

				let spy = sinon.spy(x);

				obj.beforeResolve.handler({
					request: "selector",
					dependencies: [{
						critical: true
					}]
				}, spy)

				expect(spy.called).toBe(true)
			});

			it("default call with newContentCallback as a function", () => {
				let obj = buildPluginWithParams(/selector/, (result) => {
					expect(result.request).toBe('selector')
					expect(result.dependencies[0].critical).toBe(false)
					expect(result.recursive).toBe(undefined)
					expect(result.regExp).toBe(undefined)
				}, true, /filter/);

				let x = (nothing, result) => {
					expect(result.request).toBe('selector')
					expect(result.dependencies[0].critical).toBe(false)
					expect(result.recursive).toBe(undefined)
					expect(result.regExp).toBe(undefined)
				};

				let spy = sinon.spy(x);

				obj.beforeResolve.handler({
					request: "selector",
					dependencies: [{
						critical: false
					}]
				}, spy)

				expect(spy.called).toBe(true)
			});

			it("call when result is false", () => {
				let obj = buildPluginWithParams(/selector/, "./folder", true, /filter/);

				let x = (nothing, result) => {
					expect(result).toBeUndefined();
				};

				let spy = sinon.spy(x);

				obj.beforeResolve.handler(false, spy);

				expect(spy.called).toBe(true)
			});
		});

		describe("when after resolve is called", () => {
			it("default call where regex is correct", () => {
				let obj = buildPluginWithParams(/selector/, "./folder", true, /filter/);

				let x = (nothing, result) => {
					expect(result.resource).toContain('selector')
					expect(result.resource).toContain('folder')
				};

				let spy = sinon.spy(x);

				obj.afterResolve.handler({
					resource: "selector",
					dependencies: [{
						critical: true
					}]
				}, spy);

				expect(spy.called).toBe(true)
			});

			it("default call where regex is incorrect", () => {
				let obj = buildPluginWithParams(/selector/, "./folder", true, /filter/);

				let x = (nothing, result) => {
					expect(result.resource).toContain('importwontwork')
				};

				let spy = sinon.spy(x);

				obj.afterResolve.handler({
					resource: "importwontwork",
					dependencies: [{
						critical: true
					}]
				}, spy);

				expect(spy.called).toBe(true)
			});

			it("default call where regex is correct", () => {
				let obj = buildPluginWithParams(/selector/, (result) => {
					//noop
				}, true, /filter/);

				let x = (nothing, result) => {
					expect(result.resource).toEqual('selector')
				};

				let spy = sinon.spy(x);

				obj.afterResolve.handler({
					resource: "selector",
					dependencies: [{
						critical: true
					}]
				}, spy);

				expect(spy.called).toBe(true)
			});

			it("default call where regex is correct and using function as newContent Resource", () => {
				let obj = buildPluginWithParams(/selector/, (result) => {
					result.resource = "imadifferentselector"
				}, true, /filter/);

				let x = (nothing, result) => {
					expect(result.resource).toContain('selector')
					expect(result.resource).toContain('imadifferentselector')
				};

				let spy = sinon.spy(x);

				obj.afterResolve.handler({
					resource: "selector",
					dependencies: [{
						critical: true
					}]
				}, spy);

				expect(spy.called).toBe(true)
			});

		})

	});
});

let buildPluginWithParams = (resourceRegExp, newContentResource, newContentRecursive, newContentRegExp) => {
	let instance = new ContextReplacementPlugin(resourceRegExp, newContentResource, newContentRecursive, newContentRegExp);

	let pluginEnvironment = new PluginEnvironment();
	instance.apply(pluginEnvironment.getEnvironmentStub());

	let contextModuleFactory = pluginEnvironment.getEventBindings()[0];
	expect(pluginEnvironment.getEventBindings().length).toBe(1)

	let contextModuleFactoryPluginEnv = new PluginEnvironment();

	contextModuleFactory.handler(contextModuleFactoryPluginEnv.getEnvironmentStub());

	let contextModuleFactoryEventBindings = contextModuleFactoryPluginEnv.getEventBindings();
	expect(contextModuleFactoryPluginEnv.getEventBindings().length).toBe(2);

	let beforeResolve = contextModuleFactoryEventBindings[0];
	let afterResolve = contextModuleFactoryEventBindings[1];

	return {
		contextModuleFactory,
		beforeResolve,
		afterResolve
	}
};
