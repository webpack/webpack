"use strict";

const sinon = require("sinon");
const MultiCompiler = require("../lib/MultiCompiler");

function CompilerEnvironment() {
	const pluginEvents = [];
	const runCallbacks = [];
	const watchCallbacks = [];

	this.getCompilerStub = function() {
		return {
			plugin: function(name, handler) {
				pluginEvents.push({
					name,
					handler
				});
			},
			run: function(callback) {
				runCallbacks.push({
					callback
				});
			},
			watch: function(options, callback) {
				watchCallbacks.push({
					options,
					callback
				});
				return this.name;
			}
		};
	};

	this.getPluginEventBindings = () => pluginEvents;

	this.getRunCallbacks = () => runCallbacks;

	this.getWatchCallbacks = () => watchCallbacks;
}

const createCompiler = function(overrides) {
	const compilerEnvironment = new CompilerEnvironment();
	return Object.assign({
		outputPath: "/"
	}, compilerEnvironment.getCompilerStub(), overrides);
};

const setupTwoCompilerEnvironment = function(env, compiler1Values, compiler2Values) {
	const compilerEnvironment1 = new CompilerEnvironment();
	const compilerEnvironment2 = new CompilerEnvironment();
	const compilers = [
		Object.assign({
			name: "compiler1"
		}, (compiler1Values || {}), compilerEnvironment1.getCompilerStub()),
		Object.assign({
			name: "compiler2"
		}, (compiler2Values || {}), compilerEnvironment2.getCompilerStub())
	];
	env.myMultiCompiler = new MultiCompiler(compilers);
	env.compiler1EventBindings = compilerEnvironment1.getPluginEventBindings();
	env.compiler2EventBindings = compilerEnvironment2.getPluginEventBindings();
	env.compiler1WatchCallbacks = compilerEnvironment1.getWatchCallbacks();
	env.compiler2WatchCallbacks = compilerEnvironment2.getWatchCallbacks();
	env.compiler1RunCallbacks = compilerEnvironment1.getRunCallbacks();
	env.compiler2RunCallbacks = compilerEnvironment2.getRunCallbacks();
};

describe("MultiCompiler", () => {
	let env;
	beforeEach(() => env = {});

	describe("constructor", () => {
		describe("when provided an array of compilers", () => {
			beforeEach(() => {
				env.compilers = [createCompiler(), createCompiler()];
				env.myMultiCompiler = new MultiCompiler(env.compilers);
			});

			it("sets the compilers property to the array", () => expect(env.myMultiCompiler.compilers).toBe(env.compilers));
		});

		describe("when provided a compiler mapping", () => {
			it("sets the compilers property to an array of compilers", () => {
				const compilers = {
					compiler1: createCompiler(),
					compiler2: createCompiler()
				};
				env.myMultiCompiler = new MultiCompiler(compilers);

				expect(env.myMultiCompiler.compilers).toEqual([
					Object.assign({
						name: "compiler1"
					}, compilers.compiler1),
					Object.assign({
						name: "compiler2"
					}, compilers.compiler2)
				]);
			});
		});

		describe("defined properties", () => {
			describe("outputFileSystem", () => {
				beforeEach(() => {
					env.compilers = [createCompiler(), createCompiler()];
					env.myMultiCompiler = new MultiCompiler(env.compilers);
				});

				it("throws an error when reading the value", () => {
					expect(() => {
						env.myMultiCompiler.outputFileSystem;
					}).toThrow("Cannot read outputFileSystem of a MultiCompiler");
				});

				it("updates all compilers when setting the value", () => {
					env.myMultiCompiler.outputFileSystem = "foo";
					expect(env.compilers[0].outputFileSystem).toBe("foo");
					expect(env.compilers[1].outputFileSystem).toBe("foo");
				});
			});

			describe("inputFileSystem", () => {
				beforeEach(() => {
					env.compilers = [createCompiler(), createCompiler()];
					env.myMultiCompiler = new MultiCompiler(env.compilers);
				});

				it("throws an error when reading the value", () => {
					expect(() => {
						env.myMultiCompiler.inputFileSystem;
					}).toThrow("Cannot read inputFileSystem of a MultiCompiler");
				});

				it("updates all compilers when setting the value", () => {
					env.myMultiCompiler.inputFileSystem = "foo";
					expect(env.compilers[0].inputFileSystem).toBe("foo");
					expect(env.compilers[1].inputFileSystem).toBe("foo");
				});
			});

			describe("outputPath", () => {
				describe("when common path cannot be found and output path is absolute", () => {
					beforeEach(() => {
						env.compilers = [
							createCompiler({
								outputPath: "/foo/bar"
							}),
							createCompiler({
								outputPath: "quux"
							})
						];
						env.myMultiCompiler = new MultiCompiler(env.compilers);
					});

					it("returns the root path", () => expect(env.myMultiCompiler.outputPath).toBe("/"));
				});

				describe("when common path cannot be found and output path is relative", () => {
					beforeEach(() => {
						env.compilers = [
							createCompiler({
								outputPath: "foo/bar/baz"
							}),
							createCompiler({
								outputPath: "quux"
							})
						];
						env.myMultiCompiler = new MultiCompiler(env.compilers);
					});

					it("returns the first segment of relative path", () =>
						expect(env.myMultiCompiler.outputPath).toBe("foo"));
				});

				describe("when common path can be found and output path is absolute", () => {
					beforeEach(() => {
						env.compilers = [
							createCompiler({
								outputPath: "/foo"
							}),
							createCompiler({
								outputPath: "/foo/bar/baz"
							})
						];
						env.myMultiCompiler = new MultiCompiler(env.compilers);
					});

					it("returns the shared path", () => expect(env.myMultiCompiler.outputPath).toBe("/foo"));
				});

				describe("when common path can be found and output path is relative", () => {
					beforeEach(() => {
						env.compilers = [
							createCompiler({
								outputPath: "foo"
							}),
							createCompiler({
								outputPath: "foo/bar/baz"
							})
						];
						env.myMultiCompiler = new MultiCompiler(env.compilers);
					});

					it("returns the shared path", () => expect(env.myMultiCompiler.outputPath).toBe("foo"));
				});
			});
		});

		describe("compiler events", () => {
			beforeEach(() => setupTwoCompilerEnvironment(env));

			it("binds two event handler", () => {
				expect(env.compiler1EventBindings.length).toBe(2);
				expect(env.compiler2EventBindings.length).toBe(2);
			});

			describe("done handler", () => {
				beforeEach(() => {
					env.doneEventBinding1 = env.compiler1EventBindings[0];
					env.doneEventBinding2 = env.compiler2EventBindings[0];
				});

				it("binds to done event", () => expect(env.doneEventBinding1.name).toBe("done"));

				describe("when called for first compiler", () => {
					beforeEach(() => {
						env.mockDonePlugin = sinon.spy();
						env.myMultiCompiler.plugin("done", env.mockDonePlugin);
						env.doneEventBinding1.handler({
							hash: "foo"
						});
					});

					it("does not call the done plugin when not all compilers are finished", () =>
						expect(env.mockDonePlugin.callCount).toBe(0));

					describe("and called for second compiler", () => {
						beforeEach(() =>
							env.doneEventBinding2.handler({
								hash: "bar"
							}));

						it("calls the done plugin", () => expect(env.mockDonePlugin.callCount).toBe(1));
					});
				});
			});

			describe("invalid handler", () => {
				beforeEach(() => env.invalidEventBinding = env.compiler1EventBindings[1]);

				it("binds to invalid event", () => expect(env.invalidEventBinding.name).toBe("invalid"));

				describe("when called", () => {
					beforeEach(() => {
						env.mockInvalidPlugin = sinon.spy();
						env.myMultiCompiler.plugin("invalid", env.mockInvalidPlugin);
						env.invalidEventBinding.handler();
					});

					it("calls the invalid plugin", () => expect(env.mockInvalidPlugin.callCount).toBe(1));
				});
			});
		});
	});

	describe("watch", () => {
		describe("without compiler dependencies", () => {
			beforeEach(() => {
				setupTwoCompilerEnvironment(env);
				env.callback = sinon.spy();
				env.options = [{
					testWatchOptions: true
				}, {
					testWatchOptions2: true
				}];
				env.result = env.myMultiCompiler.watch(env.options, env.callback);
			});

			it("returns a multi-watching object", () => {
				const result = JSON.stringify(env.result);
				expect(result).toBe('{"watchings":["compiler1","compiler2"],"compiler":{"_plugins":{},"compilers":[{"name":"compiler1"},{"name":"compiler2"}]}}');
			});

			it("calls watch on each compiler with original options", () => {
				expect(env.compiler1WatchCallbacks.length).toBe(1);
				expect(env.compiler1WatchCallbacks[0].options).toBe(env.options[0]);
				expect(env.compiler2WatchCallbacks.length).toBe(1);
				expect(env.compiler2WatchCallbacks[0].options).toBe(env.options[1]);
			});

			it("calls the callback when all compilers watch", () => {
				env.compiler1WatchCallbacks[0].callback(null, {
					hash: "foo"
				});
				expect(env.callback.callCount).toBe(0);
				env.compiler2WatchCallbacks[0].callback(null, {
					hash: "bar"
				});
				expect(env.callback.callCount).toBe(1);
			});

			describe("on first run", () => {
				describe("callback called with no compiler errors", () => {
					beforeEach(() => env.compiler1WatchCallbacks[0].callback(new Error("Test error")));

					it("has failure parameters", () => {
						expect(env.callback.callCount).toBe(1);
						expect(env.callback.getCall(0).args[0]).toBeInstanceOf(Error);
						expect(env.callback.getCall(0).args[1]).toBeUndefined();
					});
				});

				describe("callback called with no compiler errors", () => {
					beforeEach(() =>
						env.compiler1WatchCallbacks[0].callback(null, {
							hash: "foo"
						}));

					it("does not call the callback", () => expect(env.callback.callCount).toBe(0));
				});
			});

			describe("on subsequent runs", () => {
				describe("callback called with compiler errors", () => {
					beforeEach(() => {
						env.compiler1WatchCallbacks[0].callback(null, {
							hash: "foo"
						});
						env.compiler2WatchCallbacks[0].callback(new Error("Test error"));
					});

					it("has failure parameters", () => {
						expect(env.callback.callCount).toBe(1);
						expect(env.callback.getCall(0).args[0]).toBeInstanceOf(Error);
						expect(env.callback.getCall(0).args[1]).toBeUndefined();
					});
				});

				describe("callback called with no compiler errors", () => {
					beforeEach(() => {
						env.compiler1WatchCallbacks[0].callback(null, {
							hash: "foo"
						});
						env.compiler2WatchCallbacks[0].callback(null, {
							hash: "bar"
						});
					});

					it("has success parameters", () => {
						expect(env.callback.callCount).toBe(1);
						expect(env.callback.getCall(0).args[0]).toBeNull();
						const stats = JSON.stringify(env.callback.getCall(0).args[1]);
						expect(stats).toBe('{"stats":[{"hash":"foo"},{"hash":"bar"}],"hash":"foobar"}');
					});
				});
			});
		});

		describe("with compiler dependencies", () => {
			beforeEach(() => {
				setupTwoCompilerEnvironment(env, {
					name: "compiler1",
					dependencies: ["compiler2"]
				}, {
					name: "compiler2"
				});
				env.callback = sinon.spy();
				env.options = [{
					testWatchOptions: true
				}, {
					testWatchOptions2: true
				}];
				env.result = env.myMultiCompiler.watch(env.options, env.callback);
			});

			it("calls run on each compiler in dependency order", () => {
				expect(env.compiler1WatchCallbacks.length).toBe(0);
				expect(env.compiler2WatchCallbacks.length).toBe(1);
				expect(env.compiler2WatchCallbacks[0].options).toBe(env.options[1]);
				env.compiler2WatchCallbacks[0].callback(null, {
					hash: "bar"
				});
				expect(env.compiler1WatchCallbacks.length).toBe(1);
				expect(env.compiler1WatchCallbacks[0].options).toBe(env.options[0]);
			});

			it("calls the callback when all compilers run in dependency order", () => {
				env.compiler2WatchCallbacks[0].callback(null, {
					hash: "bar"
				});
				expect(env.callback.callCount).toBe(0);
				env.compiler1WatchCallbacks[0].callback(null, {
					hash: "foo"
				});
				expect(env.callback.callCount).toBe(1);
			});
		});
	});

	describe("run", () => {
		describe("without compiler dependencies", () => {
			beforeEach(() => {
				setupTwoCompilerEnvironment(env);
				env.callback = sinon.spy();
				env.myMultiCompiler.run(env.callback);
			});

			it("calls run on each compiler", () => {
				expect(env.compiler1RunCallbacks.length).toBe(1);
				expect(env.compiler2RunCallbacks.length).toBe(1);
			});

			it("calls the callback when all compilers run", () => {
				env.compiler1RunCallbacks[0].callback(null, {
					hash: "foo"
				});
				expect(env.callback.callCount).toBe(0);
				env.compiler2RunCallbacks[0].callback(null, {
					hash: "bar"
				});
				expect(env.callback.callCount).toBe(1);
			});

			describe("callback called with no compiler errors", () => {
				beforeEach(() => {
					env.compiler1RunCallbacks[0].callback(null, {
						hash: "foo"
					});
					env.compiler2RunCallbacks[0].callback(null, {
						hash: "bar"
					});
				});

				it("has success parameters", () => {
					expect(env.callback.callCount).toBe(1);
					expect(env.callback.getCall(0).args[0]).toBeNull();
					const stats = JSON.stringify(env.callback.getCall(0).args[1]);
					expect(stats).toBe('{"stats":[{"hash":"foo"},{"hash":"bar"}],"hash":"foobar"}');
				});
			});

			describe("callback called with compiler errors", () => {
				beforeEach(() => {
					env.compiler1RunCallbacks[0].callback(null, {
						hash: "foo"
					});
					env.compiler2RunCallbacks[0].callback(new Error("Test error"));
				});

				it("has failure parameters", () => {
					expect(env.callback.callCount).toBe(1);
					expect(env.callback.getCall(0).args[0]).toBeInstanceOf(Error);
					expect(env.callback.getCall(0).args[1]).toBeUndefined();
				});
			});
		});

		describe("with compiler dependencies", () => {
			beforeEach(() => {
				setupTwoCompilerEnvironment(env, {
					name: "compiler1",
					dependencies: ["compiler2"]
				}, {
					name: "compiler2"
				});
				env.callback = sinon.spy();
				env.myMultiCompiler.run(env.callback);
			});

			it("calls run on each compiler in dependency order", () => {
				expect(env.compiler1RunCallbacks.length).toBe(0);
				expect(env.compiler2RunCallbacks.length).toBe(1);
				env.compiler2RunCallbacks[0].callback(null, {
					hash: "bar"
				});
				expect(env.compiler1RunCallbacks.length).toBe(1);
			});

			it("calls the callback when all compilers run in dependency order", () => {
				env.compiler2RunCallbacks[0].callback(null, {
					hash: "bar"
				});
				expect(env.callback.callCount).toBe(0);
				env.compiler1RunCallbacks[0].callback(null, {
					hash: "foo"
				});
				expect(env.callback.callCount).toBe(1);
			});
		});
	});

	describe("purgeInputFileSystem", () => {
		beforeEach(() => {
			env.compilers = [
				Object.assign({
					inputFileSystem: {
						purge: sinon.spy()
					}
				}, createCompiler()),
				createCompiler()
			];
			env.myMultiCompiler = new MultiCompiler(env.compilers);
			env.myMultiCompiler.purgeInputFileSystem();
		});

		it("calls the compilers purge if available", () => {
			const purgeSpy = env.compilers[0].inputFileSystem.purge;
			expect(purgeSpy.callCount).toBe(1);
		});
	});
});
