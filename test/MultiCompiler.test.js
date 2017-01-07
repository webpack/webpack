var should = require("should");
var sinon = require("sinon");
var MultiCompiler = require("../lib/MultiCompiler");

function CompilerEnvironment() {
	var pluginEvents = [];
	var runCallbacks = [];
	var watchCallbacks = [];

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

	this.getPluginEventBindings = function() {
		return pluginEvents;
	};

	this.getRunCallbacks = function() {
		return runCallbacks;
	};

	this.getWatchCallbacks = function() {
		return watchCallbacks;
	};
};

var createCompiler = function(overrides) {
	var compilerEnvironment = new CompilerEnvironment();
	return Object.assign({
		outputPath: "/"
	}, compilerEnvironment.getCompilerStub(), overrides);
};

var setupTwoCompilerEnvironment = function(env, compiler1Values, compiler2Values) {
	var compilerEnvironment1 = new CompilerEnvironment();
	var compilerEnvironment2 = new CompilerEnvironment();
	var compilers = [
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

describe("MultiCompiler", function() {
	var env;
	beforeEach(function() {
		env = {};
	});

	describe("constructor", function() {
		describe("when provided an array of compilers", function() {
			beforeEach(function() {
				env.compilers = [createCompiler(), createCompiler()];
				env.myMultiCompiler = new MultiCompiler(env.compilers);
			});

			it("sets the compilers property to the array", function() {
				env.myMultiCompiler.compilers.should.be.exactly(env.compilers);
			});
		});

		describe("when provided a compiler mapping", function() {
			beforeEach(function() {
				var compilers = {
					compiler1: createCompiler(),
					compiler2: createCompiler()
				};
				env.myMultiCompiler = new MultiCompiler(compilers);
			});

			it("sets the compilers property to an array of compilers", function() {
				env.myMultiCompiler.compilers.should.deepEqual([
					Object.assign({
						name: "compiler1"
					}, createCompiler()),
					Object.assign({
						name: "compiler2"
					}, createCompiler())
				]);
			});
		});

		describe("defined properties", function() {
			describe("outputFileSystem", function() {
				beforeEach(function() {
					env.compilers = [createCompiler(), createCompiler()];
					env.myMultiCompiler = new MultiCompiler(env.compilers);
				});

				it("throws an error when reading the value", function() {
					should(function() {
						env.myMultiCompiler.outputFileSystem
					}).throw("Cannot read outputFileSystem of a MultiCompiler");
				});

				it("updates all compilers when setting the value", function() {
					env.myMultiCompiler.outputFileSystem = "foo";
					env.compilers[0].outputFileSystem.should.be.exactly("foo");
					env.compilers[1].outputFileSystem.should.be.exactly("foo");
				});
			});

			describe("inputFileSystem", function() {
				beforeEach(function() {
					env.compilers = [createCompiler(), createCompiler()];
					env.myMultiCompiler = new MultiCompiler(env.compilers);
				});

				it("throws an error when reading the value", function() {
					should(function() {
						env.myMultiCompiler.inputFileSystem
					}).throw("Cannot read inputFileSystem of a MultiCompiler");
				});

				it("updates all compilers when setting the value", function() {
					env.myMultiCompiler.inputFileSystem = "foo";
					env.compilers[0].inputFileSystem.should.be.exactly("foo");
					env.compilers[1].inputFileSystem.should.be.exactly("foo");
				});
			});

			describe("outputPath", function() {
				describe("when common path cannot be found and output path is absolute", function() {
					beforeEach(function() {
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

					it("returns the root path", function() {
						env.myMultiCompiler.outputPath.should.be.exactly("/");
					});
				});

				describe("when common path cannot be found and output path is relative", function() {
					beforeEach(function() {
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

					it("returns the first segment of relative path", function() {
						env.myMultiCompiler.outputPath.should.be.exactly("foo");
					});
				});

				describe("when common path can be found and output path is absolute", function() {
					beforeEach(function() {
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

					it("returns the shared path", function() {
						env.myMultiCompiler.outputPath.should.be.exactly("/foo");
					});
				});

				describe("when common path can be found and output path is relative", function() {
					beforeEach(function() {
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

					it("returns the shared path", function() {
						env.myMultiCompiler.outputPath.should.be.exactly("foo");
					});
				});
			});
		});

		describe("compiler events", function() {
			beforeEach(function() {
				setupTwoCompilerEnvironment(env);
			});

			it("binds two event handler", function() {
				env.compiler1EventBindings.length.should.be.exactly(2);
				env.compiler2EventBindings.length.should.be.exactly(2);
			});

			describe("done handler", function() {
				beforeEach(function() {
					env.doneEventBinding1 = env.compiler1EventBindings[0];
					env.doneEventBinding2 = env.compiler2EventBindings[0];
				});

				it("binds to done event", function() {
					env.doneEventBinding1.name.should.be.exactly("done");
				});

				describe('when called for first compiler', function() {
					beforeEach(function() {
						env.mockDonePlugin = sinon.spy();
						env.myMultiCompiler.plugin('done', env.mockDonePlugin);
						env.doneEventBinding1.handler({
							hash: "foo"
						});
					});

					it("does not call the done plugin when not all compilers are finished", function() {
						env.mockDonePlugin.callCount.should.be.exactly(0);
					});

					describe('and called for second compiler', function() {
						beforeEach(function() {
							env.doneEventBinding2.handler({
								hash: "bar"
							});
						});

						it("calls the done plugin", function() {
							env.mockDonePlugin.callCount.should.be.exactly(1);
						});
					});
				});
			});

			describe("invalid handler", function() {
				beforeEach(function() {
					env.invalidEventBinding = env.compiler1EventBindings[1];
				});

				it("binds to invalid event", function() {
					env.invalidEventBinding.name.should.be.exactly("invalid");
				});

				describe('when called', function() {
					beforeEach(function() {
						env.mockInvalidPlugin = sinon.spy();
						env.myMultiCompiler.plugin('invalid', env.mockInvalidPlugin);
						env.invalidEventBinding.handler();
					});

					it("calls the invalid plugin", function() {
						env.mockInvalidPlugin.callCount.should.be.exactly(1);
					});
				});
			});
		});
	});

	describe("watch", function() {
		describe("without compiler dependencies", function() {
			beforeEach(function() {
				setupTwoCompilerEnvironment(env);
				env.callback = sinon.spy();
				env.options = {
					testWatchOptions: true
				};
				env.result = env.myMultiCompiler.watch(env.options, env.callback);
			});

			it("returns a multi-watching object", function() {
				var result = JSON.stringify(env.result);
				result.should.be.exactly('{"watchings":["compiler1","compiler2"]}');
			});

			it("calls watch on each compiler with original options", function() {
				env.compiler1WatchCallbacks.length.should.be.exactly(1);
				env.compiler1WatchCallbacks[0].options.should.be.exactly(env.options);
				env.compiler2WatchCallbacks.length.should.be.exactly(1);
				env.compiler2WatchCallbacks[0].options.should.be.exactly(env.options);
			});

			it("calls the callback when all compilers watch", function() {
				env.compiler1WatchCallbacks[0].callback(null, {
					hash: 'foo'
				});
				env.callback.callCount.should.be.exactly(0);
				env.compiler2WatchCallbacks[0].callback(null, {
					hash: 'bar'
				});
				env.callback.callCount.should.be.exactly(1);
			});

			describe("on first run", function() {
				describe("callback called with no compiler errors", function() {
					beforeEach(function() {
						env.compiler1WatchCallbacks[0].callback(new Error('Test error'));
					});

					it('has failure parameters', function() {
						env.callback.callCount.should.be.exactly(1);
						env.callback.getCall(0).args[0].should.be.Error();
						should(env.callback.getCall(0).args[1]).be.undefined();
					});
				});

				describe("callback called with no compiler errors", function() {
					beforeEach(function() {
						env.compiler1WatchCallbacks[0].callback(null, {
							hash: 'foo'
						});
					});

					it('does not call the callback', function() {
						env.callback.callCount.should.be.exactly(0);
					});
				});
			});

			describe("on subsequent runs", function() {
				describe("callback called with compiler errors", function() {
					beforeEach(function() {
						env.compiler1WatchCallbacks[0].callback(null, {
							hash: 'foo'
						});
						env.compiler2WatchCallbacks[0].callback(new Error('Test error'));
					});

					it('has failure parameters', function() {
						env.callback.callCount.should.be.exactly(1);
						env.callback.getCall(0).args[0].should.be.Error();
						should(env.callback.getCall(0).args[1]).be.undefined();
					});
				});

				describe("callback called with no compiler errors", function() {
					beforeEach(function() {
						env.compiler1WatchCallbacks[0].callback(null, {
							hash: 'foo'
						});
						env.compiler2WatchCallbacks[0].callback(null, {
							hash: 'bar'
						});
					});

					it('has success parameters', function() {
						env.callback.callCount.should.be.exactly(1);
						should(env.callback.getCall(0).args[0]).be.Null();
						var stats = JSON.stringify(env.callback.getCall(0).args[1]);
						stats.should.be.exactly('{"stats":[{"hash":"foo"},{"hash":"bar"}],"hash":"foobar"}');
					});
				});
			});
		});

		describe("with compiler dependencies", function() {
			beforeEach(function() {
				setupTwoCompilerEnvironment(env, {
					name: "compiler1",
					dependencies: ["compiler2"]
				}, {
					name: "compiler2"
				});
				env.callback = sinon.spy();
				env.options = {
					testWatchOptions: true
				};
				env.result = env.myMultiCompiler.watch(env.options, env.callback);
			});

			it("calls run on each compiler in dependency order", function() {
				env.compiler1WatchCallbacks.length.should.be.exactly(0);
				env.compiler2WatchCallbacks.length.should.be.exactly(1);
				env.compiler2WatchCallbacks[0].options.should.be.exactly(env.options);
				env.compiler2WatchCallbacks[0].callback(null, {
					hash: 'bar'
				});
				env.compiler1WatchCallbacks.length.should.be.exactly(1);
				env.compiler1WatchCallbacks[0].options.should.be.exactly(env.options);
			});

			it("calls the callback when all compilers run in dependency order", function() {
				env.compiler2WatchCallbacks[0].callback(null, {
					hash: 'bar'
				});
				env.callback.callCount.should.be.exactly(0);
				env.compiler1WatchCallbacks[0].callback(null, {
					hash: 'foo'
				});
				env.callback.callCount.should.be.exactly(1);
			});
		});
	});

	describe("run", function() {
		describe("without compiler dependencies", function() {
			beforeEach(function() {
				setupTwoCompilerEnvironment(env);
				env.callback = sinon.spy();
				env.myMultiCompiler.run(env.callback);
			});

			it("calls run on each compiler", function() {
				env.compiler1RunCallbacks.length.should.be.exactly(1);
				env.compiler2RunCallbacks.length.should.be.exactly(1);
			});

			it("calls the callback when all compilers run", function() {
				env.compiler1RunCallbacks[0].callback(null, {
					hash: 'foo'
				});
				env.callback.callCount.should.be.exactly(0);
				env.compiler2RunCallbacks[0].callback(null, {
					hash: 'bar'
				});
				env.callback.callCount.should.be.exactly(1);
			});

			describe("callback called with no compiler errors", function() {
				beforeEach(function() {
					env.compiler1RunCallbacks[0].callback(null, {
						hash: 'foo'
					});
					env.compiler2RunCallbacks[0].callback(null, {
						hash: 'bar'
					});
				});

				it('has success parameters', function() {
					env.callback.callCount.should.be.exactly(1);
					should(env.callback.getCall(0).args[0]).be.Null();
					var stats = JSON.stringify(env.callback.getCall(0).args[1]);
					stats.should.be.exactly('{"stats":[{"hash":"foo"},{"hash":"bar"}],"hash":"foobar"}');
				});
			});

			describe("callback called with compiler errors", function() {
				beforeEach(function() {
					env.compiler1RunCallbacks[0].callback(null, {
						hash: 'foo'
					});
					env.compiler2RunCallbacks[0].callback(new Error('Test error'));
				});

				it('has failure parameters', function() {
					env.callback.callCount.should.be.exactly(1);
					env.callback.getCall(0).args[0].should.be.Error();
					should(env.callback.getCall(0).args[1]).be.undefined();
				});
			});
		});

		describe("with compiler dependencies", function() {
			beforeEach(function() {
				setupTwoCompilerEnvironment(env, {
					name: "compiler1",
					dependencies: ["compiler2"]
				}, {
					name: "compiler2"
				});
				env.callback = sinon.spy();
				env.myMultiCompiler.run(env.callback);
			});

			it("calls run on each compiler in dependency order", function() {
				env.compiler1RunCallbacks.length.should.be.exactly(0);
				env.compiler2RunCallbacks.length.should.be.exactly(1);
				env.compiler2RunCallbacks[0].callback(null, {
					hash: 'bar'
				});
				env.compiler1RunCallbacks.length.should.be.exactly(1);
			});

			it("calls the callback when all compilers run in dependency order", function() {
				env.compiler2RunCallbacks[0].callback(null, {
					hash: 'bar'
				});
				env.callback.callCount.should.be.exactly(0);
				env.compiler1RunCallbacks[0].callback(null, {
					hash: 'foo'
				});
				env.callback.callCount.should.be.exactly(1);
			});
		});
	});

	describe("purgeInputFileSystem", function() {
		beforeEach(function() {
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

		it("calls the compilers purge if available", function() {
			var purgeSpy = env.compilers[0].inputFileSystem.purge;
			purgeSpy.callCount.should.be.exactly(1);
		});
	});
});
