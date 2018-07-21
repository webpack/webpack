"use strict";

const should = require("should");
const sinon = require("sinon");
const ContextReplacementPlugin = require("../lib/ContextReplacementPlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");
const PluginEnvironment = require("./helpers/PluginEnvironment");

describe("ContextReplacementPlugin", () => {
	it("has apply function", () => (new ContextReplacementPlugin()).apply.should.be.a.Function());

	it("should consume resourceRegExp as regular expression", () => {
		let instance = new ContextReplacementPlugin(/selector/, "mock", "mock", "mock");
		should(instance.resourceRegExp instanceof RegExp).be.exactly(true);
	});

	it("should consume newContentResource as function", () => {
		let instance = new ContextReplacementPlugin(/selector/, () => {}, "mock", "mock");
		should(instance.newContentCallback).be.a.Function();
	});

	it("should consume newContentResource as not an string or function", () => {
		let instance = new ContextReplacementPlugin(/selector/, 42, "newContentRecursive", "newContentRegExp");

		should(instance.resourceRegExp instanceof RegExp).be.exactly(true);
		should(instance.newContentResource).be.exactly(undefined);
		should(instance.newContentRecursive).be.exactly(undefined);
		should(instance.newContentRegExp).be.exactly(42);
	});

	it("should consume newContentResource as an object", () => {
		let instance = new ContextReplacementPlugin(/selector/, "newResource", {
			test: "obj"
		}, /selector/);

		should(instance.resourceRegExp instanceof RegExp).be.exactly(true);
		should(instance.newContentResource).be.exactly("newResource");
		should(instance.newContentRecursive).be.exactly(undefined);
		should(instance.newContentRegExp).be.exactly(undefined);
		should(instance.newContentCreateContextMap).be.a.Function();

		let x = (nothing, obj) => {
			should(obj.test).be.exactly("obj")
		};

		let spy = sinon.spy(x);

		instance.newContentCreateContextMap(undefined, spy);

		should(spy.called).be.exactly(true)

	});

	it("should consume newContentResource as an object", () => {
		let instance = new ContextReplacementPlugin(/selector/, "newResource", () => {}, /selector/);

		should(instance.resourceRegExp instanceof RegExp).be.exactly(true);
		should(instance.newContentResource).be.exactly("newResource");
		should(instance.newContentRecursive).be.exactly(undefined);
		should(instance.newContentRegExp).be.exactly(undefined);
		should(instance.newContentCreateContextMap).be.a.Function();
	});

	describe("when applied", () => {

		describe("when before resolve is called", () => {
			it("default call", () => {
				let obj = buildPluginWithParams(/selector/, "./folder", true, /filter/);

				let x = (nothing, result) => {
					should(result.request).be.exactly('./folder')
					should(result.dependencies[0].critical).be.exactly(false)
					should(result.recursive).be.exactly(true)
					should(result.regExp instanceof RegExp).be.exactly(true)
				};

				let spy = sinon.spy(x);

				obj.beforeResolve.handler({
					request: "selector",
					dependencies: [{
						critical: true
					}]
				}, spy)

				should(spy.called).be.exactly(true)
			});

			it("default call with newContentCallback as a function", () => {
				let obj = buildPluginWithParams(/selector/, (result) => {
					should(result.request).be.exactly('selector')
					should(result.dependencies[0].critical).be.exactly(false)
					should(result.recursive).be.exactly(undefined)
					should(result.regExp).be.exactly(undefined)
				}, true, /filter/);

				let x = (nothing, result) => {
					should(result.request).be.exactly('selector')
					should(result.dependencies[0].critical).be.exactly(false)
					should(result.recursive).be.exactly(undefined)
					should(result.regExp).be.exactly(undefined)
				};

				let spy = sinon.spy(x);

				obj.beforeResolve.handler({
					request: "selector",
					dependencies: [{
						critical: false
					}]
				}, spy)

				should(spy.called).be.exactly(true)
			});

			it("call when result is false", () => {
				let obj = buildPluginWithParams(/selector/, "./folder", true, /filter/);

				let x = (nothing, result) => {
					should(result).be.Undefined();
				};

				let spy = sinon.spy(x);

				obj.beforeResolve.handler(false, spy);

				should(spy.called).be.exactly(true)
			});
		});

		describe("when after resolve is called", () => {
			it("default call where regex is correct", () => {
				let obj = buildPluginWithParams(/selector/, "./folder", true, /filter/);

				let x = (nothing, result) => {
					result.resource.should.containEql('selector')
					result.resource.should.containEql('folder')
				};

				let spy = sinon.spy(x);

				obj.afterResolve.handler({
					resource: "selector",
					dependencies: [{
						critical: true
					}]
				}, spy);

				should(spy.called).be.exactly(true)
			});

			it("default call where regex is incorrect", () => {
				let obj = buildPluginWithParams(/selector/, "./folder", true, /filter/);

				let x = (nothing, result) => {
					result.resource.should.containEql('importwontwork')
				};

				let spy = sinon.spy(x);

				obj.afterResolve.handler({
					resource: "importwontwork",
					dependencies: [{
						critical: true
					}]
				}, spy);

				should(spy.called).be.exactly(true)
			});

			it("default call where regex is correct", () => {
				let obj = buildPluginWithParams(/selector/, (result) => {
					//noop
				}, true, /filter/);

				let x = (nothing, result) => {
					result.resource.should.equal('selector')
				};

				let spy = sinon.spy(x);

				obj.afterResolve.handler({
					resource: "selector",
					dependencies: [{
						critical: true
					}]
				}, spy);

				should(spy.called).be.exactly(true)
			});

			it("default call where regex is correct and using function as newContent Resource", () => {
				let obj = buildPluginWithParams(/selector/, (result) => {
					result.resource = "imadifferentselector"
				}, true, /filter/);

				let x = (nothing, result) => {
					result.resource.should.containEql('selector')
					result.resource.should.containEql('imadifferentselector')
				};

				let spy = sinon.spy(x);

				obj.afterResolve.handler({
					resource: "selector",
					dependencies: [{
						critical: true
					}]
				}, spy);

				should(spy.called).be.exactly(true)
			});

		})

	});
});

let buildPluginWithParams = (resourceRegExp, newContentResource, newContentRecursive, newContentRegExp) => {
	let instance = new ContextReplacementPlugin(resourceRegExp, newContentResource, newContentRecursive, newContentRegExp);

	let pluginEnvironment = new PluginEnvironment();
	instance.apply(pluginEnvironment.getEnvironmentStub());

	let contextModuleFactory = pluginEnvironment.getEventBindings()[0];
	pluginEnvironment.getEventBindings().length.should.be.exactly(1)

	let contextModuleFactoryPluginEnv = new PluginEnvironment();

	contextModuleFactory.handler(contextModuleFactoryPluginEnv.getEnvironmentStub());

	let contextModuleFactoryEventBindings = contextModuleFactoryPluginEnv.getEventBindings();
	contextModuleFactoryPluginEnv.getEventBindings().length.should.be.exactly(2);

	let beforeResolve = contextModuleFactoryEventBindings[0];
	let afterResolve = contextModuleFactoryEventBindings[1];

	return {
		contextModuleFactory,
		beforeResolve,
		afterResolve
	}
};
