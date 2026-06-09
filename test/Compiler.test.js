"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const Stats = require("../lib/Stats");
const captureStdio = require("./helpers/captureStdio");
const deprecationTracking = require("./helpers/deprecationTracking");

describe("Compiler", () => {
	/**
	 * @typedef {{ mkdir: string[], writeFile: unknown[] }} CompileLogs
	 * @typedef {import("../").StatsCompilation & { logs?: CompileLogs }} CompileStats
	 */
	/**
	 * @param {string} entry entry file
	 * @param {import("../").Configuration} options webpack options
	 * @param {(stats: CompileStats, files: Record<string, string>, compilation: import("../").Compilation) => void} callback done callback
	 */
	function compile(entry, options, callback) {
		const noOutputPath = !options.output || !options.output.path;

		const webpack = require("..");

		/** @type {import("../").WebpackOptionsNormalized} */
		const normalizedOptions =
			webpack.config.getNormalizedWebpackOptions(options);
		if (!normalizedOptions.mode) normalizedOptions.mode = "production";
		normalizedOptions.entry = /** @type {import("../").EntryNormalized} */ (
			/** @type {unknown} */ (entry)
		);
		normalizedOptions.context = path.join(__dirname, "fixtures");
		if (noOutputPath) normalizedOptions.output.path = "/";
		normalizedOptions.output.pathinfo = true;
		normalizedOptions.optimization = {
			minimize: false
		};
		/** @type {{ mkdir: string[], writeFile: unknown[] }} */
		const logs = {
			mkdir: [],
			writeFile: []
		};

		const c = webpack(
			/** @type {import("../").Configuration} */ (
				/** @type {unknown} */ (normalizedOptions)
			)
		);
		/** @type {Record<string, string>} */
		const files = {};
		c.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ ({
				mkdir(
					/** @type {string} */ path,
					/** @type {(err: null | NodeJS.ErrnoException) => void} */ callback
				) {
					logs.mkdir.push(path);
					const err = /** @type {NodeJS.ErrnoException} */ (new Error("error"));
					err.code = "EEXIST";
					callback(err);
				},
				writeFile(
					/** @type {string} */ name,
					/** @type {Buffer} */ content,
					/** @type {() => void} */ callback
				) {
					logs.writeFile.push(name, content);
					files[name] = content.toString("utf8");
					callback();
				},
				stat(
					/** @type {string} */ _path,
					/** @type {(err: Error) => void} */ callback
				) {
					callback(new Error("ENOENT"));
				}
			})
		);
		c.hooks.compilation.tap(
			"CompilerTest",
			(compilation) => (compilation.bail = true)
		);
		c.run(
			(
				err,
				/** @type {import("../").Stats & import("../").StatsCompilation & { logs?: CompileLogs } | undefined} */
				stats
			) => {
				if (err) throw err;
				expect(typeof stats).toBe("object");
				const compilation = /** @type {import("../").Stats} */ (stats)
					.compilation;
				stats =
					/** @type {import("../").Stats & import("../").StatsCompilation & { logs?: CompileLogs }} */ (
						/** @type {import("../").Stats} */ (stats).toJson({
							modules: true,
							reasons: true
						})
					);
				expect(typeof stats).toBe("object");
				expect(stats).toHaveProperty("errors");
				expect(Array.isArray(stats.errors)).toBe(true);
				if (
					/** @type {import("../").StatsError[]} */ (stats.errors).length > 0
				) {
					const errors = /** @type {import("../").StatsError[]} */ (
						stats.errors
					);
					expect(errors[0]).toBeInstanceOf(Error);
					throw errors[0];
				}
				stats.logs = logs;
				c.close((err) => {
					if (err) {
						return /** @type {(e: Error) => void} */ (
							/** @type {unknown} */ (callback)
						)(err);
					}
					callback(
						/** @type {CompileStats} */ (stats),
						files,
						/** @type {import("../").Compilation} */ (compilation)
					);
				});
			}
		);
	}

	/** @type {import("../").Compiler} */
	let compiler;

	afterEach((callback) => {
		if (compiler) {
			compiler.close(callback);
			compiler = /** @type {import("../").Compiler} */ (
				/** @type {unknown} */ (undefined)
			);
		} else {
			callback();
		}
	});

	it("should compile a single file to deep output", (done) => {
		compile(
			"./c",
			{
				output: {
					path: "/what",
					filename: "the/hell.js"
				}
			},
			(stats, _files) => {
				expect(/** @type {CompileLogs} */ (stats.logs).mkdir).toEqual([
					"/what",
					"/what/the"
				]);
				done();
			}
		);
	});

	it("should compile a single file", (done) => {
		compile("./c", {}, (stats, files) => {
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toMatch("function __webpack_require__(");
			expect(bundle).toMatch(/__webpack_require__\(\/\*! \.\/a \*\/ \w+\);/);
			expect(bundle).toMatch("./c.js");
			expect(bundle).toMatch("./a.js");
			expect(bundle).toMatch("This is a");
			expect(bundle).toMatch("This is c");
			expect(bundle).not.toMatch("2: function(");
			expect(bundle).not.toMatch("window");
			expect(bundle).not.toMatch("jsonp");
			expect(bundle).not.toMatch("fixtures");
			done();
		});
	});

	it("should compile a complex file", (done) => {
		compile("./main1", {}, (stats, files) => {
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toMatch("function __webpack_require__(");
			expect(bundle).toMatch("__webpack_require__(/*! ./a */");
			expect(bundle).toMatch("./main1.js");
			expect(bundle).toMatch("./a.js");
			expect(bundle).toMatch("./b.js");
			expect(bundle).toMatch("./node_modules/m1/a.js");
			expect(bundle).toMatch("This is a");
			expect(bundle).toMatch("This is b");
			expect(bundle).toMatch("This is m1/a");
			expect(bundle).not.toMatch("4: function(");
			expect(bundle).not.toMatch("window");
			expect(bundle).not.toMatch("jsonp");
			expect(bundle).not.toMatch("fixtures");
			done();
		});
	});

	it("should compile a file with transitive dependencies", (done) => {
		compile("./abc", {}, (stats, files) => {
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toMatch("function __webpack_require__(");
			expect(bundle).toMatch("__webpack_require__(/*! ./a */");
			expect(bundle).toMatch("__webpack_require__(/*! ./b */");
			expect(bundle).toMatch("__webpack_require__(/*! ./c */");
			expect(bundle).toMatch("./abc.js");
			expect(bundle).toMatch("./a.js");
			expect(bundle).toMatch("./b.js");
			expect(bundle).toMatch("./c.js");
			expect(bundle).toMatch("This is a");
			expect(bundle).toMatch("This is b");
			expect(bundle).toMatch("This is c");
			expect(bundle).not.toMatch("4: function(");
			expect(bundle).not.toMatch("window");
			expect(bundle).not.toMatch("jsonp");
			expect(bundle).not.toMatch("fixtures");
			done();
		});
	});

	it("should compile a file with multiple chunks", (done) => {
		compile("./chunks", {}, (stats, files) => {
			expect(stats.chunks).toHaveLength(2);
			expect(Object.keys(files)).toEqual(["/main.js", "/78.js"]);
			const bundle = files["/main.js"];
			const chunk = files["/78.js"];
			expect(bundle).toMatch("function __webpack_require__(");
			expect(bundle).toMatch("__webpack_require__(/*! ./b */");
			expect(chunk).not.toMatch("__webpack_require__(/* ./b */");
			expect(bundle).toMatch("./chunks.js");
			expect(chunk).toMatch("./a.js");
			expect(chunk).toMatch("./b.js");
			expect(chunk).toMatch("This is a");
			expect(bundle).not.toMatch("This is a");
			expect(chunk).toMatch("This is b");
			expect(bundle).not.toMatch("This is b");
			expect(bundle).not.toMatch("4: function(");
			expect(bundle).not.toMatch("fixtures");
			expect(chunk).not.toMatch("fixtures");
			expect(bundle).toMatch("webpackChunk");
			expect(chunk).toMatch('self["webpackChunk"] || []).push');
			done();
		});
	});

	// cspell:word asmjs
	it("should not evaluate constants in asm.js", (done) => {
		compile("./asmjs", {}, (stats, files) => {
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toMatch('"use asm";');
			expect(bundle).toMatch("101");
			expect(bundle).toMatch("102");
			expect(bundle).toMatch("103");
			expect(bundle).toMatch("104");
			expect(bundle).toMatch("105");
			expect(bundle).not.toMatch("106");
			expect(bundle).not.toMatch("107");
			expect(bundle).not.toMatch("108");
			expect(bundle).toMatch("109");
			expect(bundle).toMatch("110");
			done();
		});
	});

	describe("methods", () => {
		/** @type {import("../").Compiler} */
		let compiler;

		beforeEach(() => {
			const webpack = require("..");

			compiler = webpack({
				entry: "./c",
				context: path.join(__dirname, "fixtures"),
				output: {
					path: "/directory",
					pathinfo: true
				}
			});
		});

		afterEach((callback) => {
			if (compiler) {
				compiler.close(callback);
				compiler = /** @type {import("../").Compiler} */ (
					/** @type {unknown} */ (undefined)
				);
			} else {
				callback();
			}
		});

		it("default platform info", (done) => {
			const platform = compiler.platform;
			expect(platform.web).toBe(true);
			expect(platform.node).toBe(false);
			done();
		});

		describe("purgeInputFileSystem", () => {
			it("invokes purge() if inputFileSystem.purge", (done) => {
				const mockPurge = jest.fn();
				compiler.inputFileSystem =
					/** @type {import("../").InputFileSystem} */ (
						/** @type {unknown} */ ({ purge: mockPurge })
					);
				compiler.purgeInputFileSystem();
				expect(mockPurge).toHaveBeenCalledTimes(1);
				done();
			});

			it("does NOT invoke purge() if !inputFileSystem.purge", (done) => {
				const mockPurge = jest.fn();
				compiler.inputFileSystem = null;
				compiler.purgeInputFileSystem();
				expect(mockPurge).not.toHaveBeenCalled();
				done();
			});
		});

		describe("isChild", () => {
			it("returns booleanized this.parentCompilation", (done) => {
				const c =
					/** @type {Omit<import("../").Compiler, "parentCompilation"> & { parentCompilation: unknown }} */ (
						/** @type {unknown} */ (compiler)
					);
				c.parentCompilation = "stringyStringString";
				const response1 = compiler.isChild();
				expect(response1).toBe(true);

				c.parentCompilation = 123456789;
				const response2 = compiler.isChild();
				expect(response2).toBe(true);

				c.parentCompilation = {
					what: "I belong to an object"
				};
				const response3 = compiler.isChild();
				expect(response3).toBe(true);

				c.parentCompilation = ["Array", 123, true, null, [], () => {}];
				const response4 = compiler.isChild();
				expect(response4).toBe(true);

				c.parentCompilation = false;
				const response5 = compiler.isChild();
				expect(response5).toBe(false);

				c.parentCompilation = 0;
				const response6 = compiler.isChild();
				expect(response6).toBe(false);

				c.parentCompilation = null;
				const response7 = compiler.isChild();
				expect(response7).toBe(false);

				c.parentCompilation = "";
				const response8 = compiler.isChild();
				expect(response8).toBe(false);

				c.parentCompilation = Number.NaN;
				const response9 = compiler.isChild();
				expect(response9).toBe(false);
				done();
			});
		});
	});

	it("platformPlugin", (done) => {
		const webpack = require("..");

		const compiler = webpack(
			/** @type {import("../").Configuration} */ ({
				entry: "./c",
				context: path.join(__dirname, "fixtures"),
				output: {
					path: "/directory"
				},
				plugins: [
					new (require("../lib/PlatformPlugin"))({ node: true }),
					(compiler) => {
						compiler.hooks.afterEnvironment.tap("test", () => {
							const platform = compiler.platform;
							expect(platform.node).toBe(true);
							expect(platform.web).toBe(true);
						});
					}
				]
			})
		);
		compiler.close(done);
	});

	it("should release codeGenerationResults on close while Stats stays usable and afterDone still sees them (#15521)", (done) => {
		const webpack = require("..");

		const compiler = webpack({
			context: path.join(__dirname, "fixtures"),
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		/** @type {number} */
		let sizeSeenByAfterDone;
		compiler.hooks.afterDone.tap("Test", (stats) => {
			sizeSeenByAfterDone = /** @type {import("../").CodeGenerationResults} */ (
				stats.compilation.codeGenerationResults
			).map.size;
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			const { compilation } = /** @type {import("../").Stats} */ (stats);
			expect(
				/** @type {import("../").CodeGenerationResults} */ (
					compilation.codeGenerationResults
				).map.size
			).toBeGreaterThan(0);
			// close() runs inside the run callback, i.e. before Compiler.run fires
			// afterDone. The release is deferred a microtask, so afterDone still
			// observes the results; assert via setTimeout once the defer ran.
			compiler.close((closeErr) => {
				if (closeErr) return done(closeErr);
				setTimeout(() => {
					expect(sizeSeenByAfterDone).toBeGreaterThan(0);
					expect(
						/** @type {import("../").CodeGenerationResults} */ (
							compilation.codeGenerationResults
						).map.size
					).toBe(0);
					expect(
						typeof (/** @type {import("../").Stats} */ (stats).toJson().hash)
					).toBe("string");
					done();
				}, 0);
			});
		});
	});

	it("should not emit on errors", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./missing",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		/** @type {import("../").Compiler} */ (compiler).run((err, _stats) => {
			if (err) return done(err);
			if (
				/** @type {import("memfs").IFs} */ (
					/** @type {import("../").Compiler} */ (compiler).outputFileSystem
				).existsSync("/bundle.js")
			) {
				return done(new Error("Bundle should not be created on error"));
			}
			done();
		});
	});

	it("should bubble up errors when wrapped in a promise and bail is true", async () => {
		let errored;
		try {
			const createCompiler = (
				/** @type {import("../").Configuration} */ options
			) =>
				new Promise((resolve, reject) => {
					const webpack = require("..");

					const c = webpack(options);
					c.run((err, stats) => {
						if (err) {
							reject(err);
						}
						if (stats !== undefined && "errors" in stats) {
							reject(err);
						} else {
							resolve(stats);
						}
					});
				});
			compiler = await createCompiler({
				context: __dirname,
				mode: "production",
				entry: "./missing-file",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				bail: true
			});
		} catch (err) {
			errored = err;
		}

		if (!errored) {
			throw new Error("Should throw an error");
		}

		expect(errored.toString()).toMatch(
			"ModuleNotFoundError: Module not found: Error: Can't resolve './missing-file'"
		);
	});

	it("should not emit compilation errors in async (watch)", async () => {
		const createStats = (/** @type {import("../").Configuration} */ options) =>
			new Promise((resolve, reject) => {
				const webpack = require("..");

				const c = webpack(options);
				c.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
					/** @type {unknown} */ (createFsFromVolume(new Volume()))
				);
				const watching = /** @type {import("../").Watching} */ (
					c.watch({}, (err, stats) => {
						/** @type {import("../").Watching} */ (watching).close(() => {
							if (err) return reject(err);
							resolve(stats);
						});
					})
				);
			});
		const stats = await createStats({
			context: __dirname,
			mode: "production",
			entry: "./missing-file",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		expect(stats).toBeInstanceOf(Stats);
	});

	it("should not emit on errors (watch)", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./missing",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const watching = /** @type {import("../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				/** @type {{ close: () => void }} */ (
					/** @type {unknown} */ (watching)
				).close();
				if (err) return done(err);
				if (
					/** @type {import("memfs").IFs} */ (
						/** @type {import("../").Compiler} */ (compiler).outputFileSystem
					).existsSync("/bundle.js")
				) {
					return done(new Error("Bundle should not be created on error"));
				}
				done();
			})
		);
	});

	it("should not be running twice at a time (run)", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			if (err) return done(err);
		});
		compiler.run((err, _stats) => {
			if (err) return done();
		});
	});

	it("should not be running twice at a time (watch)", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.watch({}, (err, _stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, _stats) => {
			if (err) return done();
		});
	});

	it("should not be running twice at a time (run - watch)", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, _stats) => {
			if (err) return done();
		});
	});

	it("should not be running twice at a time (watch - run)", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.watch({}, (err, _stats) => {
			if (err) return done(err);
		});
		compiler.run((err, _stats) => {
			if (err) return done();
		});
	});

	it("should not be running twice at a time (instance cb)", (done) => {
		const webpack = require("..");

		compiler = /** @type {import("../").Compiler} */ (
			webpack(
				{
					context: __dirname,
					mode: "production",
					entry: "./c",
					output: {
						path: "/directory",
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
			if (err) return done();
		});
	});

	it("should run again correctly after first compilation", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, stats1) => {
			if (err) return done(err);

			compiler.run((err, _stats2) => {
				if (err) return done(err);
				expect(
					/** @type {import("../").Stats} */ (stats1).toString({ all: true })
				).toBeTypeOf("string");
				done();
			});
		});
	});

	it("should set idle state once when run finishes", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		let idle = compiler.idle;
		let idleWriteCount = 0;
		Object.defineProperty(compiler, "idle", {
			configurable: true,
			enumerable: true,
			get() {
				return idle;
			},
			set(value) {
				idleWriteCount++;
				idle = value;
			}
		});
		compiler.run((err, _stats) => {
			if (err) return done(err);
			expect(idleWriteCount).toBe(1);
			done();
		});
	});

	it("should watch again correctly after first compilation", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			if (err) return done(err);

			const watching = /** @type {import("../").Watching} */ (
				compiler.watch({}, (err, _stats) => {
					if (err) return done(err);
					watching.close(done);
				})
			);
		});
	});

	it("should run again correctly after first closed watch", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const watching = /** @type {import("../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
			})
		);
		watching.close(() => {
			compiler.run((err, _stats) => {
				if (err) return done(err);
				done();
			});
		});
	});

	it("should set compiler.watching correctly", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const watching = /** @type {import("../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				watching.close(done);
			})
		);
		expect(compiler.watching).toBe(watching);
	});

	it("should watch again correctly after first closed watch", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const watching = /** @type {import("../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
			})
		);
		watching.close(() => {
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				done();
			});
		});
	});

	it("should run again correctly inside afterDone hook", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		let once = true;
		compiler.hooks.afterDone.tap("RunAgainTest", () => {
			if (!once) return;
			once = false;
			compiler.run((err, _stats) => {
				if (err) return done(err);
				done();
			});
		});
		compiler.run((err, _stats) => {
			if (err) return done(err);
		});
	});

	it("should call afterDone hook after other callbacks (run)", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const runCb = jest.fn();
		const doneHookCb = jest.fn();
		compiler.hooks.done.tap("afterDoneRunTest", doneHookCb);
		compiler.hooks.afterDone.tap("afterDoneRunTest", () => {
			expect(runCb).toHaveBeenCalled();
			expect(doneHookCb).toHaveBeenCalled();
			done();
		});
		compiler.run((err, _stats) => {
			if (err) return done(err);
			runCb();
		});
	});

	it("should call afterDone hook after other callbacks (instance cb)", (done) => {
		const instanceCb = jest.fn();

		const webpack = require("..");

		compiler = /** @type {import("../").Compiler} */ (
			webpack(
				{
					context: __dirname,
					mode: "production",
					entry: "./c",
					output: {
						path: "/directory",
						filename: "bundle.js"
					}
				},
				(err, _stats) => {
					if (err) return done(err);
					instanceCb();
				}
			)
		);
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const doneHookCb = jest.fn();
		compiler.hooks.done.tap("afterDoneRunTest", doneHookCb);
		compiler.hooks.afterDone.tap("afterDoneRunTest", () => {
			expect(instanceCb).toHaveBeenCalled();
			expect(doneHookCb).toHaveBeenCalled();
			done();
		});
	});

	it("should call afterDone hook after other callbacks (watch)", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const invalidHookCb = jest.fn();
		const doneHookCb = jest.fn();
		const watchCb = jest.fn();
		const invalidateCb = jest.fn();
		compiler.hooks.invalid.tap("afterDoneWatchTest", invalidHookCb);
		compiler.hooks.done.tap("afterDoneWatchTest", doneHookCb);
		compiler.hooks.afterDone.tap("afterDoneWatchTest", () => {
			expect(invalidHookCb).toHaveBeenCalled();
			expect(doneHookCb).toHaveBeenCalled();
			expect(watchCb).toHaveBeenCalled();
			expect(invalidateCb).toHaveBeenCalled();
			watching.close(done);
		});
		const watching = /** @type {import("../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				watchCb();
			})
		);
		process.nextTick(() => {
			watching.invalidate(invalidateCb);
		});
	});

	it("should call afterDone hook after other callbacks (watch close)", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const invalidHookCb = jest.fn();
		const watchCloseCb = jest.fn();
		const watchCloseHookCb = jest.fn();
		const invalidateCb = jest.fn();
		compiler.hooks.invalid.tap("afterDoneWatchTest", invalidHookCb);
		compiler.hooks.watchClose.tap("afterDoneWatchTest", watchCloseHookCb);
		compiler.hooks.afterDone.tap("afterDoneWatchTest", () => {
			expect(invalidHookCb).toHaveBeenCalled();
			expect(watchCloseCb).toHaveBeenCalled();
			expect(watchCloseHookCb).toHaveBeenCalled();
			expect(invalidateCb).toHaveBeenCalled();
			done();
		});
		const watch = /** @type {import("../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				watch.close(watchCloseCb);
			})
		);
		process.nextTick(() => {
			watch.invalidate(invalidateCb);
		});
	});

	it("should flag watchMode as true in watch", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});

		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);

		const watch = /** @type {import("../").Watching} */ (
			compiler.watch({}, (err) => {
				if (err) return done(err);
				expect(compiler.watchMode).toBeTruthy();
				watch.close(() => {
					expect(compiler.watchMode).toBeFalsy();
					done();
				});
			})
		);
	});

	it("should use cache on second run call", (done) => {
		const webpack = require("..");

		compiler = webpack({
			context: __dirname,
			mode: "development",
			devtool: false,
			entry: "./fixtures/count-loader!./fixtures/count-loader",
			output: {
				path: "/directory"
			}
		});
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run(() => {
			compiler.run(() => {
				const result = /** @type {import("memfs").IFs} */ (
					compiler.outputFileSystem
				).readFileSync("/directory/main.js", "utf8");
				expect(result).toContain("module.exports = 0;");
				done();
			});
		});
	});

	it("should call the failed-hook on error", (done) => {
		const failedSpy = jest.fn();

		const webpack = require("..");

		compiler = webpack({
			bail: true,
			context: __dirname,
			mode: "production",
			entry: "./missing",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.hooks.failed.tap("CompilerTest", failedSpy);
		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			expect(err).toBeTruthy();
			expect(failedSpy).toHaveBeenCalledTimes(1);
			expect(failedSpy).toHaveBeenCalledWith(err);
			done();
		});
	});

	it("should deprecate when watch option is used without callback", () => {
		const tracker = deprecationTracking.start();

		const webpack = require("..");

		compiler = webpack({
			watch: true
		});
		const deprecations = tracker();
		expect(deprecations).toEqual([
			expect.objectContaining({
				code: "DEP_WEBPACK_WATCH_WITHOUT_CALLBACK"
			})
		]);
	});

	describe("infrastructure logging", () => {
		/** @type {ReturnType<typeof captureStdio>} */
		let capture;

		beforeEach(() => {
			capture = captureStdio(process.stderr, undefined);
		});

		afterEach(() => {
			capture.restore();
		});

		const escapeAnsi = (/** @type {string} */ stringRaw) =>
			stringRaw
				.replace(/\u001B\[1m\u001B\[([0-9;]*)m/g, "<CLR=$1,BOLD>")
				.replace(/\u001B\[1m/g, "<CLR=BOLD>")
				.replace(/\u001B\[39m\u001B\[22m/g, "</CLR>")
				.replace(/\u001B\[([0-9;]*)m/g, "<CLR=$1>");
		class MyPlugin {
			/** @param {import("../").Compiler} compiler webpack compiler */
			apply(compiler) {
				const logger = compiler.getInfrastructureLogger("MyPlugin");
				logger.time("Time");
				logger.group("Group");
				logger.error("Error");
				logger.warn("Warning");
				logger.info("Info");
				logger.log("Log");
				logger.debug("Debug");
				logger.groupCollapsed("Collapsed group");
				logger.log("Log inside collapsed group");
				logger.groupEnd();
				logger.groupEnd();
				logger.timeEnd("Time");
			}
		}

		it("should log to the console (verbose)", (done) => {
			const webpack = require("..");

			compiler = webpack({
				context: path.join(__dirname, "fixtures"),
				entry: "./a",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				infrastructureLogging: {
					level: "verbose"
				},
				plugins: [new MyPlugin()]
			});
			compiler.outputFileSystem =
				/** @type {import("../").OutputFileSystem} */ (
					/** @type {unknown} */ (createFsFromVolume(new Volume()))
				);
			compiler.run((_err, _stats) => {
				expect(capture.toString().replace(/[\d.]+ ms/, "X ms"))
					.toMatchInlineSnapshot(`
"<-> [MyPlugin] Group
  <e> [MyPlugin] Error
  <w> [MyPlugin] Warning
  <i> [MyPlugin] Info
      [MyPlugin] Log
  <-> [MyPlugin] Collapsed group
        [MyPlugin] Log inside collapsed group
<t> [MyPlugin] Time: X ms
"
`);
				done();
			});
		});

		it("should log to the console (debug mode)", (done) => {
			const webpack = require("..");

			compiler = webpack({
				context: path.join(__dirname, "fixtures"),
				entry: "./a",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				infrastructureLogging: {
					level: "error",
					debug: /MyPlugin/
				},
				plugins: [new MyPlugin()]
			});
			compiler.outputFileSystem =
				/** @type {import("../").OutputFileSystem} */ (
					/** @type {unknown} */ (createFsFromVolume(new Volume()))
				);
			compiler.run((_err, _stats) => {
				expect(capture.toString().replace(/[\d.]+ ms/, "X ms"))
					.toMatchInlineSnapshot(`
"<-> [MyPlugin] Group
  <e> [MyPlugin] Error
  <w> [MyPlugin] Warning
  <i> [MyPlugin] Info
      [MyPlugin] Log
      [MyPlugin] Debug
  <-> [MyPlugin] Collapsed group
        [MyPlugin] Log inside collapsed group
<t> [MyPlugin] Time: X ms
"
`);
				done();
			});
		});

		it("should log to the console (none)", (done) => {
			const webpack = require("..");

			compiler = webpack({
				context: path.join(__dirname, "fixtures"),
				entry: "./a",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				infrastructureLogging: {
					level: "none"
				},
				plugins: [new MyPlugin()]
			});
			compiler.outputFileSystem =
				/** @type {import("../").OutputFileSystem} */ (
					/** @type {unknown} */ (createFsFromVolume(new Volume()))
				);
			compiler.run((_err, _stats) => {
				expect(capture.toString()).toMatchInlineSnapshot('""');
				done();
			});
		});

		it("should log to the console with colors (verbose)", (done) => {
			const webpack = require("..");

			compiler = webpack({
				context: path.join(__dirname, "fixtures"),
				entry: "./a",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				infrastructureLogging: {
					level: "verbose",
					colors: true
				},
				plugins: [new MyPlugin()]
			});
			compiler.outputFileSystem =
				/** @type {import("../").OutputFileSystem} */ (
					/** @type {unknown} */ (createFsFromVolume(new Volume()))
				);
			compiler.run((_err, _stats) => {
				expect(escapeAnsi(capture.toStringRaw()).replace(/[\d.]+ ms/, "X ms"))
					.toMatchInlineSnapshot(`
"<-> <CLR=36,BOLD>[MyPlugin] Group</CLR>
  <e> <CLR=31,BOLD>[MyPlugin] Error</CLR>
  <w> <CLR=33,BOLD>[MyPlugin] Warning</CLR>
  <i> <CLR=32,BOLD>[MyPlugin] Info</CLR>
      <CLR=BOLD>[MyPlugin] Log<CLR=22>
  <-> <CLR=36,BOLD>[MyPlugin] Collapsed group</CLR>
        <CLR=BOLD>[MyPlugin] Log inside collapsed group<CLR=22>
<t> <CLR=35,BOLD>[MyPlugin] Time: X ms</CLR>
"
`);
				done();
			});
		});

		it("should log to the console with colors (debug mode)", (done) => {
			const webpack = require("..");

			compiler = webpack({
				context: path.join(__dirname, "fixtures"),
				entry: "./a",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				infrastructureLogging: {
					level: "error",
					debug: /MyPlugin/,
					colors: true
				},
				plugins: [new MyPlugin()]
			});
			compiler.outputFileSystem =
				/** @type {import("../").OutputFileSystem} */ (
					/** @type {unknown} */ (createFsFromVolume(new Volume()))
				);
			compiler.run((_err, _stats) => {
				expect(escapeAnsi(capture.toStringRaw()).replace(/[\d.]+ ms/, "X ms"))
					.toMatchInlineSnapshot(`
"<-> <CLR=36,BOLD>[MyPlugin] Group</CLR>
  <e> <CLR=31,BOLD>[MyPlugin] Error</CLR>
  <w> <CLR=33,BOLD>[MyPlugin] Warning</CLR>
  <i> <CLR=32,BOLD>[MyPlugin] Info</CLR>
      <CLR=BOLD>[MyPlugin] Log<CLR=22>
      [MyPlugin] Debug
  <-> <CLR=36,BOLD>[MyPlugin] Collapsed group</CLR>
        <CLR=BOLD>[MyPlugin] Log inside collapsed group<CLR=22>
<t> <CLR=35,BOLD>[MyPlugin] Time: X ms</CLR>
"
`);
				done();
			});
		});
	});
});
