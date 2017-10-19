"use strict";

const should = require("should");
const sinon = require("sinon");
const RequireJsStuffPlugin = require("../lib/RequireJsStuffPlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");
const PluginEnvironment = require("./helpers/PluginEnvironment");

describe("RequireJsStuffPlugin", () => {
	it("has apply function", () => (new RequireJsStuffPlugin()).apply.should.be.a.Function());

	describe("when applied", () => {
		let eventBindings;
		let eventBinding;

		beforeEach(() => eventBindings = applyPluginWithOptions(RequireJsStuffPlugin));

		it("binds one event handler", () => eventBindings.length.should.be.exactly(1));

		describe("compilation handler", () => {
			beforeEach(() => eventBinding = eventBindings[0]);

			it("binds to compilation event", () => eventBinding.name.should.be.exactly("compilation"));

			describe("when called", () => {
				let pluginEnvironment;
				let compilationEventBindings;
				let compilation;

				beforeEach(() => {
					pluginEnvironment = new PluginEnvironment();
					compilation = {
						dependencyFactories: {
							set: sinon.spy()
						},
						dependencyTemplates: {
							set: sinon.spy()
						}
					};
					const params = {
						normalModuleFactory: pluginEnvironment.getEnvironmentStub()
					};
					eventBinding.handler(compilation, params);
					compilationEventBindings = pluginEnvironment.getEventBindings();
				});

				it("sets the dependency factory", () =>
					compilation.dependencyFactories.set.callCount.should.be.exactly(1));

				it("sets the dependency template", () =>
					compilation.dependencyTemplates.set.callCount.should.be.exactly(1));

				it("binds one event handler", () => compilationEventBindings.length.should.be.exactly(1));

				describe("parser handler", () => {
					let parser;
					let parserEventBindings;
					let compilationEventBinding;

					beforeEach(() => {
						compilationEventBinding = compilationEventBindings[0];
						pluginEnvironment = new PluginEnvironment();
						parser = pluginEnvironment.getEnvironmentStub();
					});

					it("binds to parser event", () => compilationEventBinding.name.should.be.exactly("parser"));

					describe("when called with parser options of requirejs as false", () => {
						beforeEach(() => {
							compilationEventBinding.handler(parser, {
								requireJs: false
							});
							parserEventBindings = pluginEnvironment.getEventBindings();
						});

						it("binds no event handlers", () => parserEventBindings.length.should.be.exactly(0));
					});

					describe("when called with empty parser options", () => {
						let parserEventBinding;
						let parserEventContext;
						let expressionMock;

						beforeEach(() => {
							parserEventContext = {
								state: {
									current: {
										addDependency: sinon.spy()
									}
								}
							};
							expressionMock = {
								range: 10,
								loc: 5
							};
							compilationEventBinding.handler(parser, {});
							parserEventBindings = pluginEnvironment.getEventBindings();
						});

						it("binds four event handlers", () => parserEventBindings.length.should.be.exactly(4));

						describe("'call require.config' handler", () => {
							beforeEach(() => parserEventBinding = parserEventBindings[0]);

							it("binds to 'call require.config' event", () =>
								parserEventBinding.name.should.be.exactly("call require.config"));

							describe("when called", () => {
								beforeEach(() =>
									parserEventBinding.handler.call(parserEventContext, expressionMock));

								it("adds dependency to current state", () => {
									const addDependencySpy = parserEventContext.state.current.addDependency;
									const addedDependency = JSON.stringify(addDependencySpy.getCall(0).args[0]);
									addDependencySpy.callCount.should.be.exactly(1);
									addedDependency.should.be.exactly('{"module":null,"expression":"undefined","range":10,"loc":5}');
								});
							});
						});

						describe("'call requirejs.config' handler", () => {
							beforeEach(() => parserEventBinding = parserEventBindings[1]);

							it("binds to 'call requirejs.config' event", () =>
								parserEventBinding.name.should.be.exactly("call requirejs.config"));

							describe("when called", () => {
								beforeEach(() =>
									parserEventBinding.handler.call(parserEventContext, expressionMock));

								it("adds dependency to current state", () => {
									const addDependencySpy = parserEventContext.state.current.addDependency;
									const addedDependency = JSON.stringify(addDependencySpy.getCall(0).args[0]);
									addDependencySpy.callCount.should.be.exactly(1);
									addedDependency.should.be.exactly('{"module":null,"expression":"undefined","range":10,"loc":5}');
								});
							});
						});

						describe("'expression require.version' handler", () => {
							beforeEach(() => parserEventBinding = parserEventBindings[2]);

							it("binds to 'expression require.version' event", () =>
								parserEventBinding.name.should.be.exactly("expression require.version"));

							describe("when called", () => {
								beforeEach(() =>
									parserEventBinding.handler.call(parserEventContext, expressionMock));

								it("adds dependency to current state", () => {
									const addDependencySpy = parserEventContext.state.current.addDependency;
									const addedDependency = JSON.stringify(addDependencySpy.getCall(0).args[0]);
									addDependencySpy.callCount.should.be.exactly(1);
									addedDependency.should.be.exactly('{"module":null,"expression":"\\"0.0.0\\"","range":10,"loc":5}');
								});
							});
						});

						describe("'expression requirejs.onError' handler", () => {
							beforeEach(() => parserEventBinding = parserEventBindings[3]);

							it("binds to 'expression requirejs.onError' event", () =>
								parserEventBinding.name.should.be.exactly("expression requirejs.onError"));

							describe("when called", () => {
								beforeEach(() =>
									parserEventBinding.handler.call(parserEventContext, expressionMock));

								it("adds dependency to current state", () => {
									const addDependencySpy = parserEventContext.state.current.addDependency;
									const addedDependency = JSON.stringify(addDependencySpy.getCall(0).args[0]);
									addDependencySpy.callCount.should.be.exactly(1);
									addedDependency.should.be.exactly('{"module":null,"expression":"__webpack_require__.oe","range":10,"loc":5}');
								});
							});
						});
					});
				});
			});
		});
	});
});
