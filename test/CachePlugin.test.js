"use strict";

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
		expect((new CachePlugin()).apply).toBeInstanceOf(Function);
	});
	describe("applyMtime", () => {
		beforeEach(() => env.plugin = new CachePlugin());

		it("sets file system accuracy to 1 for granular modification timestamp", () => {
			env.plugin.applyMtime(1483819067001);
			expect(env.plugin.FS_ACCURENCY).toBe(1);
		});

		it("sets file system accuracy to 10 for moderately granular modification timestamp", () => {
			env.plugin.applyMtime(1483819067004);
			expect(env.plugin.FS_ACCURENCY).toBe(10);
		});

		it("sets file system accuracy to 100 for moderately coarse modification timestamp", () => {
			env.plugin.applyMtime(1483819067040);
			expect(env.plugin.FS_ACCURENCY).toBe(100);
		});

		it("sets file system accuracy to 1000 for coarse modification timestamp", () => {
			env.plugin.applyMtime(1483819067400);
			expect(env.plugin.FS_ACCURENCY).toBe(1000);
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
				expect(env.compilers[0].callCount).toBe(1);
				expect(env.compilers[0].firstCall.thisValue).toBeInstanceOf(CachePlugin);
				expect(env.compilers[1].callCount).toBe(1);
				expect(env.compilers[1].firstCall.thisValue).toBeInstanceOf(CachePlugin);
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
				expect(env.eventBindings.length).toBe(4));

			it("sets the initial cache", () =>
				expect(env.plugin.cache.test).toBeTruthy());

			describe("compilation handler", () => {
				it("binds to compilation event", () =>
					expect(env.eventBindings[0].name).toBe("compilation"));

				describe("when cachable", () => {
					describe("and not watching", () => {
						beforeEach(() =>
							env.eventBindings[0].handler(env.compilation));

						it("sets the compilation cache", () =>
							expect(env.compilation.cache).toEqual({
								test: true
							}));
					});

					describe("and watching", () => {
						beforeEach(() => {
							env.eventBindings[1].handler(env.compilation, () => {});
							env.eventBindings[0].handler(env.compilation);
						});

						it("does not add a compilation warning is added", () =>
							expect(env.compilation.warnings).toHaveLength(0));
					});
				});

				describe("when not cachable", () => {
					beforeEach(() =>
						env.compilation.notCacheable = true);

					describe("and not watching", () => {
						beforeEach(() =>
							env.eventBindings[0].handler(env.compilation));

						it("does not set the cache", () =>
							expect(env.compilation.cache).toBeUndefined());
					});

					describe("and watching", () => {
						beforeEach(() => {
							env.eventBindings[1].handler(env.compilation, () => {});
							env.eventBindings[0].handler(env.compilation);
						});

						it("adds a compilation warning", () => {
							expect(env.compilation.warnings.length).toBe(1);
							expect(env.compilation.warnings[0].message).toBe("CachePlugin - Cache cannot be used because of: true");
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
					expect(env.eventBindings[1].name).toBe("watch-run"));

				it("sets watching flag", () =>
					expect(env.plugin.watching).toBeTruthy());

				it("calls callback", () =>
					expect(env.callback.callCount).toBe(1));
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
					expect(env.eventBindings[2].name).toBe("run"));

				describe("Has not previously compiled", () => {
					beforeEach(() =>
						env.eventBindings[2].handler(env.compilation.compiler, env.callback));

					it("does not get any file stats", () =>
						expect(env.fsStat.callCount).toBe(0));

					it("calls the callback", () => {
						expect(env.callback.callCount).toBe(1);
						expect(env.callback.firstCall.args[0]).toBeUndefined();
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
						expect(env.fsStat.callCount).toBe(1);
						expect(env.fsStat.firstCall.args[0]).toBe("foo");
					});

					describe("file stats callback", () => {
						beforeEach(() =>
							env.fsStatCallback = env.fsStat.firstCall.args[1]);

						describe("when error occurs", () => {
							beforeEach(() =>
								env.fsStatCallback(new Error("Test Error")));

							it("calls handler callback with error", () => {
								expect(env.callback.callCount).toBe(1);
								expect(env.callback.firstCall.args[0].message).toBe("Test Error");
							});
						});

						describe("when ENOENT error occurs", () => {
							beforeEach(() =>
								env.fsStatCallback({
									code: "ENOENT"
								}));

							it("calls handler callback without error", () => {
								expect(env.callback.callCount).toBe(1);
								expect(env.callback.firstCall.args[0]).toBeUndefined();
							});
						});

						describe("when stat does not have modified time", () => {
							beforeEach(() => {
								sinon.stub(env.plugin, "applyMtime");
								env.fsStatCallback(null, {});
							});

							afterEach(() => env.plugin.applyMtime.restore());

							it("does not update file system accuracy", () =>
								expect(env.plugin.applyMtime.callCount).toBe(0));

							it("updates file modified timestamp to infinity", () =>
								expect(env.compilation.compiler.fileTimestamps).toEqual({
									foo: Infinity
								}));

							it("calls handler callback without error", () => {
								expect(env.callback.callCount).toBe(1);
								expect(env.callback.firstCall.args[0]).toBeUndefined();
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
								expect(env.plugin.applyMtime.callCount).toBe(1));

							it("updates file modified timestamp to modified time with accuracy value", () =>
								expect(env.compilation.compiler.fileTimestamps).toEqual({
									foo: 1483819069001
								}));

							it("calls handler callback without error", () => {
								expect(env.callback.callCount).toBe(1);
								expect(env.callback.firstCall.args[0]).toBeUndefined();
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
					expect(env.eventBindings[3].name).toBe("after-compile"));

				it("saves copy of compilation file dependecies", () => {
					expect(env.compilation.compiler).toEqual({
						_lastCompilationFileDependencies: ["foo"],
						_lastCompilationContextDependencies: ["bar"]
					});
				});

				it("calls callback", () =>
					expect(env.callback.callCount).toBe(1));
			});
		});
	});
});
