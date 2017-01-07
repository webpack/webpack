var should = require("should");
var sinon = require("sinon");
var CachePlugin = require("../lib/CachePlugin");
var applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("CachePlugin", function() {
	var env;

	beforeEach(function() {
		env = {
			compilation: {
				compiler: {},
				warnings: []
			}
		};
	});

	it("has apply function", function() {
		(new CachePlugin()).apply.should.be.a.Function();
	});

	describe('applyMtime', function() {
		beforeEach(function() {
			env.plugin = new CachePlugin();
		});

		it("sets file system accuracy to 1 for granular modification timestamp", function() {
			env.plugin.applyMtime(1483819067001)
			env.plugin.FS_ACCURENCY.should.be.exactly(1);
		});

		it("sets file system accuracy to 10 for moderately granular modification timestamp", function() {
			env.plugin.applyMtime(1483819067004)
			env.plugin.FS_ACCURENCY.should.be.exactly(10);
		});

		it("sets file system accuracy to 100 for moderately coarse modification timestamp", function() {
			env.plugin.applyMtime(1483819067040)
			env.plugin.FS_ACCURENCY.should.be.exactly(100);
		});

		it("sets file system accuracy to 1000 for coarse modification timestamp", function() {
			env.plugin.applyMtime(1483819067400)
			env.plugin.FS_ACCURENCY.should.be.exactly(1000);
		});
	});

	describe("when applied", function() {
		describe("for multiple compilers", function() {
			beforeEach(function() {
				var plugin = new CachePlugin();
				env.compilers = [sinon.spy(), sinon.spy()];
				plugin.apply({
					compilers: env.compilers
				});
			});

			it("calls each compilers apply with the cache plugin context", function() {
				env.compilers[0].callCount.should.be.exactly(1);
				env.compilers[0].firstCall.thisValue.should.be.instanceOf(CachePlugin);
				env.compilers[1].callCount.should.be.exactly(1);
				env.compilers[1].firstCall.thisValue.should.be.instanceOf(CachePlugin);
			});
		});

		describe("for a single compiler", function() {
			beforeEach(function() {
				var applyContext = {};
				env.eventBindings = applyPluginWithOptions.call(applyContext, CachePlugin, {
					test: true
				});
				env.plugin = applyContext.plugin;
			});

			it("binds four event handlers", function() {
				env.eventBindings.length.should.be.exactly(4);
			});

			it("sets the initial cache", function() {
				env.plugin.cache.test.should.be.true();
			});

			describe("compilation handler", function() {
				it("binds to compilation event", function() {
					env.eventBindings[0].name.should.be.exactly("compilation");
				});

				describe("when cachable", function() {
					describe("and not watching", function() {
						beforeEach(function() {
							env.eventBindings[0].handler(env.compilation);
						});

						it("sets the compilation cache", function() {
							env.compilation.cache.should.deepEqual({
								test: true
							});
						});
					});

					describe("and watching", function() {
						beforeEach(function() {
							env.eventBindings[1].handler(env.compilation, function() {});
							env.eventBindings[0].handler(env.compilation);
						});

						it("does not add a compilation warning is added", function() {
							env.compilation.warnings.should.be.empty();
						});
					});
				});

				describe("when not cachable", function() {
					beforeEach(function() {
						env.compilation.notCacheable = true;
					});

					describe("and not watching", function() {
						beforeEach(function() {
							env.eventBindings[0].handler(env.compilation);
						});

						it("does not set the cache", function() {
							should(env.compilation.cache).be.undefined();
						});
					});

					describe("and watching", function() {
						beforeEach(function() {
							env.eventBindings[1].handler(env.compilation, function() {});
							env.eventBindings[0].handler(env.compilation);
						});

						it("adds a compilation warning", function() {
							env.compilation.warnings.length.should.be.exactly(1);
							env.compilation.warnings[0].should.be.Error("CachePlugin - Cache cannot be used because of: true");
						});
					});
				});
			});

			describe("watch-run handler", function() {
				beforeEach(function() {
					env.callback = sinon.spy();
					env.eventBindings[1].handler(env.compilation.compiler, env.callback);
				});

				it("binds to watch-run event", function() {
					env.eventBindings[1].name.should.be.exactly("watch-run");
				});

				it("sets watching flag", function() {
					env.plugin.watching.should.be.true();
				});

				it("calls callback", function() {
					env.callback.callCount.should.be.exactly(1);
				});
			});

			describe("run handler", function() {
				beforeEach(function() {
					env.fsStat = sinon.spy();
					env.callback = sinon.spy();
					env.compilation.compiler.inputFileSystem = {
						stat: env.fsStat
					};
				});

				it("binds to run event", function() {
					env.eventBindings[2].name.should.be.exactly("run");
				});

				describe("Has not previously compiled", function() {
					beforeEach(function() {
						env.eventBindings[2].handler(env.compilation.compiler, env.callback);
					});

					it("does not get any file stats", function() {
						env.fsStat.callCount.should.be.exactly(0);
					});

					it("calls the callback", function() {
						env.callback.callCount.should.be.exactly(1);
						should(env.callback.firstCall.args[0]).be.undefined();
					});
				});

				describe("Has previously compiled", function() {
					beforeEach(function() {
						env.compilation.fileDependencies = ["foo"];
						env.compilation.contextDependencies = ["bar"];
						env.eventBindings[3].handler(env.compilation, function() {});
						env.eventBindings[2].handler(env.compilation.compiler, env.callback);
					});

					it("calls for file stats for file dependencies", function() {
						env.fsStat.callCount.should.be.exactly(1);
						env.fsStat.firstCall.args[0].should.be.exactly("foo");
					});

					describe('file stats callback', function() {
						beforeEach(function() {
							env.fsStatCallback = env.fsStat.firstCall.args[1];
						});

						describe('when error occurs', function() {
							beforeEach(function() {
								env.fsStatCallback(new Error('Test Error'));
							});

							it('calls handler callback with error', function() {
								env.callback.callCount.should.be.exactly(1);
								env.callback.firstCall.args[0].should.be.Error('Test Error');
							});
						});

						describe('when ENOENT error occurs', function() {
							beforeEach(function() {
								env.fsStatCallback({
									code: 'ENOENT'
								});
							});

							it('calls handler callback without error', function() {
								env.callback.callCount.should.be.exactly(1);
								should(env.callback.firstCall.args[0]).be.undefined();
							});
						});

						describe('when stat does not have modified time', function() {
							beforeEach(function() {
								sinon.stub(env.plugin, 'applyMtime');
								env.fsStatCallback(null, {});
							});

							afterEach(function() {
								env.plugin.applyMtime.restore();
							});

							it('does not update file system accuracy', function() {
								env.plugin.applyMtime.callCount.should.be.exactly(0);
							});

							it('updates file modified timestamp to infinity', function() {
								env.compilation.compiler.fileTimestamps.should.deepEqual({
									foo: Infinity
								});
							});

							it('calls handler callback without error', function() {
								env.callback.callCount.should.be.exactly(1);
								should(env.callback.firstCall.args[0]).be.undefined();
							});
						});

						describe('when stat has modified time', function() {
							beforeEach(function() {
								sinon.stub(env.plugin, 'applyMtime');
								env.fsStatCallback(null, {
									mtime: 1483819067001
								});
							});

							afterEach(function() {
								env.plugin.applyMtime.restore();
							});

							it('does not update file system accuracy', function() {
								env.plugin.applyMtime.callCount.should.be.exactly(1);
							});

							it('updates file modified timestamp to modified time with accuracy value', function() {
								env.compilation.compiler.fileTimestamps.should.deepEqual({
									foo: 1483819069001
								});
							});

							it('calls handler callback without error', function() {
								env.callback.callCount.should.be.exactly(1);
								should(env.callback.firstCall.args[0]).be.undefined();
							});
						});
					});
				});
			});

			describe("after-compile handler", function() {
				beforeEach(function() {
					env.compilation.fileDependencies = ["foo"];
					env.compilation.contextDependencies = ["bar"];
					env.callback = sinon.spy();
					env.eventBindings[3].handler(env.compilation, env.callback);
				});

				it("binds to after-compile event", function() {
					env.eventBindings[3].name.should.be.exactly("after-compile");
				});

				it("saves copy of compilation file dependecies", function() {
					env.compilation.compiler.should.deepEqual({
						_lastCompilationFileDependencies: ["foo"],
						_lastCompilationContextDependencies: ["bar"]
					});
				});

				it("calls callback", function() {
					env.callback.callCount.should.be.exactly(1);
				});
			});
		});
	});
});
