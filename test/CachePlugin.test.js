"use strict";

const should = require("should");
const sinon = require("sinon");
const CachePlugin = require("../lib/CachePlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("CachePlugin", () => {
	let env;

	beforeEach(() => {
		env = {
			compilation: {
				compiler: {},
				warnings: []
			}
		};
	});

	it("has apply ", () => {
		(new CachePlugin()).apply.should.be.a.Function();
	});
	describe("applyMtime", () => {
		beforeEach(() => env.plugin = new CachePlugin());

		it("sets file system accuracy to 1 for granular modification timestamp", () => {
			env.plugin.applyMtime(1483819067001);
			env.plugin.FS_ACCURENCY.should.be.exactly(1);
		});

		it("sets file system accuracy to 10 for moderately granular modification timestamp", () => {
			env.plugin.applyMtime(1483819067004);
			env.plugin.FS_ACCURENCY.should.be.exactly(10);
		});

		it("sets file system accuracy to 100 for moderately coarse modification timestamp", () => {
			env.plugin.applyMtime(1483819067040);
			env.plugin.FS_ACCURENCY.should.be.exactly(100);
		});

		it("sets file system accuracy to 1000 for coarse modification timestamp", () => {
			env.plugin.applyMtime(1483819067400);
			env.plugin.FS_ACCURENCY.should.be.exactly(1000);
		});
	});

	describe("when applied", () => {
		describe("for multiple compilers", () => {
			beforeEach(() => {
				const plugin = new CachePlugin();
				env.compilers = [sinon.spy(), sinon.spy()];
				plugin.apply({
					compilers: env.compilers
				});
			});

			it("calls each compilers apply with the cache plugin context", () => {
				env.compilers[0].callCount.should.be.exactly(1);
				env.compilers[0].firstCall.thisValue.should.be.instanceOf(CachePlugin);
				env.compilers[1].callCount.should.be.exactly(1);
				env.compilers[1].firstCall.thisValue.should.be.instanceOf(CachePlugin);
			});
		});

		describe("for a single compiler", () => {
			beforeEach(() => {
				const applyContext = {};
				env.eventBindings = applyPluginWithOptions.call(applyContext, CachePlugin, {
					test: true
				});
				env.plugin = applyContext.plugin;
			});

			it("binds four event handlers", () =>
				env.eventBindings.length.should.be.exactly(4));

			it("sets the initial cache", () =>
				env.plugin.cache.test.should.be.true());

			describe("compilation handler", () => {
				it("binds to compilation event", () =>
					env.eventBindings[0].name.should.be.exactly("compilation"));

				describe("when cachable", () => {
					describe("and not watching", () => {
						beforeEach(() =>
							env.eventBindings[0].handler(env.compilation));

						it("sets the compilation cache", () =>
							env.compilation.cache.should.deepEqual({
								test: true
							}));
					});

					describe("and watching", () => {
						beforeEach(() => {
							env.eventBindings[1].handler(env.compilation, () => {});
							env.eventBindings[0].handler(env.compilation);
						});

						it("does not add a compilation warning is added", () =>
							env.compilation.warnings.should.be.empty());
					});
				});

				describe("when not cachable", () => {
					beforeEach(() =>
						env.compilation.notCacheable = true);

					describe("and not watching", () => {
						beforeEach(() =>
							env.eventBindings[0].handler(env.compilation));

						it("does not set the cache", () =>
							should(env.compilation.cache).be.undefined());
					});

					describe("and watching", () => {
						beforeEach(() => {
							env.eventBindings[1].handler(env.compilation, () => {});
							env.eventBindings[0].handler(env.compilation);
						});

						it("adds a compilation warning", () => {
							env.compilation.warnings.length.should.be.exactly(1);
							env.compilation.warnings[0].should.be.Error("CachePlugin - Cache cannot be used because of: true");
						});
					});
				});
			});

			describe("watch-run handler", () => {
				beforeEach(() => {
					env.callback = sinon.spy();
					env.eventBindings[1].handler(env.compilation.compiler, env.callback);
				});

				it("binds to watch-run event", () =>
					env.eventBindings[1].name.should.be.exactly("watch-run"));

				it("sets watching flag", () =>
					env.plugin.watching.should.be.true());

				it("calls callback", () =>
					env.callback.callCount.should.be.exactly(1));
			});

			describe("run handler", () => {
				beforeEach(() => {
					env.fsStat = sinon.spy();
					env.callback = sinon.spy();
					env.compilation.compiler.inputFileSystem = {
						stat: env.fsStat
					};
				});

				it("binds to run event", () =>
					env.eventBindings[2].name.should.be.exactly("run"));

				describe("Has not previously compiled", () => {
					beforeEach(() =>
						env.eventBindings[2].handler(env.compilation.compiler, env.callback));

					it("does not get any file stats", () =>
						env.fsStat.callCount.should.be.exactly(0));

					it("calls the callback", () => {
						env.callback.callCount.should.be.exactly(1);
						should(env.callback.firstCall.args[0]).be.undefined();
					});
				});

				describe("Has previously compiled", () => {
					beforeEach(() => {
						env.compilation.fileDependencies = ["foo"];
						env.compilation.contextDependencies = ["bar"];
						env.eventBindings[3].handler(env.compilation, () => {});
						env.eventBindings[2].handler(env.compilation.compiler, env.callback);
					});

					it("calls for file stats for file dependencies", () => {
						env.fsStat.callCount.should.be.exactly(1);
						env.fsStat.firstCall.args[0].should.be.exactly("foo");
					});

					describe("file stats callback", () => {
						beforeEach(() =>
							env.fsStatCallback = env.fsStat.firstCall.args[1]);

						describe("when error occurs", () => {
							beforeEach(() =>
								env.fsStatCallback(new Error("Test Error")));

							it("calls handler callback with error", () => {
								env.callback.callCount.should.be.exactly(1);
								env.callback.firstCall.args[0].should.be.Error("Test Error");
							});
						});

						describe("when ENOENT error occurs", () => {
							beforeEach(() =>
								env.fsStatCallback({
									code: "ENOENT"
								}));

							it("calls handler callback without error", () => {
								env.callback.callCount.should.be.exactly(1);
								should(env.callback.firstCall.args[0]).be.undefined();
							});
						});

						describe("when stat does not have modified time", () => {
							beforeEach(() => {
								sinon.stub(env.plugin, "applyMtime");
								env.fsStatCallback(null, {});
							});

							afterEach(() => env.plugin.applyMtime.restore());

							it("does not update file system accuracy", () =>
								env.plugin.applyMtime.callCount.should.be.exactly(0));

							it("updates file modified timestamp to infinity", () =>
								env.compilation.compiler.fileTimestamps.should.deepEqual({
									foo: Infinity
								}));

							it("calls handler callback without error", () => {
								env.callback.callCount.should.be.exactly(1);
								should(env.callback.firstCall.args[0]).be.undefined();
							});
						});

						describe("when stat has modified time", () => {
							beforeEach(() => {
								sinon.stub(env.plugin, "applyMtime");
								env.fsStatCallback(null, {
									mtime: 1483819067001
								});
							});

							afterEach(() => env.plugin.applyMtime.restore());

							it("does not update file system accuracy", () =>
								env.plugin.applyMtime.callCount.should.be.exactly(1));

							it("updates file modified timestamp to modified time with accuracy value", () =>
								env.compilation.compiler.fileTimestamps.should.deepEqual({
									foo: 1483819069001
								}));

							it("calls handler callback without error", () => {
								env.callback.callCount.should.be.exactly(1);
								should(env.callback.firstCall.args[0]).be.undefined();
							});
						});
					});
				});
			});

			describe("after-compile handler", () => {
				beforeEach(() => {
					env.compilation.fileDependencies = ["foo"];
					env.compilation.contextDependencies = ["bar"];
					env.callback = sinon.spy();
					env.eventBindings[3].handler(env.compilation, env.callback);
				});

				it("binds to after-compile event", () =>
					env.eventBindings[3].name.should.be.exactly("after-compile"));

				it("saves copy of compilation file dependecies", () => {
					env.compilation.compiler.should.deepEqual({
						_lastCompilationFileDependencies: ["foo"],
						_lastCompilationContextDependencies: ["bar"]
					});
				});

				it("calls callback", () =>
					env.callback.callCount.should.be.exactly(1));
			});
		});
	});
});
