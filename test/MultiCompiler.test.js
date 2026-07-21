"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");

/**
 * @param {import("../").MultiCompilerOptions=} options options
 * @returns {import("../").MultiCompiler} compiler
 */
const createMultiCompiler = (options) => {
	const compiler = /** @type {import("../").MultiCompiler} */ (
		webpack(
			/** @type {import("../").MultiConfiguration} */ (
				Object.assign(
					[
						{
							name: "a",
							context: path.join(__dirname, "fixtures"),
							entry: "./a.js"
						},
						{
							name: "b",
							context: path.join(__dirname, "fixtures"),
							entry: "./b.js"
						}
					],
					options
				)
			)
		)
	);
	compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
		/** @type {unknown} */ (createFsFromVolume(new Volume()))
	);
	compiler.watchFileSystem =
		/** @type {import("../lib/util/fs").WatchFileSystem} */ ({
			watch: (_a, _b, _c, _d, _e, _f, _g) =>
				/** @type {import("../lib/util/fs").Watcher} */ (
					/** @type {unknown} */ (undefined)
				)
		});
	return compiler;
};

describe("MultiCompiler", () => {
	expectNoDeprecations();

	it("should trigger 'run' for each child compiler", (done) => {
		const compiler = createMultiCompiler();
		let called = 0;

		compiler.hooks.run.tap("MultiCompiler test", () => called++);
		compiler.run((err) => {
			if (err) {
				throw err;
			}
			expect(called).toBe(2);
			compiler.close(done);
		});
	});

	it("should trigger 'watchRun' for each child compiler", (done) => {
		const compiler = createMultiCompiler();
		let called = 0;

		compiler.hooks.watchRun.tap("MultiCompiler test", () => called++);
		compiler.watch(
			/** @type {import("../declarations/WebpackOptions").WatchOptions} */ (
				/** @type {unknown} */ (1000)
			),
			(err) => {
				if (err) {
					throw err;
				}
				expect(called).toBe(2);
				compiler.close(done);
			}
		);
	});

	it("should not be running twice at a time (run)", (done) => {
		const compiler = createMultiCompiler();
		compiler.run((err, _stats) => {
			if (err) return done(err);
		});
		compiler.run((err, _stats) => {
			if (err) {
				compiler.close(done);
			}
		});
	});

	it("should not be running twice at a time (watch)", (done) => {
		const compiler = createMultiCompiler();
		compiler.watch({}, (err, _stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, _stats) => {
			if (err) {
				compiler.close(done);
			}
		});
	});

	it("should not be running twice at a time (run - watch)", (done) => {
		const compiler = createMultiCompiler();
		compiler.run((err, _stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, _stats) => {
			if (err) {
				compiler.close(done);
			}
		});
	});

	it("should not be running twice at a time (watch - run)", (done) => {
		const compiler = createMultiCompiler();
		compiler.watch({}, (err, _stats) => {
			if (err) return done(err);
		});
		compiler.run((err, _stats) => {
			if (err) {
				compiler.close(done);
			}
		});
	});

	it("should not be running twice at a time (instance cb)", (done) => {
		const compiler = /** @type {import("../").Compiler} */ (
			webpack(
				{
					context: __dirname,
					mode: "production",
					entry: "./c",
					output: {
						path: "/",
						filename: "bundle.js"
					}
				},
				() => {}
			)
		);
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			if (err) {
				compiler.close(done);
			}
		});
	});

	it("should run again correctly after first compilation", (done) => {
		const compiler = createMultiCompiler();
		compiler.run((err, _stats) => {
			if (err) return done(err);

			compiler.run((err, _stats) => {
				if (err) return done(err);
				compiler.close(done);
			});
		});
	});

	it("should release per-child compilation memory as each child finishes (#15521)", (done) => {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);
			for (const childStats of /** @type {import("../").MultiStats} */ (stats)
				.stats) {
				const compilation = childStats.compilation;
				// codeGenerationResults: only used during seal/emit, dropped.
				expect(
					/** @type {import("../").CodeGenerationResults} */ (
						compilation.codeGenerationResults
					).map.size
				).toBe(0);
				// Stats must still be usable on the slimmed compilation.
				expect(typeof childStats.toJson().hash).toBe("string");
			}
			compiler.close(done);
		});
	});

	it("should release a finished child's codeGenerationResults before a dependent sibling runs (#15521)", (done) => {
		const compiler = /** @type {import("../").MultiCompiler} */ (
			webpack(
				/** @type {import("../").MultiConfiguration} */ (
					Object.assign(
						[
							{
								name: "a",
								context: path.join(__dirname, "fixtures"),
								entry: "./a.js"
							},
							{
								name: "b",
								context: path.join(__dirname, "fixtures"),
								entry: "./b.js",
								dependencies: ["a"]
							}
						],
						{ parallelism: 1 }
					)
				)
			)
		);
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.watchFileSystem =
			/** @type {import("../lib/util/fs").WatchFileSystem} */ ({
				watch: (_a, _b, _c, _d, _e, _f, _g) =>
					/** @type {import("../lib/util/fs").Watcher} */ (
						/** @type {unknown} */ (undefined)
					)
			});
		const [a, b] = compiler.compilers;
		/** @type {import("../").Compilation | undefined} */
		let aCompilation;
		a.hooks.done.tap("test", (stats) => {
			aCompilation = stats.compilation;
		});
		// With dependencies + parallelism 1, b only starts after a is fully
		// done (including a's afterDone release tap). Capture a's map size at
		// that point: it must already be cleared while b is about to build.
		/** @type {number | undefined} */
		let aMapSizeWhenBStarts;
		b.hooks.run.tap("test", () => {
			aMapSizeWhenBStarts = /** @type {import("../").CodeGenerationResults} */ (
				/** @type {import("../").Compilation} */ (aCompilation)
					.codeGenerationResults
			).map.size;
		});
		compiler.run((err) => {
			if (err) return done(err);
			expect(aMapSizeWhenBStarts).toBe(0);
			compiler.close(done);
		});
	});

	it("should watch again correctly after first compilation", (done) => {
		const compiler = createMultiCompiler();
		compiler.run((err, _stats) => {
			if (err) return done(err);

			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				compiler.close(done);
			});
		});
	});

	it("should run again correctly after first closed watch", (done) => {
		const compiler = createMultiCompiler();
		const watching = /** @type {import("../lib/MultiWatching")} */ (
			/** @type {unknown} */ (
				compiler.watch({}, (err, _stats) => {
					if (err) return done(err);
				})
			)
		);
		watching.close(() => {
			compiler.run((err, _stats) => {
				if (err) return done(err);
				compiler.close(done);
			});
		});
	});

	it("should watch again correctly after first closed watch", (done) => {
		const compiler = createMultiCompiler();
		const watching = /** @type {import("../lib/MultiWatching")} */ (
			/** @type {unknown} */ (
				compiler.watch({}, (err, _stats) => {
					if (err) return done(err);
				})
			)
		);
		watching.close(() => {
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				compiler.close(done);
			});
		});
	});

	it("should expose the active MultiWatching on `watching`", (done) => {
		const compiler = createMultiCompiler();
		expect(compiler.watching).toBeUndefined();
		const watching = /** @type {import("../lib/MultiWatching")} */ (
			/** @type {unknown} */ (
				compiler.watch({}, (err, _stats) => {
					if (err) return done(err);
				})
			)
		);
		expect(compiler.watching).toBe(watching);
		watching.close(() => {
			expect(compiler.watching).toBeUndefined();
			compiler.close(done);
		});
	});

	it("should close the active watching and clear `watching` when the compiler is closed directly", (done) => {
		const compiler = createMultiCompiler();
		let watchCloseCalled = 0;
		compiler.hooks.watchClose.tap("MultiCompiler test", () => {
			watchCloseCalled++;
		});
		compiler.watch({}, (err, _stats) => {
			if (err) return done(err);
		});
		expect(compiler.watching).toBeDefined();
		compiler.close(() => {
			expect(compiler.watching).toBeUndefined();
			expect(watchCloseCalled).toBe(1);
			done();
		});
	});

	it("should expose `watching` when dependency validation fails", (done) => {
		const compiler = /** @type {import("../").MultiCompiler} */ (
			webpack(
				/** @type {import("../").MultiConfiguration} */ ([
					{
						name: "a",
						context: path.join(__dirname, "fixtures"),
						entry: "./a.js",
						dependencies: ["missing"]
					},
					{
						name: "b",
						context: path.join(__dirname, "fixtures"),
						entry: "./b.js"
					}
				])
			)
		);
		/** @type {Error | null | undefined} */
		let error;
		const watching = /** @type {import("../lib/MultiWatching")} */ (
			/** @type {unknown} */ (
				compiler.watch({}, (err) => {
					error = err;
				})
			)
		);
		expect(error).toBeInstanceOf(Error);
		expect(compiler.watching).toBe(watching);
		watching.close(() => {
			expect(compiler.watching).toBeUndefined();
			compiler.close(done);
		});
	});

	it("should respect parallelism and dependencies for running", (done) => {
		const compiler = createMultiCompiler(
			/** @type {import("../").MultiCompilerOptions} */ ({
				parallelism: 1,
				2: {
					name: "c",
					context: path.join(__dirname, "fixtures"),
					entry: "./a.js",
					dependencies: ["d", "e"]
				},
				3: {
					name: "d",
					context: path.join(__dirname, "fixtures"),
					entry: "./a.js"
				},
				4: {
					name: "e",
					context: path.join(__dirname, "fixtures"),
					entry: "./a.js"
				}
			})
		);
		/** @type {string[]} */
		const events = [];
		for (const c of compiler.compilers) {
			c.hooks.run.tap("test", () => {
				events.push(`${c.name} run`);
			});
			c.hooks.done.tap("test", () => {
				events.push(`${c.name} done`);
			});
		}
		compiler.run((_err, _stats) => {
			expect(events.join(" ")).toBe(
				"a run a done b run b done d run d done e run e done c run c done"
			);
			compiler.close(done);
		});
	});

	it("should respect parallelism and dependencies for watching", (done) => {
		const compiler = /** @type {import("../").MultiCompiler} */ (
			webpack(
				/** @type {import("../").MultiConfiguration} */ (
					Object.assign(
						[
							{
								name: "a",
								mode: "development",
								context: path.join(__dirname, "fixtures"),
								entry: "./a.js",
								dependencies: ["b", "c"]
							},
							{
								name: "b",
								mode: "development",
								context: path.join(__dirname, "fixtures"),
								entry: "./b.js"
							},
							{
								name: "c",
								mode: "development",
								context: path.join(__dirname, "fixtures"),
								entry: "./a.js"
							}
						],
						{ parallelism: 1 }
					)
				)
			)
		);
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		/** @type {((...args: EXPECTED_ANY[]) => void)[]} */
		const watchCallbacks = [];
		/** @type {((...args: EXPECTED_ANY[]) => void)[]} */
		const watchCallbacksUndelayed = [];
		compiler.watchFileSystem =
			/** @type {import("../lib/util/fs").WatchFileSystem} */ ({
				watch(
					files,
					directories,
					missing,
					startTime,
					options,
					callback,
					callbackUndelayed
				) {
					watchCallbacks.push(callback);
					watchCallbacksUndelayed.push(callbackUndelayed);
					return /** @type {import("../lib/util/fs").Watcher} */ (
						/** @type {unknown} */ (undefined)
					);
				}
			});
		/** @type {string[]} */
		const events = [];
		for (const c of compiler.compilers) {
			c.hooks.invalid.tap("test", () => {
				events.push(`${c.name} invalid`);
			});
			c.hooks.watchRun.tap("test", () => {
				events.push(`${c.name} run`);
			});
			c.hooks.done.tap("test", () => {
				events.push(`${c.name} done`);
			});
		}

		let update = 0;
		compiler.watch({}, (err, stats) => {
			if (err) return done(err);
			const info = () =>
				/** @type {import("../").MultiStats} */ (stats).toString({
					preset: "summary",
					version: false
				});
			switch (update++) {
				case 0:
					expect(info()).toMatchInlineSnapshot(`
							"a:
							  a compiled successfully

							b:
							  b compiled successfully

							c:
							  c compiled successfully"
					`);
					expect(compiler.compilers[0].modifiedFiles).toBeUndefined();
					expect(compiler.compilers[0].removedFiles).toBeUndefined();
					expect(events).toMatchInlineSnapshot(`
				Array [
				  "b run",
				  "b done",
				  "c run",
				  "c done",
				  "a run",
				  "a done",
				]
			`);
					events.length = 0;
					// wait until watching begins
					setTimeout(() => {
						watchCallbacksUndelayed[0]();
						watchCallbacks[0](null, new Map(), new Map(), new Set(), new Set());
					}, 100);
					break;
				case 1:
					expect(info()).toMatchInlineSnapshot(`
				"a:
				  a compiled successfully

				b:
				  b compiled successfully"
			`);
					expect(compiler.compilers[1].modifiedFiles).toEqual(new Set());
					expect(compiler.compilers[1].removedFiles).toEqual(new Set());
					expect(events).toMatchInlineSnapshot(`
				Array [
				  "b invalid",
				  "b run",
				  "b done",
				  "a invalid",
				  "a run",
				  "a done",
				]
			`);
					watchCallbacksUndelayed[2]();
					watchCallbacks[2](null, new Map(), new Map(), new Set(), new Set());
					break;
				case 2:
					expect(info()).toMatchInlineSnapshot(`
				"a:
				  a compiled successfully"
			`);
					expect(events).toMatchInlineSnapshot(`
				Array [
				  "b invalid",
				  "b run",
				  "b done",
				  "a invalid",
				  "a run",
				  "a done",
				  "a invalid",
				  "a run",
				  "a done",
				]
			`);
					events.length = 0;
					watchCallbacksUndelayed[0]();
					watchCallbacksUndelayed[1]();
					watchCallbacks[0](null, new Map(), new Map(), new Set(), new Set());
					watchCallbacks[1](null, new Map(), new Map(), new Set(), new Set());
					break;
				case 3:
					expect(info()).toMatchInlineSnapshot(`
				"a:
				  a compiled successfully

				b:
				  b compiled successfully

				c:
				  c compiled successfully"
			`);
					expect(events).toMatchInlineSnapshot(`
				Array [
				  "b invalid",
				  "c invalid",
				  "b run",
				  "b done",
				  "c run",
				  "c done",
				  "a invalid",
				  "a run",
				  "a done",
				]
			`);
					events.length = 0;
					compiler.close(done);
					break;
				default:
					done(new Error("unexpected"));
			}
		});
	});

	it("should respect parallelism when using invalidate", (done) => {
		const compiler = /** @type {import("../").MultiCompiler} */ (
			webpack(
				/** @type {import("../").MultiConfiguration} */ (
					/** @type {unknown} */ (
						Object.assign(
							[
								{
									name: "a",
									mode: "development",
									entry: { a: "./a.js" },
									context: path.join(__dirname, "fixtures")
								},
								{
									name: "b",
									mode: "development",
									entry: { b: "./b.js" },
									context: path.join(__dirname, "fixtures")
								}
							],
							{ parallelism: 1 }
						)
					)
				)
			)
		);

		/** @type {string[]} */
		const events = [];
		for (const c of compiler.compilers) {
			c.hooks.invalid.tap("test", () => {
				events.push(`${c.name} invalid`);
			});
			c.hooks.watchRun.tap("test", () => {
				events.push(`${c.name} run`);
			});
			c.hooks.done.tap("test", () => {
				events.push(`${c.name} done`);
			});
		}

		compiler.watchFileSystem = {
			watch: /** @type {import("../lib/util/fs").WatchMethod} */ (
				/** @type {unknown} */ (/** @type {() => void} */ (() => {}))
			)
		};
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);

		let state = 0;
		const watching = /** @type {import("../lib/MultiWatching")} */ (
			/** @type {unknown} */ (
				compiler.watch({}, (error) => {
					if (error) {
						done(error);
						return;
					}
					if (state !== 0) return;
					state++;

					expect(events).toMatchInlineSnapshot(`
			Array [
			  "a run",
			  "a done",
			  "b run",
			  "b done",
			]
		`);
					events.length = 0;

					watching.invalidate((err) => {
						try {
							if (err) return done(err);

							expect(events).toMatchInlineSnapshot(`
				Array [
				  "a invalid",
				  "b invalid",
				  "a run",
				  "a done",
				  "b run",
				  "b done",
				]
			`);
							events.length = 0;
							expect(state).toBe(1);
							setTimeout(() => {
								compiler.close(done);
							}, 1000);
						} catch (err) {
							console.error(err);
							done(err);
						}
					});
				})
			)
		);
	}, 2000);

	it("should respect dependencies when using invalidate", (done) => {
		const compiler = /** @type {import("../").MultiCompiler} */ (
			webpack([
				{
					name: "a",
					mode: "development",
					entry: { a: "./a.js" },
					context: path.join(__dirname, "fixtures"),
					dependencies: ["b"]
				},
				{
					name: "b",
					mode: "development",
					entry: { b: "./b.js" },
					context: path.join(__dirname, "fixtures")
				}
			])
		);

		/** @type {string[]} */
		const events = [];
		for (const c of compiler.compilers) {
			c.hooks.invalid.tap("test", () => {
				events.push(`${c.name} invalid`);
			});
			c.hooks.watchRun.tap("test", () => {
				events.push(`${c.name} run`);
			});
			c.hooks.done.tap("test", () => {
				events.push(`${c.name} done`);
			});
		}

		compiler.watchFileSystem = {
			watch: /** @type {import("../lib/util/fs").WatchMethod} */ (
				/** @type {unknown} */ (/** @type {() => void} */ (() => {}))
			)
		};
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);

		let state = 0;
		const watching = /** @type {import("../lib/MultiWatching")} */ (
			/** @type {unknown} */ (
				compiler.watch({}, (error) => {
					if (error) {
						done(error);
						return;
					}
					if (state !== 0) return;
					state++;

					expect(events).toMatchInlineSnapshot(`
			Array [
			  "b run",
			  "b done",
			  "a run",
			  "a done",
			]
		`);
					events.length = 0;

					watching.invalidate((err) => {
						try {
							if (err) return done(err);

							expect(events).toMatchInlineSnapshot(`
				Array [
				  "a invalid",
				  "b invalid",
				  "b run",
				  "b done",
				  "a run",
				  "a done",
				]
			`);
							events.length = 0;
							expect(state).toBe(1);
							setTimeout(() => {
								compiler.close(done);
							}, 1000);
						} catch (err) {
							console.error(err);
							done(err);
						}
					});
				})
			)
		);
	}, 2000);

	it("shouldn't hang when invalidating watchers", (done) => {
		const entriesA = /** @type {Record<string, string>} */ ({ a: "./a.js" });
		const entriesB = /** @type {Record<string, string>} */ ({ b: "./b.js" });
		const compiler = /** @type {import("../").MultiCompiler} */ (
			webpack([
				{
					name: "a",
					mode: "development",
					entry: () => entriesA,
					context: path.join(__dirname, "fixtures")
				},
				{
					name: "b",
					mode: "development",
					entry: () => entriesB,
					context: path.join(__dirname, "fixtures")
				}
			])
		);

		compiler.watchFileSystem = {
			watch: /** @type {import("../lib/util/fs").WatchMethod} */ (
				/** @type {unknown} */ (/** @type {() => void} */ (() => {}))
			)
		};
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);

		const watching = /** @type {import("../lib/MultiWatching")} */ (
			/** @type {unknown} */ (
				compiler.watch({}, (error) => {
					if (error) {
						done(error);
						return;
					}

					entriesA.b = "./b.js";
					entriesB.a = "./a.js";

					watching.invalidate((err) => {
						if (err) return done(err);
						compiler.close(done);
					});
				})
			)
		);
	}, 2000);

	it("shouldn't hang when invalidating during build", (done) => {
		const compiler = /** @type {import("../").MultiCompiler} */ (
			webpack(
				/** @type {import("../").MultiConfiguration} */ (
					Object.assign([
						{
							name: "a",
							mode: "development",
							context: path.join(__dirname, "fixtures"),
							entry: "./a.js"
						},
						{
							name: "b",
							mode: "development",
							context: path.join(__dirname, "fixtures"),
							entry: "./b.js",
							dependencies: ["a"]
						}
					])
				)
			)
		);
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		/** @type {((...args: EXPECTED_ANY[]) => void)[]} */
		const watchCallbacks = [];
		/** @type {((...args: EXPECTED_ANY[]) => void)[]} */
		const watchCallbacksUndelayed = [];
		let firstRun = true;
		compiler.watchFileSystem =
			/** @type {import("../lib/util/fs").WatchFileSystem} */ ({
				watch(
					files,
					directories,
					missing,
					startTime,
					options,
					callback,
					callbackUndelayed
				) {
					watchCallbacks.push(callback);
					watchCallbacksUndelayed.push(callbackUndelayed);
					if (
						firstRun &&
						/** @type {Set<string>} */ (files).has(
							path.join(__dirname, "fixtures", "a.js")
						)
					) {
						process.nextTick(() => {
							callback(null, new Map(), new Map(), new Set(), new Set());
						});
						firstRun = false;
					}
					return /** @type {import("../lib/util/fs").Watcher} */ (
						/** @type {unknown} */ (undefined)
					);
				}
			});
		compiler.watch({}, (err, _stats) => {
			if (err) return done(err);
			compiler.close(done);
		});
	});
});
